import type { Lang, Tradition } from '../schema/constants.ts';
import type { Aspect, Figure, LocalizedText } from '../schema/figure.ts';
import type { GraphNode } from '../types/runtime.ts';

/** Kleine Helfer, die in mehreren Bausteinen der Oberflaeche gebraucht werden. */

export function textOf(value: LocalizedText | undefined, lang: Lang): string | undefined {
  return value?.[lang];
}

export function aspectOf(figure: Figure, tradition: Tradition): Aspect | undefined {
  return tradition === 'greek' ? figure.greek : figure.roman;
}

export function otherAspectOf(figure: Figure, tradition: Tradition): Aspect | undefined {
  return tradition === 'greek' ? figure.roman : figure.greek;
}

/**
 * Der anzuzeigende Name. Fehlt das Gegenstueck, wird der vorhandene Name
 * verwendet - besser eine fremdsprachige Beschriftung als ein leerer Kasten.
 */
export function nameOf(node: GraphNode | undefined, tradition: Tradition): string {
  if (node === undefined) return '';
  const preferred = tradition === 'greek' ? node.greek : node.roman;
  const fallback = tradition === 'greek' ? node.roman : node.greek;
  return preferred ?? fallback ?? node.id;
}

/** Ob es die Figur in der gewaehlten Sicht ueberhaupt gibt. */
export function existsIn(node: GraphNode, tradition: Tradition): boolean {
  return (tradition === 'greek' ? node.greek : node.roman) !== undefined;
}

export function sortByName(
  ids: Iterable<string>,
  nodeById: ReadonlyMap<string, GraphNode>,
  tradition: Tradition,
): string[] {
  return [...ids].sort((a, b) =>
    nameOf(nodeById.get(a), tradition).localeCompare(nameOf(nodeById.get(b), tradition), 'de'),
  );
}
