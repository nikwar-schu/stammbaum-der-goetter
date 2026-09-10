import path from 'node:path';
import type {
  CategoriesFile,
  DomainsFile,
  Figure,
  ParentageVariant,
  SourcesFile,
} from '../../src/schema/figure.ts';
import {
  categoriesFileSchema,
  domainsFileSchema,
  figuresFileSchema,
  sourcesFileSchema,
} from '../../src/schema/figure.ts';
import type { AdjacencyMap } from '../../src/graph/dag.ts';
import {
  CATEGORIES_FILE,
  DOMAINS_FILE,
  FIGURES_DIR,
  relativeToProject,
  SOURCES_FILE,
} from './paths.ts';
import { listYamlFiles, parseYamlFile } from './yaml.ts';

/**
 * Laedt den gesamten Datenbestand einmal und stellt ihn allen Skripten bereit.
 *
 * Doppelte Kennungen werden hier nicht als Fehler behandelt, sondern gesammelt -
 * das Pruefskript soll alle Probleme eines Durchlaufs melden koennen, statt beim
 * ersten abzubrechen.
 */

export interface FigureEntry {
  readonly figure: Figure;
  /** Herkunftsdatei, projektrelativ, fuer verstaendliche Fehlermeldungen. */
  readonly file: string;
}

export interface Dataset {
  readonly entries: readonly FigureEntry[];
  /** Kennung auf Figur; bei Doppelungen gewinnt das erste Vorkommen. */
  readonly byId: ReadonlyMap<string, Figure>;
  readonly fileById: ReadonlyMap<string, string>;
  readonly duplicateIds: readonly string[];
  readonly sources: SourcesFile['sources'];
  readonly categories: CategoriesFile['categories'];
  readonly domains: DomainsFile['domains'];
}

export async function loadDataset(): Promise<Dataset> {
  const [sourcesFile, categoriesFile, domainsFile] = await Promise.all([
    parseYamlFile(SOURCES_FILE, sourcesFileSchema),
    parseYamlFile(CATEGORIES_FILE, categoriesFileSchema),
    parseYamlFile(DOMAINS_FILE, domainsFileSchema),
  ]);

  const figureFiles = await listYamlFiles(FIGURES_DIR);
  const entries: FigureEntry[] = [];

  for (const file of figureFiles) {
    const parsed = await parseYamlFile(file, figuresFileSchema);
    const relative = relativeToProject(file);
    for (const figure of parsed.figures) {
      entries.push({ figure, file: relative });
    }
  }

  const byId = new Map<string, Figure>();
  const fileById = new Map<string, string>();
  const duplicateIds: string[] = [];

  for (const entry of entries) {
    if (byId.has(entry.figure.id)) {
      duplicateIds.push(entry.figure.id);
      continue;
    }
    byId.set(entry.figure.id, entry.figure);
    fileById.set(entry.figure.id, entry.file);
  }

  return {
    entries,
    byId,
    fileById,
    duplicateIds,
    sources: sourcesFile.sources,
    categories: categoriesFile.categories,
    domains: domainsFile.domains,
  };
}

/** Die Leitversion der Abstammung, falls vorhanden. */
export function canonicalParentage(figure: Figure): ParentageVariant | undefined {
  return figure.parentage.find((variant) => variant.canonical);
}

/** Alle Abstammungen ausser der Leitversion. */
export function variantParentages(figure: Figure): ParentageVariant[] {
  return figure.parentage.filter((variant) => !variant.canonical);
}

/**
 * Eltern-Kind-Graph der Leitversion - genau der Graph, der das Layout bestimmt.
 * Kanten zeigen von den Eltern auf das Kind.
 */
export function canonicalAdjacency(dataset: Dataset): AdjacencyMap {
  const adjacency = new Map<string, string[]>();
  const ensure = (id: string): string[] => {
    const existing = adjacency.get(id);
    if (existing !== undefined) return existing;
    const created: string[] = [];
    adjacency.set(id, created);
    return created;
  };

  for (const id of dataset.byId.keys()) ensure(id);

  for (const [id, figure] of dataset.byId) {
    const canonical = canonicalParentage(figure);
    if (canonical === undefined) continue;
    for (const parent of canonical.parents) {
      ensure(parent).push(id);
    }
  }

  return adjacency;
}

/** Wie `canonicalAdjacency`, aber ueber alle ueberlieferten Abstammungen. */
export function fullAdjacency(dataset: Dataset): AdjacencyMap {
  const adjacency = new Map<string, string[]>();
  const ensure = (id: string): string[] => {
    const existing = adjacency.get(id);
    if (existing !== undefined) return existing;
    const created: string[] = [];
    adjacency.set(id, created);
    return created;
  };

  for (const id of dataset.byId.keys()) ensure(id);

  for (const [id, figure] of dataset.byId) {
    for (const variant of figure.parentage) {
      for (const parent of variant.parents) {
        const targets = ensure(parent);
        if (!targets.includes(id)) targets.push(id);
      }
    }
  }

  return adjacency;
}

/** Dateiname ohne Endung, z. B. '01-protogenoi' - fuer die Aufteilung der Ausgabedateien. */
export function fileKey(entry: FigureEntry): string {
  return path.basename(entry.file, '.yaml');
}
