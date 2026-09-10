import { create } from 'zustand';
import type { Category, Lang, Tradition } from '../schema/constants.ts';
import type { UrlState, ViewMode } from './url.ts';
import { buildHash, MAX_DEPTH, MIN_DEPTH, readUrl } from './url.ts';

/**
 * Der Anwendungszustand spiegelt die Adresszeile.
 *
 * Jede Aenderung schreibt die Adresse fort, jede Aenderung der Adresse
 * (Zurueck-Taste, geteilter Link) schreibt den Zustand fort. Dadurch ist jeder
 * sichtbare Stand teilbar, ohne dass es dafuer einen zweiten Mechanismus braucht.
 */

interface AppState extends UrlState {
  setTradition: (tradition: Tradition) => void;
  setLang: (lang: Lang) => void;
  toggleVariants: () => void;
  setView: (view: ViewMode) => void;
  setDepth: (depth: number) => void;
  select: (figure: string | null) => void;
  toggleCategory: (category: Category) => void;
  setHiddenCategories: (categories: readonly Category[]) => void;
  setRoute: (route: UrlState['route']) => void;
  syncFromUrl: () => void;
}

/** Auswahl legt einen neuen Verlaufseintrag an, Einstellungen ersetzen den bestehenden. */
type HistoryMode = 'push' | 'replace';

function urlPart(state: AppState): UrlState {
  return {
    route: state.route,
    figure: state.figure,
    tradition: state.tradition,
    lang: state.lang,
    showVariants: state.showVariants,
    view: state.view,
    depth: state.depth,
    hiddenCategories: state.hiddenCategories,
  };
}

let suppressUrlWrite = false;

function writeUrl(state: AppState, mode: HistoryMode): void {
  if (suppressUrlWrite) return;

  const hash = buildHash(urlPart(state));
  if (hash === window.location.hash) return;

  const url = `${window.location.pathname}${window.location.search}${hash}`;
  if (mode === 'push') window.history.pushState(null, '', url);
  else window.history.replaceState(null, '', url);
}

export const useAppStore = create<AppState>((set, get) => {
  const apply = (patch: Partial<UrlState>, mode: HistoryMode = 'replace'): void => {
    set(patch);
    writeUrl(get(), mode);
  };

  return {
    ...readUrl(),

    setTradition: (tradition) => apply({ tradition }),
    setLang: (lang) => apply({ lang }),
    toggleVariants: () => apply({ showVariants: !get().showVariants }),
    setView: (view) => apply({ view }),
    setDepth: (depth) => apply({ depth: Math.min(MAX_DEPTH, Math.max(MIN_DEPTH, depth)) }),
    setRoute: (route) => apply({ route }, 'push'),

    select: (figure) => apply({ figure }, 'push'),

    toggleCategory: (category) => {
      const hidden = new Set(get().hiddenCategories);
      if (hidden.has(category)) hidden.delete(category);
      else hidden.add(category);
      apply({ hiddenCategories: [...hidden] });
    },

    setHiddenCategories: (categories) => apply({ hiddenCategories: [...categories] }),

    syncFromUrl: () => {
      suppressUrlWrite = true;
      set(readUrl());
      suppressUrlWrite = false;
    },
  };
});

/** Verbindet den Speicher mit der Zurueck- und Vorwaerts-Taste des Browsers. */
export function listenToHistory(): () => void {
  const handler = (): void => {
    useAppStore.getState().syncFromUrl();
  };

  window.addEventListener('popstate', handler);
  window.addEventListener('hashchange', handler);

  return () => {
    window.removeEventListener('popstate', handler);
    window.removeEventListener('hashchange', handler);
  };
}
