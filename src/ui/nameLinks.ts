import type { GraphNode, SearchDoc } from '../types/runtime.ts';

/**
 * Erkennt Goetternamen im Fliesstext und macht sie anklickbar.
 *
 * Bewusst zur Laufzeit und nicht als Auszeichnung in den Daten: sonst muesste
 * jeder Text von Hand mit Verweisen versehen werden, und jede neue Figur
 * verlangte, alle bestehenden Texte noch einmal durchzugehen. So verlinkt sich
 * ein Eintrag von selbst, sobald die genannte Gottheit im Bestand ist.
 */

export interface TextSegment {
  readonly text: string;
  /** Gesetzt, wenn dieser Abschnitt auf eine Figur verweist. */
  readonly figureId?: string;
}

export interface NameIndex {
  readonly byName: ReadonlyMap<string, string>;
  /** Fehlt, wenn keine verwendbaren Namen vorliegen. */
  readonly pattern: RegExp | undefined;
}

/** Kuerzere Namen wie "Ge" traefen zu oft auf Wortteile. */
const MIN_NAME_LENGTH = 3;

const LATIN_NAME = /^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß -]*$/;
const LETTER = '[A-Za-zÄÖÜäöüß]';

/**
 * Namen, die zu haeufig als gewoehnliches Wort auftreten.
 *
 * "Dies" ist die roemische Entsprechung der Hemera - und zugleich der Anfang
 * unzaehliger deutscher Saetze. Ein Verweis darauf waere in neun von zehn
 * Faellen falsch.
 */
const NOT_LINKED = new Set(['Dies']);

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Baut die Namenstabelle aus dem Graphen und dem Suchindex.
 *
 * Mehrdeutige Namen werden verworfen: lieber kein Verweis als ein falscher.
 */
export function buildNameIndex(
  nodes: readonly GraphNode[],
  docs: readonly SearchDoc[],
): NameIndex {
  const claims = new Map<string, string | null>();

  const claim = (name: string, id: string): void => {
    const trimmed = name.trim();
    if (trimmed.length < MIN_NAME_LENGTH) return;
    if (!LATIN_NAME.test(trimmed)) return;
    if (NOT_LINKED.has(trimmed)) return;

    const existing = claims.get(trimmed);
    if (existing === undefined) claims.set(trimmed, id);
    else if (existing !== id) claims.set(trimmed, null);
  };

  for (const node of nodes) {
    if (node.kind !== 'figure') continue;
    if (node.greek !== undefined) claim(node.greek, node.id);
    if (node.roman !== undefined) claim(node.roman, node.id);
  }

  for (const doc of docs) {
    for (const name of doc.names) claim(name, doc.id);
  }

  const byName = new Map<string, string>();
  for (const [name, id] of claims) {
    if (id !== null) byName.set(name, id);
  }

  if (byName.size === 0) return { byName, pattern: undefined };

  // Laengste zuerst, damit "Pallas Athene" vor "Pallas" greift.
  const alternation = [...byName.keys()]
    .sort((a, b) => b.length - a.length || a.localeCompare(b, 'de'))
    .map(escapeForRegExp)
    .join('|');

  // Erlaubt die deutsche und englische Genitivform: Heras, Zeus', Hera's.
  const pattern = new RegExp(`\\b(?:${alternation})(?:['’]s|s|['’])?(?!${LETTER})`, 'g');

  return { byName, pattern };
}

/**
 * Zerlegt einen Text in Abschnitte; erkannte Namen tragen die Kennung ihrer Figur.
 *
 * `selfId` bleibt unverlinkt - ein Verweis auf die gerade geoeffnete Gottheit
 * fuehrt nirgendwohin.
 */
export function linkNames(
  text: string,
  index: NameIndex,
  selfId?: string,
): TextSegment[] {
  if (index.pattern === undefined) return [{ text }];

  const segments: TextSegment[] = [];
  const pattern = new RegExp(index.pattern.source, index.pattern.flags);
  let cursor = 0;

  for (const match of text.matchAll(pattern)) {
    const start = match.index;
    const matched = match[0];

    // Die Genitivendung gehoert nicht zum Namen; sie wird mit angezeigt,
    // muss aber beim Nachschlagen weg.
    const bare = matched.replace(/['’]s$|s$|['’]$/, '');
    const figureId = index.byName.get(bare) ?? index.byName.get(matched);

    if (figureId === undefined || figureId === selfId) continue;

    if (start > cursor) segments.push({ text: text.slice(cursor, start) });
    segments.push({ text: matched, figureId });
    cursor = start + matched.length;
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments.length === 0 ? [{ text }] : segments;
}
