import type { Lang } from '../schema/constants.ts';
import type {
  Confidence,
  CounterpartRelation,
  ParentageMode,
  RelationshipType,
} from '../schema/constants.ts';

/**
 * Oberflaechentexte in beiden Sprachen.
 *
 * Bewusst als eine flache, vollstaendig getippte Tabelle statt als
 * Uebersetzungsbibliothek: bei dieser Menge waere eine Bibliothek mehr Aufwand
 * als Nutzen, und der Typ stellt sicher, dass keine Sprache eine Luecke hat.
 */

export interface Texts {
  appTitle: string;
  appSubtitle: string;

  searchPlaceholder: string;
  searchNoResults: string;
  searchHint: string;

  traditionLabel: string;
  traditionGreek: string;
  traditionRoman: string;

  languageLabel: string;

  variantsLabel: string;
  variantsHint: string;

  viewLabel: string;
  viewFocus: string;
  viewOverview: string;
  fitToScreen: string;
  depthLabel: string;
  depthIncrease: string;
  depthDecrease: string;
  generations: (count: number) => string;
  allGenerations: string;

  categoriesLabel: string;
  selectAll: string;
  selectNone: string;

  panelOverview: string;
  panelFamily: string;
  panelSources: string;
  panelClose: string;

  domainsLabel: string;
  symbolsLabel: string;
  epithetsLabel: string;
  cultLabel: string;
  festivalsLabel: string;
  altNamesLabel: string;

  parentsLabel: string;
  childrenLabel: string;
  partnersLabel: string;
  marriedToLabel: string;
  affairsLabel: string;
  otherUnionsLabel: string;
  childrenTogether: (count: number) => string;
  counterpartsLabel: string;
  siblingsLabel: string;
  noRelations: string;

  onlyGreek: string;
  onlyRoman: string;
  hiddenNotice: (count: number) => string;
  bridgeNotice: string;
  bridgedVia: (names: string) => string;

  leadingVersion: string;
  variantVersion: string;
  confidenceLabel: string;
  externalLinks: string;

  legendLabel: string;
  loading: string;
  loadingFailed: string;
  retry: string;

  outlineTitle: string;
  outlineIntro: string;
  outlineRepeated: string;
  backToGraph: string;

  confidence: Record<Confidence, string>;
  parentageMode: Record<ParentageMode, string>;
  counterpartRelation: Record<CounterpartRelation, string>;
  relationshipType: Record<RelationshipType, string>;
}

const de: Texts = {
  appTitle: 'Stammbaum der Götter',
  appSubtitle: 'Griechische und römische Gottheiten von Chaos bis zu den kleinsten Nischengottheiten',

  searchPlaceholder: 'Suchen: Name, Beiname, Zuständigkeit …',
  searchNoResults: 'Nichts gefunden',
  searchHint: 'Strg + K',

  traditionLabel: 'Sicht',
  traditionGreek: 'Griechisch',
  traditionRoman: 'Römisch',

  languageLabel: 'Sprache',

  variantsLabel: 'Varianten',
  variantsHint: 'Abweichende Überlieferungen als gestrichelte Linien einblenden',

  viewLabel: 'Ansicht',
  viewFocus: 'Fokus',
  viewOverview: 'Gesamt',
  fitToScreen: 'Einpassen',
  depthLabel: 'Tiefe',
  depthIncrease: 'Eine Generation mehr',
  depthDecrease: 'Eine Generation weniger',
  generations: (count) => (count === 1 ? '1 Generation' : `${count} Generationen`),
  allGenerations: 'alle Generationen',

  categoriesLabel: 'Sachgruppen',
  selectAll: 'alle',
  selectNone: 'keine',

  panelOverview: 'Überblick',
  panelFamily: 'Verwandtschaft',
  panelSources: 'Quellen',
  panelClose: 'Schließen',

  domainsLabel: 'Zuständigkeiten',
  symbolsLabel: 'Attribute',
  epithetsLabel: 'Beinamen',
  cultLabel: 'Kult',
  festivalsLabel: 'Feste',
  altNamesLabel: 'Weitere Namen',

  parentsLabel: 'Eltern',
  childrenLabel: 'Kinder',
  partnersLabel: 'Verbindungen',
  marriedToLabel: 'Verheiratet mit',
  affairsLabel: 'Liebschaften',
  otherUnionsLabel: 'Weitere Verbindungen',
  childrenTogether: (count) => (count === 1 ? '1 gemeinsames Kind' : `${count} gemeinsame Kinder`),
  counterpartsLabel: 'Verwandte Gestalten',
  siblingsLabel: 'Geschwister',
  noRelations: 'Keine Verbindungen verzeichnet.',

  onlyGreek: 'nur griechisch',
  onlyRoman: 'nur römisch',
  hiddenNotice: (count) =>
    count === 1
      ? '1 Figur ohne Gegenstück ausgeblendet'
      : `${count} Figuren ohne Gegenstück ausgeblendet`,
  bridgeNotice: 'Gestrichelte Linien überbrücken ausgeblendete Zwischengenerationen.',
  bridgedVia: (names) => `Abstammung läuft über ${names}`,

  leadingVersion: 'Leitversion',
  variantVersion: 'Abweichende Überlieferung',
  confidenceLabel: 'Belegtheit',
  externalLinks: 'Weiterlesen',

  legendLabel: 'Legende',
  loading: 'Stammbaum wird geladen …',
  loadingFailed: 'Die Daten konnten nicht geladen werden.',
  retry: 'Erneut versuchen',

  outlineTitle: 'Textansicht des Stammbaums',
  outlineIntro:
    'Der Stammbaum der Leitversion als verschachtelte Liste - lesbar ohne Grafik, für Vorleseprogramme und Suchmaschinen.',
  outlineRepeated: 'bereits weiter oben aufgeführt',
  backToGraph: 'Zurück zum Stammbaum',

  confidence: {
    attested: 'gut belegt',
    common: 'verbreitet',
    obscure: 'selten belegt',
    disputed: 'umstritten',
  },
  parentageMode: {
    sexual: 'gezeugt',
    parthenogenetic: 'aus sich allein hervorgebracht',
    'from-body-part': 'aus einem Körperteil entstanden',
    'from-blood': 'aus dem Blut entstanden',
    'from-earth': 'aus der Erde entstanden',
    emerged: 'entstanden, ohne Erzeuger',
    unknown: 'Herkunft ungewiss',
  },
  counterpartRelation: {
    equated: 'gleichgesetzt',
    partial: 'teilweise entsprechend',
    absorbed: 'aufgegangen in',
    conflated: 'vermengt mit',
    disputed: 'umstritten',
  },
  relationshipType: {
    marriage: 'Ehe',
    consort: 'feste Verbindung',
    liaison: 'Liebschaft',
    abduction: 'Raub',
    unknown: 'Art nicht überliefert',
  },
};

