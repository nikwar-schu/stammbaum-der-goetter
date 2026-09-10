import { z } from 'zod';
import {
  CATEGORIES,
  CONFIDENCE_LEVELS,
  COUNTERPART_RELATIONS,
  DOMAIN_KEY_PATTERN,
  FIGURE_ID_PATTERN,
  HEX_COLOR_PATTERN,
  MAX_PARENTS,
  PARENTAGE_MODES,
  RELATIONSHIP_TYPES,
  VARIANT_ID_PATTERN,
  WIKIDATA_ID_PATTERN,
} from './constants.ts';

/**
 * Autorenmodell: die Form, in der die YAML-Dateien unter `data/` geschrieben werden.
 *
 * Dieses Schema ist die einzige Quelle der Wahrheit. Aus ihm entstehen die
 * TypeScript-Typen, die Pruefungen in `scripts/validate.ts` und das JSON-Schema,
 * das dem Editor Autovervollstaendigung liefert.
 *
 * Alle Objekte sind `strict`: ein Tippfehler im Feldnamen ist ein Fehler und kein
 * stillschweigend ignoriertes Zusatzfeld.
 */

const nonEmpty = z.string().trim().min(1);

/** Zweisprachiger Text. Beide Sprachen sind Pflicht, damit keine Luecken entstehen. */
export const localizedTextSchema = z
  .object({
    de: nonEmpty,
    en: nonEmpty,
  })
  .strict();

/**
 * Zweisprachige Aufzaehlung, etwa fuer Attribute.
 *
 * Eigennamen wie "Saturnalia" oder "Palladium" bleiben unuebersetzt; Begriffe
 * wie "Blitzbuendel" muessen es sein, sonst steht in der englischen Fassung
 * deutscher Text.
 */
export const localizedListSchema = z
  .object({
    de: z.array(nonEmpty).min(1),
    en: z.array(nonEmpty).min(1),
  })
  .strict();

export const figureIdSchema = z
  .string()
  .regex(FIGURE_ID_PATTERN, 'Kennung nur aus Kleinbuchstaben, Ziffern und Bindestrichen');

/** Verweis auf eine antike Textstelle; `source` zeigt auf einen Schluessel in sources.yaml. */
export const sourceRefSchema = z
  .object({
    source: nonEmpty,
    loc: nonEmpty.optional(),
  })
  .strict();

export const epithetSchema = z
  .object({
    name: nonEmpty,
    nameOriginal: nonEmpty.optional(),
    meaning: localizedTextSchema.optional(),
    sources: z.array(sourceRefSchema).optional(),
  })
  .strict();

/**
 * Die griechische bzw. roemische Sicht auf dieselbe Figur.
 * Beide sind optional: Ianus hat nur eine roemische, Hekate nur eine griechische.
 */
export const aspectSchema = z
  .object({
    name: nonEmpty,
    nameOriginal: nonEmpty.optional(),
    altNames: z.array(nonEmpty).optional(),
    epithets: z.array(epithetSchema).optional(),
    domains: z.array(z.string().regex(DOMAIN_KEY_PATTERN)).min(1),
    symbols: localizedListSchema.optional(),
    description: localizedTextSchema,
    cultNotes: localizedTextSchema.optional(),
    festivals: z.array(nonEmpty).optional(),
    sources: z.array(sourceRefSchema).optional(),
  })
  .strict();

/**
 * Eine ueberlieferte Abstammung. Mehrere pro Figur sind der Normalfall.
 * Genau eine traegt `canonical: true` und bestimmt damit allein das Layout.
 */
export const parentageVariantSchema = z
  .object({
    id: z.string().regex(VARIANT_ID_PATTERN),
    parents: z.array(figureIdSchema).max(MAX_PARENTS),
    mode: z.enum(PARENTAGE_MODES),
    canonical: z.boolean(),
    sources: z.array(sourceRefSchema).min(1),
    note: localizedTextSchema.optional(),
    confidence: z.enum(CONFIDENCE_LEVELS),
  })
  .strict();

/** Kulturuebergreifender Bezug, der keine saubere Eins-zu-eins-Gleichung ist. */
export const counterpartSchema = z
  .object({
    figure: figureIdSchema,
    relation: z.enum(COUNTERPART_RELATIONS),
    note: localizedTextSchema.optional(),
    sources: z.array(sourceRefSchema).optional(),
  })
  .strict();

