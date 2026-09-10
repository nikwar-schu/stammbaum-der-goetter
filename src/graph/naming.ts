import type { Lang, Tradition } from '../schema/constants.ts';
import type { GraphNode } from '../types/runtime.ts';

/**
 * Welcher Name einer Figur in welcher Sicht und Sprache gilt.
 *
 * Liegt auf der Graph-Ebene und nicht in der Oberflaeche, weil auch die
 * Zeichenflaeche die Beschriftung braucht - und die Oberflaeche nicht von
 * der Zeichenflaeche abhaengen soll oder umgekehrt.
 */

/**
 * Der anzuzeigende Name. Fehlt das Gegenstueck, wird der Name der anderen Sicht
 * verwendet - besser als ein leerer Kasten.
 */
export function nameOf(
  node: GraphNode | undefined,
  tradition: Tradition,
  lang: Lang,
): string {
  if (node === undefined) return '';
  const preferred = tradition === 'greek' ? node.greek : node.roman;
  const fallback = tradition === 'greek' ? node.roman : node.greek;
  return (preferred ?? fallback)?.[lang] ?? node.id;
}

/** Ob es die Figur in der gewaehlten Sicht ueberhaupt gibt. */
export function existsIn(node: GraphNode, tradition: Tradition): boolean {
  return (tradition === 'greek' ? node.greek : node.roman) !== undefined;
}
