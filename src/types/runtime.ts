import type { Category, Confidence } from '../schema/constants.ts';
import type {
  CategoryMeta,
  Figure,
  LocalizedText,
  SourceEntry,
} from '../schema/figure.ts';

/**
 * Die Form, in der die Anwendung die Daten laedt.
 *
 * Bewusst getrennt vom Autorenmodell in `schema/figure.ts`: dort steht, wie
 * geschrieben wird, hier, wie gelesen wird. Das Geruest ist klein gehalten,
 * damit der erste Seitenaufbau auch mobil schnell bleibt; die ausfuehrlichen
 * Texte werden erst beim Oeffnen eines Infofensters nachgeladen.
 */

export type NodeKind = 'figure' | 'union';

export interface GraphNode {
  readonly id: string;
  readonly kind: NodeKind;
  /** Generationsebene; bei Verbindungsknoten die Ebene der Eltern. */
  readonly tier: number;
  /** Nur bei Figuren gesetzt. */
  readonly category?: Category;
  readonly confidence?: Confidence;
  /** Anzeigename in der jeweiligen Sicht; fehlt, wenn es kein Gegenstueck gibt. */
  readonly greek?: string;
  readonly roman?: string;
  /** Nur bei Verbindungsknoten: die beteiligten Figuren. */
  readonly parents?: readonly string[];
}

export type EdgeKind = 'canonical' | 'variant';

export interface GraphEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly kind: EdgeKind;
  /** Nur bei Varianten: Kennung der Abstammung und die zitierte Quelle. */
  readonly variantId?: string;
  readonly sourceKey?: string;
}

export interface GraphData {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
}

/** Ein Eintrag des Suchindex; deckt beide Sprachen und beide Sichten ab. */
export interface SearchDoc {
  readonly id: string;
  readonly category: Category;
  readonly names: readonly string[];
  readonly epithets: readonly string[];
  /** Zustaendigkeiten und Attribute, beide Sprachen - alles, wonach gesucht wird. */
  readonly terms: readonly string[];
}

/** Ausfuehrliche Angaben einer Figur, nach Sachgruppe gebuendelt nachgeladen. */
export type FigureDetail = Figure;

export interface DetailChunk {
  readonly category: Category;
  readonly figures: readonly FigureDetail[];
}

export interface Meta {
  readonly categories: Readonly<Record<Category, CategoryMeta>>;
  readonly domains: Readonly<Record<string, LocalizedText>>;
  readonly sources: Readonly<Record<string, SourceEntry>>;
  readonly counts: {
    readonly figures: number;
    readonly withGreek: number;
    readonly withRoman: number;
  };
  /** Sachgruppen, zu denen es eine Detaildatei gibt. */
  readonly detailChunks: readonly Category[];
}

/** Feste Koordinaten aus der Layoutberechnung im Build. */
export interface LayoutPosition {
  readonly x: number;
  readonly y: number;
}

export interface LayoutData {
  readonly positions: Readonly<Record<string, LayoutPosition>>;
  readonly width: number;
  readonly height: number;
}
