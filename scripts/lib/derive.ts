import type { RelationshipType } from '../../src/schema/constants.ts';
import { UNION_NODE_PREFIX } from '../../src/schema/constants.ts';
import type { GraphData, GraphEdge, GraphNode, PartnerLink } from '../../src/types/runtime.ts';
import type { Dataset } from './dataset.ts';
import { canonicalParentage, pairKey, variantParentages } from './dataset.ts';

/**
 * Leitet aus dem Autorenmodell den Graphen ab, den Layout und Anzeige verwenden.
 *
 * Zwei Entscheidungen praegen das Ergebnis:
 *
 * 1. Verbindungsknoten werden abgeleitet, nicht von Hand gepflegt. Alle Kinder
 *    desselben Elternpaares haengen an einem gemeinsamen kleinen Knoten - so
 *    stehen Geschwister in einer Reihe, statt dass jedes Kind eigene Linien zu
 *    beiden Eltern zieht.
 * 2. Nur die Leitversion erzeugt Verbindungsknoten. Abweichende Ueberlieferungen
 *    werden als gestrichelte Linie unmittelbar von Elternteil zu Kind gezogen.
 *    Damit koennen sie das Layout nicht beeinflussen, und der Varianten-Schalter
 *    verschiebt nichts.
 */

/** Kennung eines Verbindungsknotens; Eltern sortiert, damit sie stabil bleibt. */
export function unionNodeId(parents: readonly string[]): string {
  return `${UNION_NODE_PREFIX}${[...parents].sort((a, b) => a.localeCompare(b, 'en')).join('+')}`;
}

interface UnionDraft {
  readonly parents: readonly string[];
  readonly children: string[];
  tier: number;
}

export function buildGraph(dataset: Dataset): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const unions = new Map<string, UnionDraft>();

  const sortedIds = [...dataset.byId.keys()].sort((a, b) => a.localeCompare(b, 'en'));

  for (const id of sortedIds) {
    const figure = dataset.byId.get(id)!;

    nodes.push({
      id,
      kind: 'figure',
      tier: figure.tier,
      category: figure.category,
      confidence: figure.confidence,
      ...(figure.greek === undefined ? {} : { greek: figure.greek.name }),
      ...(figure.roman === undefined ? {} : { roman: figure.roman.name }),
    });

    const canonical = canonicalParentage(figure);
    if (canonical !== undefined && canonical.parents.length > 0) {
      const unionId = unionNodeId(canonical.parents);
      const parentTier = Math.max(
        ...canonical.parents.map((parent) => dataset.byId.get(parent)?.tier ?? 0),
      );

      const existing = unions.get(unionId);
      if (existing === undefined) {
        unions.set(unionId, { parents: canonical.parents, children: [id], tier: parentTier });
      } else {
        existing.children.push(id);
        existing.tier = Math.max(existing.tier, parentTier);
      }
    }

    for (const variant of variantParentages(figure)) {
      for (const parent of variant.parents) {
        edges.push({
          id: `v:${parent}->${id}:${variant.id}`,
          source: parent,
          target: id,
          kind: 'variant',
          variantId: variant.id,
          ...(variant.sources[0] === undefined ? {} : { sourceKey: variant.sources[0].source }),
        });
      }
    }
  }

  for (const [unionId, draft] of [...unions].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
    nodes.push({ id: unionId, kind: 'union', tier: draft.tier, parents: draft.parents });

    for (const parent of draft.parents) {
      edges.push({ id: `p:${parent}->${unionId}`, source: parent, target: unionId, kind: 'canonical' });
    }
    for (const child of draft.children) {
      edges.push({ id: `c:${unionId}->${child}`, source: unionId, target: child, kind: 'canonical' });
    }
  }

  return { nodes, edges, partners: buildPartners(dataset, unions) };
}

/**
 * Fuehrt Verbindungen zusammen: was in relationships.yaml steht, und was sich
 * aus gemeinsamen Kindern ergibt.
 *
 * Ohne Eintrag bleibt die Art unbestimmt - dass zwei Figuren Kinder haben,
 * verraet noch nicht, ob sie verheiratet waren. Das Pruefskript weist auf
 * solche Luecken hin.
 */
function buildPartners(dataset: Dataset, unions: ReadonlyMap<string, UnionDraft>): PartnerLink[] {
  const byPair = new Map<string, { a: string; b: string; type: RelationshipType; children: number; sourceKey?: string }>();

  for (const draft of unions.values()) {
    if (draft.parents.length < 2) continue;
    for (let i = 0; i < draft.parents.length; i += 1) {
      for (let j = i + 1; j < draft.parents.length; j += 1) {
        const a = draft.parents[i]!;
        const b = draft.parents[j]!;
        const key = pairKey(a, b);
        const existing = byPair.get(key);
        if (existing === undefined) {
          byPair.set(key, { a, b, type: 'unknown', children: draft.children.length });
        } else {
          existing.children += draft.children.length;
        }
      }
    }
  }

  for (const relationship of dataset.relationships) {
    const [a, b] = relationship.between;
    const key = pairKey(a, b);
    const existing = byPair.get(key);
    const sourceKey = relationship.sources[0]?.source;

    if (existing === undefined) {
      byPair.set(key, {
        a,
        b,
        type: relationship.type,
        children: 0,
        ...(sourceKey === undefined ? {} : { sourceKey }),
      });
      continue;
    }

    existing.type = relationship.type;
    if (sourceKey !== undefined) existing.sourceKey = sourceKey;
  }

  return [...byPair.entries()]
    .sort((x, y) => x[0].localeCompare(y[0], 'en'))
    .map(([key, value]) => ({ id: `r:${key}`, ...value }));
}

/** Nur die Kanten der Leitversion - genau das, was das Layout schichten muss. */
export function canonicalEdges(graph: GraphData): GraphEdge[] {
  return graph.edges.filter((edge) => edge.kind === 'canonical');
}
