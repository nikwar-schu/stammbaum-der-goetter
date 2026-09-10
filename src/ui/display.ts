import type { Lang, Tradition } from '../schema/constants.ts';
import type { Aspect, Figure, LocalizedText } from '../schema/figure.ts';
import type { GraphNode } from '../types/runtime.ts';
import { nameOf } from '../graph/naming.ts';

export { existsIn, nameOf } from '../graph/naming.ts';

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

export function sortByName(
  ids: Iterable<string>,
  nodeById: ReadonlyMap<string, GraphNode>,
  tradition: Tradition,
  lang: Lang,
): string[] {
  return [...ids].sort((a, b) =>
    nameOf(nodeById.get(a), tradition, lang).localeCompare(
      nameOf(nodeById.get(b), tradition, lang),
      lang,
    ),
  );
}
