import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import ELK from 'elkjs/lib/elk.bundled.js';
import type { ElkNode } from 'elkjs/lib/elk-api.js';
import { NODE_HEIGHT, NODE_WIDTH } from '../src/schema/constants.ts';
import type { GraphData, LayoutData, LayoutPosition } from '../src/types/runtime.ts';
import { loadDataset } from './lib/dataset.ts';
import { buildGraph } from './lib/derive.ts';
import { PUBLIC_DATA_DIR, relativeToProject } from './lib/paths.ts';

/**
 * Berechnet die festen Koordinaten des Stammbaums - einmal beim Bauen, nie im Browser.
 *
 * Das ist die Voraussetzung fuer die zentrale Zusage der Anwendung: beim
 * Umschalten zwischen griechischer und roemischer Sicht darf sich nichts
 * verschieben. Sind die Koordinaten ein festes Artefakt, kann keine
 * Filtereinstellung sie veraendern - Schalter regeln nur noch Sichtbarkeit.
 *
 * Gelayoutet wird ausschliesslich die Leitversion der Abstammung. Die
 * abweichenden Ueberlieferungen kommen spaeter als gestrichelte Linien auf
 * dieselben Koordinaten und koennen die Schichtung damit nicht stoeren.
 */

const UNION_NODE_SIZE = 14;

/**
 * Rein rechnerischer Wurzelknoten, der nie gezeichnet wird.
 *
 * Ohne ihn zerfaellt der Graph in mehrere Teile: Chaos, Gaia, Tartaros und der
 * orphische Chronos entstehen bei Hesiod ohne Erzeuger und haengen daher an
 * nichts. ELK schiebt solche Teile beliebig weit auseinander - Chaos landete
 * 5000 Pixel rechts von Gaia. Der Wurzelknoten haelt die Anfaenge zusammen,
 * ohne im Datenbestand eine Abstammung zu behaupten, die es nicht gibt.
 */
const VIRTUAL_ROOT = '__root';

/**
 * Generationsebene wird zur ELK-Partition: Figuren auf 2t, Verbindungsknoten auf
 * 2t+1. Erst dadurch stehen Geschwister tatsaechlich in einer Reihe, statt dass
 * der Layouter die Schichtung aus den Kanten allein erraten muss.
 * Der Versatz haelt Partition 0 fuer den Wurzelknoten frei.
 */
const PARTITION_STRIDE = 2;
const PARTITION_OFFSET = 2;

const LAYOUT_OPTIONS: Record<string, string> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.partitioning.activate': 'true',
  'elk.layered.cycleBreaking.strategy': 'DEPTH_FIRST',
  // Netzwerk-Simplex minimiert die Kantenlaengen und zieht dadurch die
  // Anfaenge zusammen: mit dem sonst ueblichen Brandes-Koepf lag Chaos 2863
  // Pixel von Gaia entfernt, hiermit sind es 456. Empirisch verglichen, nicht geraten.
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  // Sortierte Eingabe plus Beruecksichtigung der Reihenfolge macht das Ergebnis
  // wiederholbar - sonst wuerde dasselbe Datenmaterial zwei verschiedene Bilder liefern.
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'elk.layered.thoroughness': '30',
  'elk.spacing.nodeNode': '40',
  'elk.layered.spacing.nodeNodeBetweenLayers': '90',
  // Muss aus bleiben: mehrere Urgottheiten entstehen bei Hesiod ohne Erzeuger und
  // bilden damit eigene Teilgraphen. Werden die getrennt gelayoutet, packt ELK sie
  // nebeneinander und die Generationsebenen laufen quer durcheinander - Gaia landete
  // so unter ihren eigenen Enkeln.
  'elk.separateConnectedComponents': 'false',
};

interface LayoutVariant {
  readonly file: string;
  /** Sachgruppen, die in diesem Layout nicht enthalten sind. */
  readonly excludeCategories: readonly string[];
  readonly label: string;
}

const VARIANTS: readonly LayoutVariant[] = [
  { file: 'layout.gods.json', excludeCategories: ['hero'], label: 'ohne Helden' },
  { file: 'layout.all.json', excludeCategories: [], label: 'mit Helden' },
];

