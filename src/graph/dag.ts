/**
 * Allgemeine Graphfunktionen ohne Bezug zur Mythologie.
 *
 * Bewusst frei von Datenmodell und Darstellung: so lassen sie sich einzeln
 * testen, und Pruefskript, Layoutberechnung und Anwendung teilen sich dieselbe
 * Umsetzung, statt sie dreimal leicht verschieden zu wiederholen.
 */

export type AdjacencyMap = ReadonlyMap<string, readonly string[]>;

type VisitState = 'unvisited' | 'active' | 'done';

/** Alle Knoten des Graphen, auch solche, die nur als Ziel einer Kante vorkommen. */
export function collectNodes(adjacency: AdjacencyMap): string[] {
  const nodes = new Set<string>();
  for (const [from, targets] of adjacency) {
    nodes.add(from);
    for (const target of targets) nodes.add(target);
  }
  return [...nodes];
}

/**
 * Sucht einen gerichteten Zyklus.
 *
 * Liefert den Pfad einschliesslich des wiederholten Knotens am Ende
 * (z. B. `['a', 'b', 'a']`) oder `null`, wenn der Graph zyklenfrei ist.
 * Iterativ umgesetzt, damit tiefe Abstammungsketten keinen Stapelueberlauf
 * ausloesen.
 */
export function findCycle(adjacency: AdjacencyMap): string[] | null {
  const state = new Map<string, VisitState>();
  const nodes = collectNodes(adjacency);
  for (const node of nodes) state.set(node, 'unvisited');

  for (const root of nodes) {
    if (state.get(root) !== 'unvisited') continue;

    const path: string[] = [root];
    const stack: { node: string; nextIndex: number }[] = [{ node: root, nextIndex: 0 }];
    state.set(root, 'active');

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const targets = adjacency.get(frame.node) ?? [];

      if (frame.nextIndex >= targets.length) {
        state.set(frame.node, 'done');
        stack.pop();
        path.pop();
        continue;
      }

      const next = targets[frame.nextIndex]!;
      frame.nextIndex += 1;

      const nextState = state.get(next) ?? 'unvisited';
      if (nextState === 'active') {
        return [...path.slice(path.indexOf(next)), next];
      }
      if (nextState === 'unvisited') {
        state.set(next, 'active');
        path.push(next);
        stack.push({ node: next, nextIndex: 0 });
      }
    }
  }

  return null;
}

/** Alle von `start` aus erreichbaren Knoten, ohne `start` selbst. */
export function collectReachable(adjacency: AdjacencyMap, start: string): Set<string> {
  const reached = new Set<string>();
  const queue: string[] = [start];

  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const next of adjacency.get(current) ?? []) {
      if (reached.has(next)) continue;
      reached.add(next);
      queue.push(next);
    }
  }

  reached.delete(start);
  return reached;
}

/** Kehrt die Richtung aller Kanten um; aus Eltern-Kind wird Kind-Eltern. */
export function invert(adjacency: AdjacencyMap): AdjacencyMap {
  const inverted = new Map<string, string[]>();
  for (const node of collectNodes(adjacency)) inverted.set(node, []);

  for (const [from, targets] of adjacency) {
    for (const target of targets) {
      inverted.get(target)!.push(from);
    }
  }
  return inverted;
}
