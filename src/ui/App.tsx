import { useEffect, useMemo, useState } from 'react';
import type { Category } from '../schema/constants.ts';
import type { CoreData } from '../data/loader.ts';
import { loadCore } from '../data/loader.ts';
import type { GraphIndex } from '../graph/model.ts';
import {
  ancestorsOf,
  buildIndex,
  computeBridges,
  descendantsOf,
  fullSiblingsOf,
  neighbourhoodOf,
  partnerLinksOf,
} from '../graph/model.ts';
import type { PartnerLink } from '../types/runtime.ts';
import type { VisibilityState } from '../graph/view.ts';
import { texts as textsFor } from '../i18n/texts.ts';
import { listenToHistory, useAppStore } from '../state/store.ts';
import { existsIn } from './display.ts';
import { buildNameIndex } from './nameLinks.ts';
import { FilterRail } from './FilterRail.tsx';
import { GraphCanvas } from './GraphCanvas.tsx';
import { Header } from './Header.tsx';
import { OutlineView } from './OutlineView.tsx';
import { SidePanel } from './SidePanel.tsx';

/**
 * Was die Fokusansicht zeigt.
 *
 * Ohne Auswahl sind es die obersten Generationen - der Stammbaum soll am Anfang
 * beginnen, bei Chaos und Gaia, und sich mit der Tiefe nach unten oeffnen. Mit
 * Auswahl ist es die Umgebung der gewaehlten Figur: Vorfahren, Nachkommen,
 * leibliche Geschwister und die Partner.
 *
 * Die Partner muessen ausdruecklich dazu: sie stehen im Stammbaum nicht ueber
 * oder unter der Figur, sondern daneben. Ohne sie waere Aphrodites Ehemann
 * ausgeblendet, obwohl das Infofenster ihn nennt.
 */
function focusSet(
  index: GraphIndex,
  partners: readonly PartnerLink[],
  selected: string | null,
  depth: number,
): Set<string> {
  if (selected === null) {
    const top = new Set<string>();
    for (const id of index.figureIds) {
      const tier = index.nodeById.get(id)?.tier ?? 0;
      if (tier <= depth) top.add(id);
    }
    return top;
  }

  return new Set<string>([
    selected,
    ...ancestorsOf(index, selected, depth),
    ...descendantsOf(index, selected, depth),
    ...fullSiblingsOf(index, selected),
    ...partnerLinksOf(partners, selected).map((entry) => entry.partner),
  ]);
}

