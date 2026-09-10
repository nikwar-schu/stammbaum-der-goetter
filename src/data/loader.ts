import type { Category } from '../schema/constants.ts';
import type {
  DetailChunk,
  GraphData,
  LayoutData,
  Meta,
  SearchDoc,
} from '../types/runtime.ts';

/**
 * Laedt die aufbereiteten Daten.
 *
 * Zweistufig: das Geruest, der Suchindex und die Beschreibungen der Sachgruppen
 * werden sofort gebraucht, die ausfuehrlichen Texte einer Sachgruppe erst, wenn
 * jemand das erste Infofenster daraus oeffnet. Das haelt den ersten
 * Seitenaufbau auch auf dem Handy kurz.
 */

export interface CoreData {
  readonly graph: GraphData;
  readonly meta: Meta;
  readonly search: readonly SearchDoc[];
  readonly layout: LayoutData;
}

function dataUrl(file: string): string {
  return `${import.meta.env.BASE_URL}data/${file}`;
}

async function fetchJson<T>(file: string): Promise<T> {
  const url = dataUrl(file);

  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new Error(`"${file}" ist nicht erreichbar`, { cause });
  }

  if (!response.ok) {
    throw new Error(`"${file}" konnte nicht geladen werden (HTTP ${response.status})`);
  }

  try {
    return (await response.json()) as T;
  } catch (cause) {
    throw new Error(`"${file}" enthält kein gültiges JSON`, { cause });
  }
}

export async function loadCore(): Promise<CoreData> {
  const [graph, meta, search, layout] = await Promise.all([
    fetchJson<GraphData>('graph.json'),
    fetchJson<Meta>('meta.json'),
    fetchJson<SearchDoc[]>('search.json'),
    fetchJson<LayoutData>('layout.json'),
  ]);

  return { graph, meta, search, layout };
}

const detailCache = new Map<Category, Promise<DetailChunk>>();

/** Laedt die ausfuehrlichen Texte einer Sachgruppe; jede Gruppe nur einmal. */
export function loadDetail(category: Category): Promise<DetailChunk> {
  const cached = detailCache.get(category);
  if (cached !== undefined) return cached;

  const request = fetchJson<DetailChunk>(`detail-${category}.json`).catch((error: unknown) => {
    // Ein Fehlschlag darf nicht dauerhaft im Zwischenspeicher haengen bleiben,
    // sonst schlaegt auch jeder spaetere Versuch fehl.
    detailCache.delete(category);
    throw error;
  });

  detailCache.set(category, request);
  return request;
}