/**
 * Eine Verbindung zwischen zwei Figuren - Ehe, Liebschaft oder loses Verhaeltnis.
 *
 * Beziehungen sind wechselseitig und stehen deshalb in einer eigenen Datei,
 * nicht bei einer der beiden Figuren. Welche Reihenfolge `between` hat, spielt
 * keine Rolle; jedes Paar darf nur einmal vorkommen.
 */
export const relationshipSchema = z
  .object({
    between: z.tuple([figureIdSchema, figureIdSchema]),
    type: z.enum(RELATIONSHIP_TYPES),
    sources: z.array(sourceRefSchema).min(1),
    note: localizedTextSchema.optional(),
  })
  .strict();

export const relationshipsFileSchema = z
  .object({
    relationships: z.array(relationshipSchema).min(1),
  })
  .strict();

export const mythSchema = z
  .object({
    title: localizedTextSchema,
    summary: localizedTextSchema,
    sources: z.array(sourceRefSchema).min(1),
  })
  .strict();

export const refsSchema = z
  .object({
    wikidata: z.string().regex(WIKIDATA_ID_PATTERN).optional(),
    wikipediaDe: z.url().optional(),
    wikipediaEn: z.url().optional(),
    theoi: z.url().optional(),
  })
  .strict();

/** Vorbereitet fuer M4; bis dahin bleibt das Feld weg oder null. */
export const imageSchema = z
  .object({
    file: nonEmpty,
    credit: nonEmpty,
    license: nonEmpty,
    source: z.url(),
  })
  .strict();

export const figureSchema = z
  .object({
    id: figureIdSchema,
    aliases: z.array(figureIdSchema).optional(),
    category: z.enum(CATEGORIES),
    tier: z.number().int().min(0),
    greek: aspectSchema.optional(),
    roman: aspectSchema.optional(),
    counterparts: z.array(counterpartSchema).optional(),
    parentage: z.array(parentageVariantSchema),
    myths: z.array(mythSchema).optional(),
    confidence: z.enum(CONFIDENCE_LEVELS),
    refs: refsSchema.optional(),
    image: imageSchema.nullable().optional(),
  })
  .strict();

export const figuresFileSchema = z
  .object({
    figures: z.array(figureSchema).min(1),
  })
  .strict();

/** sources.yaml - die zitierten antiken Werke. */
export const sourceEntrySchema = z
  .object({
    author: localizedTextSchema,
    work: localizedTextSchema,
    date: localizedTextSchema.optional(),
    url: z.url().optional(),
  })
  .strict();

export const sourcesFileSchema = z
  .object({
    sources: z.record(z.string().regex(DOMAIN_KEY_PATTERN), sourceEntrySchema),
  })
  .strict();

/** categories.yaml - Anzeigenamen und Farben der Sachgruppen. */
export const categoryMetaSchema = z
  .object({
    label: localizedTextSchema,
    color: z.string().regex(HEX_COLOR_PATTERN, 'Farbe als #rrggbb in Kleinbuchstaben'),
    order: z.number().int().min(0),
  })
  .strict();

export const categoriesFileSchema = z
  .object({
    categories: z.record(z.enum(CATEGORIES), categoryMetaSchema),
  })
  .strict();

/** domains.yaml - kontrolliertes Vokabular der Zustaendigkeiten. */
export const domainsFileSchema = z
  .object({
    domains: z.record(z.string().regex(DOMAIN_KEY_PATTERN), localizedTextSchema),
  })
  .strict();

export type LocalizedText = z.infer<typeof localizedTextSchema>;
export type LocalizedList = z.infer<typeof localizedListSchema>;
export type SourceRef = z.infer<typeof sourceRefSchema>;
export type Epithet = z.infer<typeof epithetSchema>;
export type Aspect = z.infer<typeof aspectSchema>;
export type ParentageVariant = z.infer<typeof parentageVariantSchema>;
export type Counterpart = z.infer<typeof counterpartSchema>;
export type Relationship = z.infer<typeof relationshipSchema>;
export type RelationshipsFile = z.infer<typeof relationshipsFileSchema>;
export type Myth = z.infer<typeof mythSchema>;
export type Figure = z.infer<typeof figureSchema>;
export type FiguresFile = z.infer<typeof figuresFileSchema>;
export type SourceEntry = z.infer<typeof sourceEntrySchema>;
export type SourcesFile = z.infer<typeof sourcesFileSchema>;
export type CategoryMeta = z.infer<typeof categoryMetaSchema>;
export type CategoriesFile = z.infer<typeof categoriesFileSchema>;
export type DomainsFile = z.infer<typeof domainsFileSchema>;