/**
 * Entfernt die ausgeschlossenen Figuren und alle Knoten und Kanten, die dadurch
 * ins Leere zeigen wuerden - insbesondere Verbindungsknoten, deren Kinder
 * saemtlich weggefallen sind.
 */
function restrict(graph: GraphData, excludeCategories: readonly string[]): GraphData {
  if (excludeCategories.length === 0) return graph;

  const excluded = new Set(excludeCategories);
  const keptFigures = new Set(
    graph.nodes
      .filter((node) => node.kind === 'figure' && !excluded.has(node.category ?? ''))
      .map((node) => node.id),
  );

  const unionHasChild = new Set(
    graph.edges
      .filter((edge) => edge.kind === 'canonical' && keptFigures.has(edge.target))
      .map((edge) => edge.source),
  );

  const kept = new Set([...keptFigures, ...unionHasChild]);
  return {
    nodes: graph.nodes.filter((node) => kept.has(node.id)),
    edges: graph.edges.filter((edge) => kept.has(edge.source) && kept.has(edge.target)),
  };
}

function toElkGraph(graph: GraphData): ElkNode {
  const known = new Set(graph.nodes.map((node) => node.id));
  const canonical = graph.edges.filter(
    (edge) => edge.kind === 'canonical' && known.has(edge.source) && known.has(edge.target),
  );

  const hasParent = new Set(canonical.map((edge) => edge.target));
  const rootless = graph.nodes.filter((node) => node.kind === 'figure' && !hasParent.has(node.id));

  const children = graph.nodes.map((node) => {
    const isUnion = node.kind === 'union';
    const partition = node.tier * PARTITION_STRIDE + PARTITION_OFFSET + (isUnion ? 1 : 0);

    return {
      id: node.id,
      width: isUnion ? UNION_NODE_SIZE : NODE_WIDTH,
      height: isUnion ? UNION_NODE_SIZE : NODE_HEIGHT,
      layoutOptions: { 'elk.partitioning.partition': String(partition) },
    };
  });

  children.push({
    id: VIRTUAL_ROOT,
    width: 1,
    height: 1,
    layoutOptions: { 'elk.partitioning.partition': '0' },
  });

  return {
    id: 'root',
    layoutOptions: LAYOUT_OPTIONS,
    children,
    edges: [
      ...canonical.map((edge) => ({ id: edge.id, sources: [edge.source], targets: [edge.target] })),
      ...rootless.map((node) => ({
        id: `root:${node.id}`,
        sources: [VIRTUAL_ROOT],
        targets: [node.id],
      })),
    ],
  };
}

/** ELK liefert die linke obere Ecke; Cytoscape erwartet den Mittelpunkt. */
function toPositions(result: ElkNode): Record<string, LayoutPosition> {
  const positions: Record<string, LayoutPosition> = {};

  for (const child of result.children ?? []) {
    if (child.id === VIRTUAL_ROOT) continue;
    const width = child.width ?? NODE_WIDTH;
    const height = child.height ?? NODE_HEIGHT;
    positions[child.id] = {
      x: Math.round((child.x ?? 0) + width / 2),
      y: Math.round((child.y ?? 0) + height / 2),
    };
  }

  return positions;
}

async function main(): Promise<void> {
  await mkdir(PUBLIC_DATA_DIR, { recursive: true });

  const dataset = await loadDataset();
  const graph = buildGraph(dataset);
  const elk = new ELK();

  for (const variant of VARIANTS) {
    const restricted = restrict(graph, variant.excludeCategories);
    const started = Date.now();
    const result = await elk.layout(toElkGraph(restricted));

    const layout: LayoutData = {
      positions: toPositions(result),
      width: Math.round(result.width ?? 0),
      height: Math.round(result.height ?? 0),
    };

    const target = path.join(PUBLIC_DATA_DIR, variant.file);
    await writeFile(target, `${JSON.stringify(layout)}\n`, 'utf8');

    const count = Object.keys(layout.positions).length;
    process.stdout.write(
      `geschrieben  ${relativeToProject(target)}  ` +
        `(${variant.label}, ${count} Knoten, ${layout.width}x${layout.height} px, ` +
        `${Date.now() - started} ms)\n`,
    );
  }
}

try {
  await main();
} catch (error) {
  process.stderr.write(`Layoutberechnung fehlgeschlagen: ${(error as Error).message}\n`);
  process.exitCode = 1;
}
