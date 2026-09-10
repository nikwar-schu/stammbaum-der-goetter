import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Category } from '../src/schema/constants.ts';
import { CATEGORIES } from '../src/schema/constants.ts';
import type { DetailChunk, Meta, SearchDoc } from '../src/types/runtime.ts';
import type { Dataset } from './lib/dataset.ts';
import { loadDataset } from './lib/dataset.ts';
import { buildGraph } from './lib/derive.ts';
import { PUBLIC_DATA_DIR, relativeToProject } from './lib/paths.ts';
import { DataFileError } from './lib/yaml.ts';

/**
 * Uebersetzt die YAML-Quelldateien in die JSON-Dateien, die der Browser laedt.
 *
 * Die Aufteilung folgt dem Ladeverhalten: das Geruest und der Suchindex werden
 * sofort gebraucht, die ausfuehrlichen Texte erst, wenn jemand ein Infofenster
 * oeffnet. Deshalb liegen sie in getrennten Dateien je Sachgruppe.
 */

const INDENT_COMPACT = 0;

async function writeJson(file: string, data: unknown): Promise<void> {
  const target = path.join(PUBLIC_DATA_DIR, file);
  const body = INDENT_COMPACT > 0 ? JSON.stringify(data, null, INDENT_COMPACT) : JSON.stringify(data);
  await writeFile(target, `${body}\n`, 'utf8');

  const kilobytes = (Buffer.byteLength(body, 'utf8') / 1024).toFixed(1);
  process.stdout.write(`geschrieben  ${relativeToProject(target)}  (${kilobytes} kB)\n`);
}

/** Sammelt alle Namensformen einer Figur - Grundlage der unscharfen Suche. */
function collectNames(dataset: Dataset, id: string): string[] {
  const figure = dataset.byId.get(id)!;
  const names = new Set<string>();

  for (const aspect of [figure.greek, figure.roman]) {
    if (aspect === undefined) continue;
    names.add(aspect.name.de);
    names.add(aspect.name.en);
    if (aspect.nameOriginal !== undefined) names.add(aspect.nameOriginal);
    for (const alternative of aspect.altNames ?? []) names.add(alternative);
  }
  return [...names];
}

function buildSearchIndex(dataset: Dataset): SearchDoc[] {
  const docs: SearchDoc[] = [];

  for (const [id, figure] of dataset.byId) {
    const epithets = new Set<string>();
    const terms = new Set<string>();

    for (const aspect of [figure.greek, figure.roman]) {
      if (aspect === undefined) continue;
      for (const epithet of aspect.epithets ?? []) epithets.add(epithet.name);
      for (const key of aspect.domains) {
        const label = dataset.domains[key];
        if (label === undefined) continue;
        terms.add(label.de);
        terms.add(label.en);
      }
      // Attribute gehoeren in den Index: viele suchen ueber das Erkennungszeichen
      // ("Blitzbuendel", "thunderbolt"), nicht ueber den Namen.
      for (const symbol of [...(aspect.symbols?.de ?? []), ...(aspect.symbols?.en ?? [])]) {
        terms.add(symbol);
      }
    }

    docs.push({
      id,
      category: figure.category,
      names: collectNames(dataset, id),
      epithets: [...epithets],
      terms: [...terms],
    });
  }

  return docs.sort((a, b) => a.id.localeCompare(b.id, 'en'));
}

function buildDetailChunks(dataset: Dataset): DetailChunk[] {
  const chunks: DetailChunk[] = [];

  for (const category of CATEGORIES) {
    const figures = [...dataset.byId.values()]
      .filter((figure) => figure.category === category)
      .sort((a, b) => a.id.localeCompare(b.id, 'en'));

    if (figures.length > 0) chunks.push({ category, figures });
  }

  return chunks;
}

function buildMeta(dataset: Dataset, detailCategories: readonly Category[]): Meta {
  const figures = [...dataset.byId.values()];

  return {
    categories: dataset.categories as Meta['categories'],
    domains: dataset.domains,
    sources: dataset.sources,
    counts: {
      figures: figures.length,
      withGreek: figures.filter((figure) => figure.greek !== undefined).length,
      withRoman: figures.filter((figure) => figure.roman !== undefined).length,
    },
    detailChunks: detailCategories,
  };
}

async function main(): Promise<void> {
  await mkdir(PUBLIC_DATA_DIR, { recursive: true });

  const dataset = await loadDataset();
  if (dataset.duplicateIds.length > 0) {
    throw new Error(
      `doppelte Kennungen im Datenbestand: ${[...new Set(dataset.duplicateIds)].join(', ')} - ` +
        'zuerst "npm run validate" ausfuehren',
    );
  }

  const graph = buildGraph(dataset);
  const chunks = buildDetailChunks(dataset);

  await writeJson('graph.json', graph);
  await writeJson('search.json', buildSearchIndex(dataset));
  await writeJson('meta.json', buildMeta(dataset, chunks.map((chunk) => chunk.category)));

  for (const chunk of chunks) {
    await writeJson(`detail-${chunk.category}.json`, chunk);
  }

  const figureNodes = graph.nodes.filter((node) => node.kind === 'figure').length;
  const unionNodes = graph.nodes.length - figureNodes;
  const variantEdges = graph.edges.filter((edge) => edge.kind === 'variant').length;

  process.stdout.write(
    `\n${figureNodes} Figuren, ${unionNodes} Verbindungsknoten, ` +
      `${graph.edges.length - variantEdges} Leitkanten, ${variantEdges} Variantenkanten\n`,
  );
}

try {
  await main();
} catch (error) {
  const message = error instanceof DataFileError ? error.message : (error as Error).message;
  process.stderr.write(`Aufbereitung fehlgeschlagen: ${message}\n`);
  process.exitCode = 1;
}