const en: Texts = {
  appTitle: 'Family Tree of the Gods',
  appSubtitle: 'Greek and Roman deities from Chaos down to the most obscure minor gods',

  searchPlaceholder: 'Search: name, epithet, domain …',
  searchNoResults: 'Nothing found',
  searchHint: 'Ctrl + K',

  traditionLabel: 'View',
  traditionGreek: 'Greek',
  traditionRoman: 'Roman',

  languageLabel: 'Language',

  variantsLabel: 'Variants',
  variantsHint: 'Show divergent traditions as dashed lines',

  viewLabel: 'View',
  viewFocus: 'Focus',
  viewOverview: 'Overview',
  fitToScreen: 'Fit view',
  depthLabel: 'Depth',
  depthIncrease: 'One generation more',
  depthDecrease: 'One generation fewer',
  generations: (count) => (count === 1 ? '1 generation' : `${count} generations`),
  allGenerations: 'all generations',

  categoriesLabel: 'Categories',
  selectAll: 'all',
  selectNone: 'none',

  panelOverview: 'Overview',
  panelFamily: 'Family',
  panelSources: 'Sources',
  panelClose: 'Close',

  domainsLabel: 'Domains',
  symbolsLabel: 'Attributes',
  epithetsLabel: 'Epithets',
  cultLabel: 'Cult',
  festivalsLabel: 'Festivals',
  altNamesLabel: 'Other names',

  parentsLabel: 'Parents',
  childrenLabel: 'Children',
  partnersLabel: 'Unions',
  marriedToLabel: 'Married to',
  affairsLabel: 'Affairs',
  otherUnionsLabel: 'Further unions',
  childrenTogether: (count) => (count === 1 ? '1 child together' : `${count} children together`),
  counterpartsLabel: 'Related figures',
  siblingsLabel: 'Siblings',
  noRelations: 'No connections recorded.',

  onlyGreek: 'Greek only',
  onlyRoman: 'Roman only',
  hiddenNotice: (count) =>
    count === 1 ? '1 figure without counterpart hidden' : `${count} figures without counterpart hidden`,
  bridgeNotice: 'Dashed lines bridge hidden intermediate generations.',
  bridgedVia: (names) => `Descent runs through ${names}`,

  leadingVersion: 'Leading version',
  variantVersion: 'Divergent tradition',
  confidenceLabel: 'Attestation',
  externalLinks: 'Read on',

  legendLabel: 'Legend',
  loading: 'Loading the family tree …',
  loadingFailed: 'The data could not be loaded.',
  retry: 'Try again',

  outlineTitle: 'Text view of the family tree',
  outlineIntro:
    'The leading version of the family tree as a nested list - readable without graphics, for screen readers and search engines.',
  outlineRepeated: 'already listed above',
  backToGraph: 'Back to the tree',

  confidence: {
    attested: 'well attested',
    common: 'common',
    obscure: 'rarely attested',
    disputed: 'disputed',
  },
  parentageMode: {
    sexual: 'begotten',
    parthenogenetic: 'brought forth alone',
    'from-body-part': 'born from a body part',
    'from-blood': 'born from blood',
    'from-earth': 'sprung from the earth',
    emerged: 'came to be, without a begetter',
    unknown: 'origin uncertain',
  },
  counterpartRelation: {
    equated: 'equated with',
    partial: 'partly corresponding to',
    absorbed: 'absorbed into',
    conflated: 'conflated with',
    disputed: 'disputed',
  },
  relationshipType: {
    marriage: 'marriage',
    consort: 'lasting union',
    liaison: 'affair',
    abduction: 'abduction',
    unknown: 'kind not recorded',
  },
};

const TEXTS: Record<Lang, Texts> = { de, en };

export function texts(lang: Lang): Texts {
  return TEXTS[lang];
}
