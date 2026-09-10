import type { Category, Lang, Tradition } from '../schema/constants.ts';
import { CATEGORIES, LANGUAGES, TRADITIONS } from '../schema/constants.ts';

/**
 * Der Zustand steht in der Adresszeile, nicht umgekehrt.
 *
 * Bewusst hinter der Raute: damit braucht es auf GitHub Pages keine
 * umgeleitete Fehlerseite, und derselbe Build laeuft unter jedem Pfad. Wer eine
 * Ansicht teilt, teilt genau das, was er sieht.
 *
 * Beispiel: #/f/aphrodite?m=roman&l=de&v=1&view=focus&d=2
 */

export type ViewMode = 'focus' | 'overview';

export const VIEW_MODES = ['focus', 'overview'] as const;

export const MIN_DEPTH = 1;

/**
 * Obergrenze fuer die Generationentiefe in der Adresszeile.
 *
 * Bewusst hoeher als der Stammbaum je reicht: die Voreinstellung ist "alle
 * Generationen", und die Oberflaeche begrenzt zusaetzlich auf die tatsaechlich
 * vorhandene Tiefe. So bleibt der Wert gueltig, wenn der Bestand waechst.
 */
export const MAX_DEPTH = 12;
export const DEFAULT_DEPTH = MAX_DEPTH;

export interface UrlState {
  readonly route: 'graph' | 'outline';
  readonly figure: string | null;
  readonly tradition: Tradition;
  readonly lang: Lang;
  readonly showVariants: boolean;
  readonly view: ViewMode;
  readonly depth: number;
  readonly hiddenCategories: readonly Category[];
}

const PARAM = {
  tradition: 'm',
  lang: 'l',
  variants: 'v',
  view: 'view',
  depth: 'd',
  hidden: 'hide',
} as const;

const FIGURE_PREFIX = '#/f/';
const OUTLINE_PATH = '#/text';

export function defaultState(): UrlState {
  return {
    route: 'graph',
    figure: null,
    tradition: 'greek',
    // Englisch als Ausgangssprache: die Seite ist oeffentlich, Deutsch ist einen
    // Klick entfernt und bleibt in der Adresse erhalten, wenn jemand teilt.
    lang: 'en',
    showVariants: false,
    view: 'focus',
    depth: DEFAULT_DEPTH,
    // Beim Start ist jede Sachgruppe eingeschaltet; abwaehlen laesst sich jede.
    hiddenCategories: [],
  };
}

function clampDepth(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DEPTH;
  return Math.min(MAX_DEPTH, Math.max(MIN_DEPTH, Math.round(value)));
}

function parseCategories(raw: string | null): Category[] | null {
  if (raw === null) return null;
  if (raw.trim() === '') return [];

  const known = new Set<string>(CATEGORIES);
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry): entry is Category => known.has(entry));
}

/** Liest den Zustand aus der Adresszeile; unbekannte Werte fallen auf die Vorgabe zurueck. */
export function readUrl(hash: string = window.location.hash): UrlState {
  const fallback = defaultState();
  const [pathPart = '', queryPart = ''] = hash.split('?');

  if (pathPart === OUTLINE_PATH) {
    return { ...fallback, route: 'outline', ...readParams(queryPart) };
  }

  const figure = pathPart.startsWith(FIGURE_PREFIX)
    ? decodeURIComponent(pathPart.slice(FIGURE_PREFIX.length)) || null
    : null;

  return { ...fallback, figure, ...readParams(queryPart) };
}

function readParams(query: string): Partial<UrlState> {
  const params = new URLSearchParams(query);
  const state: Record<string, unknown> = {};

  const tradition = params.get(PARAM.tradition);
  if (tradition !== null && (TRADITIONS as readonly string[]).includes(tradition)) {
    state['tradition'] = tradition;
  }

  const lang = params.get(PARAM.lang);
  if (lang !== null && (LANGUAGES as readonly string[]).includes(lang)) {
    state['lang'] = lang;
  }

  const variants = params.get(PARAM.variants);
  if (variants !== null) state['showVariants'] = variants === '1';

  const view = params.get(PARAM.view);
  if (view !== null && (VIEW_MODES as readonly string[]).includes(view)) {
    state['view'] = view;
  }

  const depth = params.get(PARAM.depth);
  if (depth !== null) state['depth'] = clampDepth(Number.parseInt(depth, 10));

  const hidden = parseCategories(params.get(PARAM.hidden));
  if (hidden !== null) state['hiddenCategories'] = hidden;

  return state as Partial<UrlState>;
}

/** Baut die Adresse zu einem Zustand; nur Abweichungen von der Vorgabe werden geschrieben. */
export function buildHash(state: UrlState): string {
  const fallback = defaultState();
  const params = new URLSearchParams();

  if (state.tradition !== fallback.tradition) params.set(PARAM.tradition, state.tradition);
  if (state.lang !== fallback.lang) params.set(PARAM.lang, state.lang);
  if (state.showVariants !== fallback.showVariants) params.set(PARAM.variants, state.showVariants ? '1' : '0');
  if (state.view !== fallback.view) params.set(PARAM.view, state.view);
  if (state.depth !== fallback.depth) params.set(PARAM.depth, String(state.depth));

  const hidden = [...state.hiddenCategories].sort((a, b) => a.localeCompare(b, 'en'));
  const fallbackHidden = [...fallback.hiddenCategories].sort((a, b) => a.localeCompare(b, 'en'));
  if (hidden.join(',') !== fallbackHidden.join(',')) params.set(PARAM.hidden, hidden.join(','));

  const path =
    state.route === 'outline'
      ? OUTLINE_PATH
      : state.figure === null
        ? '#/'
        : `${FIGURE_PREFIX}${encodeURIComponent(state.figure)}`;

  const query = params.toString();
  return query === '' ? path : `${path}?${query}`;
}
