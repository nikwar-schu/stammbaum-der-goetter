import type { GraphData, GraphNode } from '../types/runtime.ts';

/**
 * Sicht auf den Graphen aus Sicht der Figuren.
 *
 * Die Verbindungsknoten sind fuer die Darstellung wichtig, beim Rechnen aber im
 * Weg: niemand fragt nach den Eltern eines Verbindungsknotens. Dieser Index
 * blendet sie aus und liefert unmittelbar Eltern und Kinder von Figur zu Figur.
 */

export interface GraphIndex {
  readonly nodeById: ReadonlyMap<string, GraphNode>;
  readonly figureIds: readonly string[];
  /** Eltern einer Figur, ueber den Verbindungsknoten hinweg aufgeloest. */
  parentsOf(figureId: string): readonly string[];
  childrenOf(figureId: string): readonly string[];
  /** Der Verbindungsknoten, an dem eine Figur haengt, falls vorhanden. */
  unionOf(figureId: string): string | undefined;
}

export function buildIndex(graph: GraphData): GraphIndex {
  const nodeById = new Map<string, GraphNode>();
  for (const node of graph.nodes) nodeById.set(node.id, node);

  const parents = new Map<string, string[]>();
  const children = new Map<string, string[]>();
  const unionByChild = new Map<string, string>();

  const figureIds = graph.nodes.filter((node) => node.kind === 'figure').map((node) => node.id);
  for (const id of figureIds) {
    parents.set(id, []);
    children.set(id, []);
  }

  for (const edge of graph.edges) {
    if (edge.kind !== 'canonical') continue;

    const target = nodeById.get(edge.target);
    if (target?.kind !== 'figure') continue;

    // Kante Verbindungsknoten -> Kind: die Eltern stehen am Verbindungsknoten.
    const union = nodeById.get(edge.source);
    if (union?.kind !== 'union') continue;

    unionByChild.set(target.id, union.id);
    for (const parent of union.parents ?? []) {
      parents.get(target.id)?.push(parent);
      children.get(parent)?.push(target.id);
    }
  }

  return {
    nodeById,
    figureIds,
    parentsOf: (figureId) => parents.get(figureId) ?? [],
    childrenOf: (figureId) => children.get(figureId) ?? [],
    unionOf: (figureId) => unionByChild.get(figureId),
  };
}

/** Alle Vorfahren bis zur angegebenen Generationstiefe; `Infinity` fuer alle. */
export function ancestorsOf(index: GraphIndex, start: string, depth: number): Set<string> {
  return walk(start, depth, (id) => index.parentsOf(id));
}

/** Alle Nachkommen bis zur angegebenen Generationstiefe; `Infinity` fuer alle. */
export function descendantsOf(index: GraphIndex, start: string, depth: number): Set<string> {
  return walk(start, depth, (id) => index.childrenOf(id));
}

function walk(
  start: string,
  depth: number,
  step: (id: string) => readonly string[],
): Set<string> {
  const found = new Set<string>();
  let frontier: string[] = [start];

  for (let generation = 0; generation < depth && frontier.length > 0; generation += 1) {
    const next: string[] = [];
    for (const current of frontier) {
      for (const neighbour of step(current)) {
        if (neighbour === start || found.has(neighbour)) continue;
        found.add(neighbour);
        next.push(neighbour);
      }
    }
    frontier = next;
  }

  return found;
}

/** Geschwister und Halbgeschwister: alle Kinder eines der Elternteile. */
export function siblingsOf(index: GraphIndex, figureId: string): Set<string> {
  const siblings = new Set<string>();
  for (const parent of index.parentsOf(figureId)) {
    for (const child of index.childrenOf(parent)) {
      if (child !== figureId) siblings.add(child);
    }
  }
  return siblings;
}

/**
 * Nur leibliche Geschwister: Kinder derselben Elternverbindung.
 *
 * Fuer den Bildausschnitt ist das der richtige Massstab. Ueber alle
 * Halbgeschwister zu gehen, laesst die Auswahl bei fruchtbaren Eltern
 * explodieren - Aphrodite bekaeme ueber Uranos die vierzehn Titanenkinder dazu,
 * die im Layout ueber Tausende Pixel verteilt liegen.
 */
export function fullSiblingsOf(index: GraphIndex, figureId: string): Set<string> {
  const union = index.unionOf(figureId);
  if (union === undefined) return new Set();

  const siblings = new Set<string>();
  for (const candidate of index.figureIds) {
    if (candidate !== figureId && index.unionOf(candidate) === union) siblings.add(candidate);
  }
  return siblings;
}

/**
 * Partner einer Figur: alle Mitelternteile ihrer Kinder.
 *
 * Abgeleitet statt gepflegt - wer gemeinsame Kinder hat, ist damit verbunden.
 * Kinderlose, aber bemerkenswerte Verbindungen stehen daneben im Feld `unions`
 * der Figur und werden von der Oberflaeche ergaenzt.
 */
export function partnersOf(index: GraphIndex, figureId: string): Set<string> {
  const partners = new Set<string>();
  for (const child of index.childrenOf(figureId)) {
    for (const parent of index.parentsOf(child)) {
      if (parent !== figureId) partners.add(parent);
    }
  }
  return partners;
}

/** Eine Linie, die eine oder mehrere ausgeblendete Zwischengenerationen ueberspringt. */
export interface BridgeEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  /** Die uebersprungenen Figuren, von der sichtbaren Figur abwaerts. */
  readonly via: readonly string[];
}

/**
 * Berechnet Bruecken ueber ausgeblendete Figuren.
 *
 * Wird beim Umschalten auf die roemische Sicht gebraucht: viele kleine
 * griechische Daimonen haben kein Gegenstueck und verschwinden. Ohne
 * Gegenmassnahme zerfiele der Stammbaum in Bruchstuecke, sobald eine solche
 * Figur zwischen zwei Figuren liegt, die es beidseits gibt. Die Bruecke
 * verbindet dann die naechsten sichtbaren Vorfahren unmittelbar mit dem Kind.
 */
export function computeBridges(index: GraphIndex, visible: ReadonlySet<string>): BridgeEdge[] {
  const bridges = new Map<string, BridgeEdge>();

  for (const child of visible) {
    for (const directParent of index.parentsOf(child)) {
      if (visible.has(directParent)) continue;

      const seen = new Set<string>([directParent]);
      const queue: { id: string; via: string[] }[] = [{ id: directParent, via: [directParent] }];

      while (queue.length > 0) {
        const current = queue.shift()!;

        for (const ancestor of index.parentsOf(current.id)) {
          if (visible.has(ancestor)) {
            const id = `bridge:${ancestor}->${child}`;
            if (!bridges.has(id)) {
              bridges.set(id, { id, source: ancestor, target: child, via: current.via });
            }
            continue;
          }
          if (seen.has(ancestor)) continue;
          seen.add(ancestor);
          queue.push({ id: ancestor, via: [...current.via, ancestor] });
        }
      }
    }
  }

  return [...bridges.values()];
}
