import { useEffect, useRef, useState } from 'react';
import type { Tradition } from '../schema/constants.ts';
import type { CoreData } from '../data/loader.ts';
import type { VisibilityState } from '../graph/view.ts';
import { TreeView } from '../graph/view.ts';
import { DARK_THEME, LIGHT_THEME } from '../graph/style.ts';
import type { Texts } from '../i18n/texts.ts';
import type { ViewMode } from '../state/url.ts';

/**
 * Bindet die Zeichenflaeche an React an, ohne sie React zu ueberlassen.
 *
 * React erzeugt genau einen leeren Bereich; alles Weitere geschieht ueber
 * gezielte Aufrufe an die Ansicht. Wuerde React die hunderten Knoten selbst
 * verwalten, waere jede Umschaltung ein vollstaendiger Neuaufbau der Anzeige.
 */

const DARK_QUERY = '(prefers-color-scheme: dark)';

function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches;
}

interface GraphCanvasProps {
  readonly core: CoreData;
  readonly tradition: Tradition;
  readonly showVariants: boolean;
  readonly selectedId: string | null;
  readonly visibility: VisibilityState;
  readonly view: ViewMode;
  readonly neighbourhood: ReadonlySet<string>;
  readonly hiddenCount: number;
  readonly texts: Texts;
  readonly onSelect: (figureId: string | null) => void;
}

export function GraphCanvas({
  core,
  tradition,
  showVariants,
  selectedId,
  visibility,
  view,
  neighbourhood,
  hiddenCount,
  texts,
  onSelect,
}: GraphCanvasProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<TreeView | null>(null);
  const [ready, setReady] = useState(false);
  const [dark, setDark] = useState(prefersDark);
  const awaitingFirstFit = useRef(true);
  const previousView = useRef(view);

  // Die Auswahl-Rueckmeldung liegt in einem Ref, damit ein Wechsel des
  // Rueckrufs nicht die gesamte Zeichenflaeche neu aufbaut.
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  // Die Auswahl wird beim Einpassen gebraucht, soll dessen Effekt aber nicht
  // ausloesen: die Sichtbarkeit aendert sich bei einer Auswahl ohnehin mit.
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return undefined;

    const view = new TreeView({
      container,
      graph: core.graph,
      layout: core.layout,
      meta: core.meta,
      theme: prefersDark() ? DARK_THEME : LIGHT_THEME,
      onSelect: (id) => selectRef.current(id),
    });

    viewRef.current = view;
    awaitingFirstFit.current = true;
    setReady(true);

    return () => {
      setReady(false);
      viewRef.current = null;
      view.destroy();
    };
  }, [core]);

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const handler = (event: MediaQueryListEvent): void => setDark(event.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (ready) viewRef.current?.setTheme(dark ? DARK_THEME : LIGHT_THEME);
  }, [ready, dark]);

  useEffect(() => {
    if (ready) viewRef.current?.setTradition(tradition);
  }, [ready, tradition]);

  useEffect(() => {
    if (!ready) return;
    viewRef.current?.setVisibility(visibility);

    const viewChanged = previousView.current !== view;
    previousView.current = view;

    // Der erste Ausschnitt wird immer gesetzt, danach bei jedem Wechsel der
    // Ansichtsart und laufend in der Fokusansicht. In der Gesamtansicht soll ein
    // Filterwechsel dagegen nicht ungefragt den selbst gewaehlten Ausschnitt
    // verwerfen.
    if (awaitingFirstFit.current) {
      awaitingFirstFit.current = false;
      viewRef.current?.frame(selectedRef.current, false);
      return;
    }
    if (view === 'focus' || viewChanged) viewRef.current?.frame(selectedRef.current);
  }, [ready, visibility, view]);

  useEffect(() => {
    if (ready) viewRef.current?.setVariantsVisible(showVariants);
  }, [ready, showVariants]);

  useEffect(() => {
    if (ready) viewRef.current?.setHighlight(selectedId, neighbourhood);
  }, [ready, selectedId, neighbourhood]);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return undefined;

    const observer = new ResizeObserver(() => viewRef.current?.resize());
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="canvas">
      <div ref={containerRef} className="canvas__surface" />

      {hiddenCount > 0 && (
        <div className="canvas__notice" role="status">
          <span>{texts.hiddenNotice(hiddenCount)}</span>
          <span aria-hidden="true">·</span>
          <span>{texts.bridgeNotice}</span>
        </div>
      )}

      <div className="canvas__tools">
        <button
          type="button"
          className="canvas__tool"
          onClick={() => viewRef.current?.fitToVisible()}
        >
          {texts.fitToScreen}
        </button>
      </div>
    </div>
  );
}