export function App(): React.JSX.Element {
  const [core, setCore] = useState<CoreData | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const lang = useAppStore((state) => state.lang);
  const texts = textsFor(lang);

  useEffect(() => listenToHistory(), []);

  useEffect(() => {
    let cancelled = false;
    setFailure(null);

    loadCore()
      .then((data) => {
        if (!cancelled) setCore(data);
      })
      .catch((error: unknown) => {
        if (!cancelled) setFailure(error instanceof Error ? error.message : String(error));
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (failure !== null) {
    return (
      <div className="state">
        <h1 className="state__title">{texts.loadingFailed}</h1>
        <p className="state__detail">{failure}</p>
        <button type="button" className="state__action" onClick={() => setAttempt((n) => n + 1)}>
          {texts.retry}
        </button>
      </div>
    );
  }

  if (core === null) {
    return (
      <div className="state">
        <h1 className="state__title">{texts.loading}</h1>
      </div>
    );
  }

  return <Loaded core={core} />;
}

function Loaded({ core }: { readonly core: CoreData }): React.JSX.Element {
  const store = useAppStore();
  const texts = textsFor(store.lang);
  // Beim Start ausgefahren. Nur unter 900 Pixeln nicht: dort legt sie sich ueber
  // die Zeichenflaeche und wuerde den ganzen Stammbaum verdecken.
  const [railOpen, setRailOpen] = useState(
    () => typeof window === 'undefined' || window.matchMedia('(min-width: 901px)').matches,
  );

  const index = useMemo(() => buildIndex(core.graph), [core.graph]);

  /** Namenstabelle fuer die Verweise im Fliesstext der Infofenster. */
  const nameIndex = useMemo(
    () => buildNameIndex(core.graph.nodes, core.search),
    [core.graph.nodes, core.search],
  );

  /** Tiefste vorhandene Generationsebene - mehr als das gibt es nicht zu zeigen. */
  const maxDepth = useMemo(() => {
    let deepest = 1;
    for (const node of core.graph.nodes) {
      if (node.kind === 'figure') deepest = Math.max(deepest, node.tier);
    }
    return deepest;
  }, [core.graph]);

  const counts = useMemo(() => {
    const perCategory = new Map<Category, number>();
    for (const node of core.graph.nodes) {
      if (node.kind !== 'figure' || node.category === undefined) continue;
      perCategory.set(node.category, (perCategory.get(node.category) ?? 0) + 1);
    }
    return perCategory;
  }, [core.graph]);

  /** Figuren, die es in der gewaehlten Sicht gibt. Der Rest verschwindet. */
  const present = useMemo(() => {
    const set = new Set<string>();
    for (const node of core.graph.nodes) {
      if (node.kind === 'figure' && existsIn(node, store.tradition)) set.add(node.id);
    }
    return set;
  }, [core.graph, store.tradition]);

  const hiddenCount = index.figureIds.length - present.size;

  const bridges = useMemo(() => computeBridges(index, present), [index, present]);

  /**
   * Zwei Gruende, warum eine Figur nicht gezeigt wird, mit verschiedener Wirkung:
   * Sachgruppenfilter hinterlassen bewusst Luecken, die Fokusansicht beschraenkt
   * auf die Umgebung des Ausgangspunkts.
   */
  const filtered = useMemo(() => {
    const hidden = new Set<string>();
    const hiddenCategories = new Set(store.hiddenCategories);

    for (const node of core.graph.nodes) {
      if (node.kind !== 'figure' || node.category === undefined) continue;
      if (hiddenCategories.has(node.category)) hidden.add(node.id);
    }

    if (store.view === 'focus') {
      const keep = focusSet(index, core.graph.partners, store.figure, Math.min(store.depth, maxDepth));
      for (const id of index.figureIds) {
        if (!keep.has(id)) hidden.add(id);
      }
    }

    return hidden;
  }, [core.graph, index, maxDepth, store.hiddenCategories, store.view, store.figure, store.depth]);

  const visibility = useMemo<VisibilityState>(
    () => ({ present, filtered, bridges }),
    [present, filtered, bridges],
  );

  /** Eltern, Kinder und Partner der Auswahl - alles Uebrige tritt zurueck. */
  const neighbourhood = useMemo(() => {
    if (store.figure === null) return new Set<string>();
    return neighbourhoodOf(index, core.graph.partners, store.figure);
  }, [index, core.graph.partners, store.figure]);

  if (store.route === 'outline') {
    return (
      <OutlineView
        core={core}
        tradition={store.tradition}
        lang={store.lang}
        texts={texts}
        onBack={() => store.setRoute('graph')}
      />
    );
  }

  const selectedNode = store.figure === null ? undefined : index.nodeById.get(store.figure);

  return (
    <div className="app">
      <Header
        texts={texts}
        lang={store.lang}
        tradition={store.tradition}
        view={store.view}
        showVariants={store.showVariants}
        railOpen={railOpen}
        docs={core.search}
        nodeById={index.nodeById}
        meta={core.meta}
        onTradition={store.setTradition}
        onLang={store.setLang}
        onView={store.setView}
        onToggleVariants={store.toggleVariants}
        onPick={store.select}
        onToggleRail={() => setRailOpen((open) => !open)}
      />

      <div
        className={[
          'app__body',
          railOpen ? 'app__body--with-rail' : '',
          selectedNode === undefined ? '' : 'app__body--with-panel',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <FilterRail
          texts={texts}
          lang={store.lang}
          meta={core.meta}
          counts={counts}
          hiddenCategories={store.hiddenCategories}
          view={store.view}
          depth={Math.min(store.depth, maxDepth)}
          maxDepth={maxDepth}
          open={railOpen}
          onToggleCategory={store.toggleCategory}
          onSetHidden={store.setHiddenCategories}
          onDepth={store.setDepth}
          onOutline={() => store.setRoute('outline')}
        />

        <GraphCanvas
          core={core}
          tradition={store.tradition}
          lang={store.lang}
          showVariants={store.showVariants}
          selectedId={store.figure}
          visibility={visibility}
          view={store.view}
          neighbourhood={neighbourhood}
          hiddenCount={hiddenCount}
          texts={texts}
          onSelect={store.select}
        />

        {selectedNode !== undefined && store.figure !== null && (
          <SidePanel
            figureId={store.figure}
            node={selectedNode}
            index={index}
            partners={core.graph.partners}
            nameIndex={nameIndex}
            meta={core.meta}
            tradition={store.tradition}
            lang={store.lang}
            texts={texts}
            onPick={store.select}
            onClose={() => store.select(null)}
          />
        )}
      </div>
    </div>
  );
}
