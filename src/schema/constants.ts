/**
 * Kontrollierte Wertebereiche des Datenmodells.
 *
 * Alles, was an mehr als einer Stelle als fester Wert auftaucht, steht hier.
 * Schema, Pruefskript, Layoutberechnung und Oberflaeche leiten davon ab, damit
 * eine Erweiterung nur an einer Stelle vorgenommen werden muss.
 */

export const LANGUAGES = ['de', 'en'] as const;
export type Lang = (typeof LANGUAGES)[number];

export const TRADITIONS = ['greek', 'roman'] as const;
export type Tradition = (typeof TRADITIONS)[number];

/** Sachgruppen; bestimmen Farbe, Filterleiste und Aufteilung der Datendateien. */
export const CATEGORIES = [
  'protogenos',
  'titan',
  'olympian',
  'chthonic',
  'sea',
  'sky',
  'nymph',
  'daimon',
  'personification',
  'rustic',
  'roman-native',
  'hero',
  'monster',
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Wie gut eine Angabe antik belegt ist. Wichtig bei den Nischengottheiten. */
export const CONFIDENCE_LEVELS = ['attested', 'common', 'obscure', 'disputed'] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

/** Art der Zeugung. Die antike Ueberlieferung kennt weit mehr als den Normalfall. */
export const PARENTAGE_MODES = [
  'sexual',
  'parthenogenetic',
  'from-body-part',
  'from-blood',
  'from-earth',
  'emerged',
  'unknown',
] as const;
export type ParentageMode = (typeof PARENTAGE_MODES)[number];

/** Belastbarkeit einer griechisch-roemischen Gleichsetzung. */
export const COUNTERPART_RELATIONS = [
  'equated',
  'partial',
  'absorbed',
  'conflated',
  'disputed',
] as const;
export type CounterpartRelation = (typeof COUNTERPART_RELATIONS)[number];

export const UNION_TYPES = ['marriage', 'liaison', 'abduction', 'consort', 'unknown'] as const;
export type UnionType = (typeof UNION_TYPES)[number];

export const FIGURE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const VARIANT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const DOMAIN_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const WIKIDATA_ID_PATTERN = /^Q[1-9][0-9]*$/;
export const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/;

/** Mehr als drei Elternteile hat keine antike Ueberlieferung; darueber liegt ein Fehler vor. */
export const MAX_PARENTS = 3;

/**
 * Feste Kastengroesse in Layout und Anzeige. Haenge die Breite niemals von der
 * Namenslaenge ab: sonst aendern die Kaesten beim Wechsel von "Zeus" auf
 * "Iuppiter" ihre Groesse, und das liest sich wie ein Verrutschen des Baums.
 */
export const NODE_WIDTH = 128;
export const NODE_HEIGHT = 40;

/** Abgeleitete Verbindungsknoten tragen dieses Praefix in ihrer Kennung. */
export const UNION_NODE_PREFIX = 'u:';
