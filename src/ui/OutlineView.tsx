import { useMemo } from 'react';
import type { Lang, Tradition } from '../schema/constants.ts';
import type { CoreData } from '../data/loader.ts';
import { buildIndex } from '../graph/model.ts';
import type { Texts } from '../i18n/texts.ts';
import { nameOf, sortByName } from './display.ts';

/**
 * Der Stammbaum als verschachtelte Liste.
 *
 * Eine Zeichenflaeche ist fuer Vorleseprogramme und Suchmaschinen unsichtbar.
 * Diese Ansicht kostet wenig und macht den Inhalt ueberhaupt erst zugaenglich -
 * und sie ist zugleich die Notloesung, wenn die Grafik einmal nicht laedt.
 *
 * Figuren mit mehreren Eltern erscheinen nur an ihrer ersten Fundstelle
 * ausgeklappt; spaetere Vorkommen werden als Verweis gekennzeichnet, sonst
 * wuerde die Liste ins Unermessliche wachsen.
 */

const MAX_DEPTH = 12;

interface OutlineViewProps {
  readonly core: CoreData;
  readonly tradition: Tradition;
  readonly lang: Lang;
  readonly texts: Texts;
  readonly onBack: () => void;
}

export function OutlineView({
  core,
  tradition,
  lang,
  texts,
  onBack,
}: OutlineViewProps): React.JSX.Element {
  const index = useMemo(() => buildIndex(core.graph), [core.graph]);

  const roots = useMemo(
    () =>
      sortByName(
        index.figureIds.filter((id) => index.parentsOf(id).length === 0),
        index.nodeById,
        tradition,
        lang,
      ),
    [index, tradition, lang],
  );

  const expanded = new Set<string>();

  const renderNode = (id: string, depth: number): React.JSX.Element => {
    const node = index.nodeById.get(id);
    const category = node?.category;
    const label = category === undefined ? '' : (core.meta.categories[category]?.label[lang] ?? category);

    const alreadyShown = expanded.has(id);
    if (!alreadyShown) expanded.add(id);

    const children =
      alreadyShown || depth >= MAX_DEPTH
        ? []
        : sortByName(index.childrenOf(id), index.nodeById, tradition, lang);

    return (
      <li key={`${id}-${depth}`}>
        <span className="outline__name">{nameOf(node, tradition, lang)}</span>{' '}
        <span className="outline__meta">
          {label}
          {alreadyShown && ` · ${texts.outlineRepeated}`}
        </span>
        {children.length > 0 && <ul>{children.map((child) => renderNode(child, depth + 1))}</ul>}
      </li>
    );
  };

  return (
    <main className="outline">
      <button type="button" className="state__action" onClick={onBack}>
        {texts.backToGraph}
      </button>

      <h1>{texts.outlineTitle}</h1>
      <p className="outline__intro">{texts.outlineIntro}</p>

      <ul>{roots.map((id) => renderNode(id, 0))}</ul>
    </main>
  );
}
