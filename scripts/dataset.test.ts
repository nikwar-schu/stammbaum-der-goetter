import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { findCycle } from '../src/graph/dag.ts';
import { buildIndex } from '../src/graph/model.ts';
import type { GraphData, LayoutData } from '../src/types/runtime.ts';
import type { Dataset } from './lib/dataset.ts';
import { canonicalAdjacency, canonicalParentage, loadDataset } from './lib/dataset.ts';
import { buildGraph, unionNodeId } from './lib/derive.ts';
import { PUBLIC_DATA_DIR } from './lib/paths.ts';

/**
 * Prueft die Zusicherungen, auf denen Layout und Anzeige aufbauen, am echten
 * Datenbestand - nicht an einem Beispiel. Koordinaten werden bewusst nicht
 * festgeschrieben: sie aendern sich bei jeder neuen Figur, ohne dass etwas
 * kaputt waere.
 */

let dataset: Dataset;
let graph: GraphData;

beforeAll(async () => {
  dataset = await loadDataset();
  graph = buildGraph(dataset);
});

describe('Datenbestand', () => {
  it('vergibt keine Kennung doppelt', () => {
    expect(dataset.duplicateIds).toEqual([]);
  });

  it('enthält keinen Kreis in der Leitversion', () => {
    expect(findCycle(canonicalAdjacency(dataset))).toBeNull();
  });

  it('stellt jedes Kind unter beide Elternteile', () => {
    const violations: string[] = [];

    for (const [id, figure] of dataset.byId) {
      const canonical = canonicalParentage(figure);
      if (canonical === undefined) continue;

      for (const parentId of canonical.parents) {
        const parent = dataset.byId.get(parentId);
        if (parent !== undefined && figure.tier <= parent.tier) {
          violations.push(`${id} (${figure.tier}) unter ${parentId} (${parent.tier})`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('löst jeden Verweis auf', () => {
    const dangling: string[] = [];
    const exists = (id: string): boolean => dataset.byId.has(id);

    for (const [id, figure] of dataset.byId) {
      for (const variant of figure.parentage) {
        for (const parent of variant.parents) {
          if (!exists(parent)) dangling.push(`${id}.parentage -> ${parent}`);
        }
        for (const reference of variant.sources) {
          if (!(reference.source in dataset.sources)) {
            dangling.push(`${id}.sources -> ${reference.source}`);
          }
        }
      }
      for (const counterpart of figure.counterparts ?? []) {
        if (!exists(counterpart.figure)) dangling.push(`${id}.counterparts -> ${counterpart.figure}`);
      }
    }

    expect(dangling).toEqual([]);
  });

  it('gibt jeder Figur mindestens eine Sicht', () => {
    const empty = [...dataset.byId.values()]
      .filter((figure) => figure.greek === undefined && figure.roman === undefined)
      .map((figure) => figure.id);

    expect(empty).toEqual([]);
  });
});

describe('abgeleiteter Graph', () => {
  it('fasst Geschwister an einem gemeinsamen Verbindungsknoten zusammen', () => {
    const index = buildIndex(graph);
    const kronosChildren = new Set(index.childrenOf('kronos'));

    for (const child of ['hestia', 'demeter', 'hera', 'hades', 'poseidon', 'zeus']) {
      expect(kronosChildren).toContain(child);
      expect(index.unionOf(child)).toBe(unionNodeId(['kronos', 'rheia']));
    }
  });

  it('erzeugt für abweichende Überlieferungen keine Verbindungsknoten', () => {
    const variantEdges = graph.edges.filter((edge) => edge.kind === 'variant');
    const unionIds = new Set(graph.nodes.filter((node) => node.kind === 'union').map((node) => node.id));

    expect(variantEdges.length).toBeGreaterThan(0);
    for (const edge of variantEdges) {
      expect(unionIds.has(edge.source)).toBe(false);
      expect(unionIds.has(edge.target)).toBe(false);
    }
  });

  it('führt Aphrodite mit Leitversion und homerischer Variante', () => {
    const index = buildIndex(graph);
    expect(index.parentsOf('aphrodite')).toEqual(['uranos']);

    const homeric = graph.edges.filter(
      (edge) => edge.kind === 'variant' && edge.target === 'aphrodite',
    );
    expect(new Set(homeric.map((edge) => edge.source))).toEqual(new Set(['zeus', 'dione']));
  });

  it('verweist mit jeder Verbindung auf vorhandene Figuren', () => {
    const figures = new Set(
      graph.nodes.filter((node) => node.kind === 'figure').map((node) => node.id),
    );
    const dangling = graph.partners.filter(
      (partner) => !figures.has(partner.a) || !figures.has(partner.b),
    );

    expect(dangling).toEqual([]);
    expect(graph.partners.length).toBeGreaterThan(0);
  });

  it('kennt Aphrodites Ehe und ihre Liebschaft nebeneinander', () => {
    const byPartner = new Map(
      graph.partners
        .filter((partner) => partner.a === 'aphrodite' || partner.b === 'aphrodite')
        .map((partner) => [partner.a === 'aphrodite' ? partner.b : partner.a, partner.type]),
    );

    expect(byPartner.get('hephaistos')).toBe('marriage');
    expect(byPartner.get('ares')).toBe('liaison');
  });

  it('lässt keine Verbindung mit gemeinsamen Kindern ohne Art', () => {
    const offen = graph.partners
      .filter((partner) => partner.type === 'unknown' && partner.children > 0)
      .map((partner) => `${partner.a}+${partner.b}`);

    expect(offen).toEqual([]);
  });

  it('verweist mit jeder Kante auf vorhandene Knoten', () => {
    const ids = new Set(graph.nodes.map((node) => node.id));
    const dangling = graph.edges.filter((edge) => !ids.has(edge.source) || !ids.has(edge.target));

    expect(dangling).toEqual([]);
  });
});

describe('Layoutdateien', () => {
  const layoutFile = path.join(PUBLIC_DATA_DIR, 'layout.json');
  const available = existsSync(layoutFile);

  it.runIf(available)('kennt jeden Knoten des Graphen', async () => {
    const layout = JSON.parse(await readFile(layoutFile, 'utf8')) as LayoutData;
    const missing = graph.nodes
      .filter((node) => layout.positions[node.id] === undefined)
      .map((node) => node.id);

    expect(missing).toEqual([]);
  });

  it.runIf(available)('schichtet die Generationen streng von oben nach unten', async () => {
    const layout = JSON.parse(await readFile(layoutFile, 'utf8')) as LayoutData;
    const yByTier = new Map<number, number[]>();

    for (const node of graph.nodes) {
      if (node.kind !== 'figure') continue;
      const position = layout.positions[node.id];
      if (position === undefined) continue;
      const bucket = yByTier.get(node.tier) ?? [];
      bucket.push(position.y);
      yByTier.set(node.tier, bucket);
    }

    const tiers = [...yByTier.keys()].sort((a, b) => a - b);
    let previousMax = Number.NEGATIVE_INFINITY;

    for (const tier of tiers) {
      const values = yByTier.get(tier)!;
      expect(Math.min(...values)).toBeGreaterThan(previousMax);
      previousMax = Math.max(...values);
    }
  });
});
