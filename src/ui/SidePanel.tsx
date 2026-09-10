import { useEffect, useState } from 'react';
import type { Category, Lang, RelationshipType, Tradition } from '../schema/constants.ts';
import { RELATIONSHIP_SYMBOLS } from '../schema/constants.ts';
import type { Figure, ParentageVariant, SourceRef } from '../schema/figure.ts';
import type { GraphNode, Meta, PartnerLink } from '../types/runtime.ts';
import { loadDetail } from '../data/loader.ts';
import type { GraphIndex } from '../graph/model.ts';
import { partnerLinksOf, siblingsOf } from '../graph/model.ts';
import type { Texts } from '../i18n/texts.ts';
import type { NameIndex } from './nameLinks.ts';
import { Prose } from './Prose.tsx';
import { aspectOf, existsIn, nameOf, otherAspectOf, sortByName } from './display.ts';

/**
 * Das Infofenster zur gewaehlten Figur.
 *
 * Drei Reiter, weil die Angaben drei verschiedene Fragen beantworten: was war
 * das fuer eine Gottheit, wie haengt sie im Stammbaum, und woher wissen wir das.
 * Der letzte Reiter ist der wichtigste bei den Nischengottheiten - dort steht,
 * auf welcher einzelnen Textstelle ein Eintrag beruht.
 */

type Tab = 'overview' | 'family' | 'sources';

interface DetailState {
  readonly figure: Figure | null;
  readonly failed: boolean;
}

function useFigureDetail(figureId: string | null, category: Category | undefined): DetailState {
  const [state, setState] = useState<DetailState>({ figure: null, failed: false });

  useEffect(() => {
    setState({ figure: null, failed: false });
    if (figureId === null || category === undefined) return undefined;

    let cancelled = false;
    loadDetail(category)
      .then((chunk) => {
        if (cancelled) return;
        const found = chunk.figures.find((candidate) => candidate.id === figureId) ?? null;
        setState({ figure: found, failed: found === null });
      })
      .catch(() => {
        if (!cancelled) setState({ figure: null, failed: true });
      });

    return () => {
      cancelled = true;
    };
  }, [figureId, category]);

  return state;
}

function formatSource(reference: SourceRef, meta: Meta, lang: Lang): string {
  const entry = meta.sources[reference.source];
  if (entry === undefined) return reference.source;

  const work = `${entry.author[lang]}, ${entry.work[lang]}`;
  return reference.loc === undefined ? work : `${work} ${reference.loc}`;
}

interface FieldProps {
  readonly label: string;
  readonly children: React.ReactNode;
}

function Field({ label, children }: FieldProps): React.JSX.Element {
  return (
    <div className="field">
      <p className="field__label">{label}</p>
      <div className="field__value">{children}</div>
    </div>
  );
}

function Chips({ items }: { readonly items: readonly string[] }): React.JSX.Element {
  return (
    <ul className="chips">
      {items.map((item) => (
        <li key={item} className="chip">
          {item}
        </li>
      ))}
    </ul>
  );
}

interface RelationListProps {
  readonly ids: readonly string[];
  readonly nodeById: ReadonlyMap<string, GraphNode>;
  readonly meta: Meta;
  readonly tradition: Tradition;
  readonly lang: Lang;
  readonly notes?: ReadonlyMap<string, string>;
  readonly onPick: (figureId: string) => void;
}

function RelationList({
  ids,
  nodeById,
  meta,
  tradition,
  lang,
  notes,
  onPick,
}: RelationListProps): React.JSX.Element {
  return (
    <ul className="relation-list">
      {ids.map((id) => {
        const node = nodeById.get(id);
        const colour = node?.category === undefined ? undefined : meta.categories[node.category]?.color;

        return (
          <li key={id}>
            <button
              type="button"
              className="relation"
              style={{ '--swatch': colour } as React.CSSProperties}
              onClick={() => onPick(id)}
            >
              <span className="relation__dot" aria-hidden="true" />
              <span className="relation__name">{nameOf(node, tradition, lang)}</span>
              {notes?.get(id) !== undefined && <span className="relation__note">{notes.get(id)}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

interface SidePanelProps {
  readonly figureId: string;
  readonly node: GraphNode;
  readonly index: GraphIndex;
  readonly partners: readonly PartnerLink[];
  readonly nameIndex: NameIndex;
  readonly meta: Meta;
  readonly tradition: Tradition;
  readonly lang: Lang;
  readonly texts: Texts;
  readonly onPick: (figureId: string) => void;
  readonly onClose: () => void;
}

export function SidePanel({
  figureId,
  node,
  index,
  partners,
  nameIndex,
  meta,
  tradition,
  lang,
  texts,
  onPick,
  onClose,
}: SidePanelProps): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('overview');
  const { figure, failed } = useFigureDetail(figureId, node.category);

  useEffect(() => {
    setTab('overview');
  }, [figureId]);

  const aspect = figure === undefined || figure === null ? undefined : aspectOf(figure, tradition);
  const other = figure === null ? undefined : otherAspectOf(figure, tradition);
  const missingCounterpart = !existsIn(node, tradition);
  const categoryColour = node.category === undefined ? undefined : meta.categories[node.category]?.color;

  const tabs: readonly { id: Tab; label: string }[] = [
    { id: 'overview', label: texts.panelOverview },
    { id: 'family', label: texts.panelFamily },
    { id: 'sources', label: texts.panelSources },
  ];

  return (
    <aside className="panel" aria-label={nameOf(node, tradition, lang)}>
      <div className="panel__head">
        <div className="panel__names">
          <h2 className="panel__name">{nameOf(node, tradition, lang)}</h2>
          {aspect?.nameOriginal !== undefined && (
            <p className="panel__name-original">{aspect.nameOriginal}</p>
          )}
          {other?.name !== undefined && (
            <p className="panel__other-name">
              {tradition === 'greek' ? texts.traditionRoman : texts.traditionGreek}: {other.name[lang]}
            </p>
          )}

          <div className="panel__badges">
            {node.category !== undefined && (
              <span
                className="badge badge--category"
                style={{ '--swatch': categoryColour } as React.CSSProperties}
              >
                {meta.categories[node.category]?.label[lang] ?? node.category}
              </span>
            )}
            {node.confidence !== undefined && (
              <span className="badge">{texts.confidence[node.confidence]}</span>
            )}
            {missingCounterpart && (
              <span className="badge badge--warn">
                {tradition === 'greek' ? texts.onlyRoman : texts.onlyGreek}
              </span>
            )}
          </div>
        </div>

        <button type="button" className="panel__close" aria-label={texts.panelClose} onClick={onClose}>
          &times;
        </button>
      </div>

      <div className="panel__tabs" role="tablist">
        {tabs.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            className="panel__tab"
            aria-selected={tab === entry.id}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="panel__content" role="tabpanel">
        {failed && <p className="panel__empty">{texts.loadingFailed}</p>}
        {!failed && figure === null && <p className="panel__empty">{texts.loading}</p>}

        {figure !== null && tab === 'overview' && (
          <OverviewTab
            figure={figure}
            tradition={tradition}
            lang={lang}
            meta={meta}
            texts={texts}
            nameIndex={nameIndex}
            onPick={onPick}
          />
        )}

        {figure !== null && tab === 'family' && (
          <FamilyTab
            figure={figure}
            index={index}
            partners={partners}
            meta={meta}
            tradition={tradition}
            lang={lang}
            texts={texts}
            nameIndex={nameIndex}
            onPick={onPick}
          />
        )}

        {figure !== null && tab === 'sources' && (
          <SourcesTab
            figure={figure}
            nodeById={index.nodeById}
            meta={meta}
            tradition={tradition}
            lang={lang}
            texts={texts}
            nameIndex={nameIndex}
            onPick={onPick}
          />
        )}
      </div>
    </aside>
  );
}

interface OverviewTabProps {
  readonly figure: Figure;
  readonly tradition: Tradition;
  readonly lang: Lang;
  readonly meta: Meta;
  readonly texts: Texts;
  readonly nameIndex: NameIndex;
  readonly onPick: (figureId: string) => void;
}

function OverviewTab({
  figure,
  tradition,
  lang,
  meta,
  texts,
  nameIndex,
  onPick,
}: OverviewTabProps): React.JSX.Element {
  // Fehlt das Gegenstueck, zeigen wir die vorhandene Sicht - eine leere Seite
  // waere die schlechtere Antwort als ein Hinweis samt Beschreibung.
  const aspect = aspectOf(figure, tradition) ?? otherAspectOf(figure, tradition);
  if (aspect === undefined) return <p className="panel__empty">{texts.noRelations}</p>;

  const domains = aspect.domains.map((key) => meta.domains[key]?.[lang] ?? key);

  return (
    <>
      <Prose
        text={aspect.description[lang]}
        nameIndex={nameIndex}
        selfId={figure.id}
        onPick={onPick}
      />

      <Field label={texts.domainsLabel}>
        <Chips items={domains} />
      </Field>

      {aspect.symbols !== undefined && (
        <Field label={texts.symbolsLabel}>
          <Chips items={aspect.symbols[lang]} />
        </Field>
      )}

      {aspect.altNames !== undefined && aspect.altNames.length > 0 && (
        <Field label={texts.altNamesLabel}>
          <Chips items={aspect.altNames} />
        </Field>
      )}

      {aspect.epithets !== undefined && aspect.epithets.length > 0 && (
        <Field label={texts.epithetsLabel}>
          <ul className="relation-list">
            {aspect.epithets.map((epithet) => (
              <li key={epithet.name} className="relation">
                <span className="relation__name">{epithet.name}</span>
                {epithet.meaning !== undefined && (
                  <span className="relation__note">{epithet.meaning[lang]}</span>
                )}
              </li>
            ))}
          </ul>
        </Field>
      )}

      {aspect.cultNotes !== undefined && (
        <Field label={texts.cultLabel}>
          <Prose
            text={aspect.cultNotes[lang]}
            nameIndex={nameIndex}
            selfId={figure.id}
            onPick={onPick}
          />
        </Field>
      )}

      {aspect.festivals !== undefined && aspect.festivals.length > 0 && (
        <Field label={texts.festivalsLabel}>
          <Chips items={aspect.festivals} />
        </Field>
      )}
    </>
  );
}

interface FamilyTabProps {
  readonly figure: Figure;
  readonly index: GraphIndex;
  readonly partners: readonly PartnerLink[];
  readonly meta: Meta;
  readonly tradition: Tradition;
  readonly lang: Lang;
  readonly texts: Texts;
  readonly nameIndex: NameIndex;
  readonly onPick: (figureId: string) => void;
}

/** Ehen zuerst, dann Liebschaften, dann alles Uebrige - so wird die Liste gelesen. */
const RELATIONSHIP_ORDER: readonly RelationshipType[] = [
  'marriage',
  'consort',
  'liaison',
  'abduction',
  'unknown',
];

function FamilyTab({
  figure,
  index,
  partners,
  meta,
  tradition,
  lang,
  texts,
  nameIndex,
  onPick,
}: FamilyTabProps): React.JSX.Element {
  const { nodeById } = index;
  const parents = sortByName(index.parentsOf(figure.id), nodeById, tradition, lang);
  const siblings = sortByName(siblingsOf(index, figure.id), nodeById, tradition, lang);
  const children = sortByName(index.childrenOf(figure.id), nodeById, tradition, lang);

  const links = partnerLinksOf(partners, figure.id).sort(
    (a, b) =>
      RELATIONSHIP_ORDER.indexOf(a.link.type) - RELATIONSHIP_ORDER.indexOf(b.link.type) ||
      nameOf(nodeById.get(a.partner), tradition, lang).localeCompare(
        nameOf(nodeById.get(b.partner), tradition, lang),
        lang,
      ),
  );

  const partnerNotes = new Map<string, string>();
  for (const entry of links) {
    const kind = `${RELATIONSHIP_SYMBOLS[entry.link.type]} ${texts.relationshipType[entry.link.type]}`;
    partnerNotes.set(
      entry.partner,
      entry.link.children > 0 ? `${kind} · ${texts.childrenTogether(entry.link.children)}` : kind,
    );
  }

  const counterpartNotes = new Map<string, string>();
  for (const counterpart of figure.counterparts ?? []) {
    counterpartNotes.set(counterpart.figure, texts.counterpartRelation[counterpart.relation]);
  }
  const counterparts = sortByName([...counterpartNotes.keys()], nodeById, tradition, lang);

  const empty =
    parents.length === 0 &&
    siblings.length === 0 &&
    children.length === 0 &&
    links.length === 0 &&
    counterparts.length === 0;

  if (empty) return <p className="panel__empty">{texts.noRelations}</p>;

  const sections: readonly { label: string; ids: string[]; notes?: Map<string, string> }[] = [
    { label: texts.parentsLabel, ids: parents },
    { label: texts.siblingsLabel, ids: siblings },
    {
      label: texts.partnersLabel,
      ids: links.map((entry) => entry.partner),
      notes: partnerNotes,
    },
    { label: texts.childrenLabel, ids: children },
    { label: texts.counterpartsLabel, ids: counterparts, notes: counterpartNotes },
  ];

  return (
    <>
      {sections
        .filter((section) => section.ids.length > 0)
        .map((section) => (
          <Field key={section.label} label={`${section.label} (${section.ids.length})`}>
            <RelationList
              ids={section.ids}
              nodeById={nodeById}
              meta={meta}
              tradition={tradition}
              lang={lang}
              {...(section.notes === undefined ? {} : { notes: section.notes })}
              onPick={onPick}
            />
          </Field>
        ))}

      {(figure.counterparts ?? []).some((entry) => entry.note !== undefined) && (
        <Field label={texts.counterpartsLabel}>
          {(figure.counterparts ?? [])
            .filter((entry) => entry.note !== undefined)
            .map((entry) => (
              <Prose
                key={entry.figure}
                text={entry.note?.[lang] ?? ''}
                nameIndex={nameIndex}
                selfId={figure.id}
                onPick={onPick}
              />
            ))}
        </Field>
      )}
    </>
  );
}

interface SourcesTabProps {
  readonly figure: Figure;
  readonly nodeById: ReadonlyMap<string, GraphNode>;
  readonly meta: Meta;
  readonly tradition: Tradition;
  readonly lang: Lang;
  readonly texts: Texts;
  readonly nameIndex: NameIndex;
  readonly onPick: (figureId: string) => void;
}

function SourcesTab({
  figure,
  nodeById,
  meta,
  tradition,
  lang,
  texts,
  nameIndex,
  onPick,
}: SourcesTabProps): React.JSX.Element {
  const byRank = [...figure.parentage].sort(
    (a, b) => Number(b.canonical) - Number(a.canonical),
  );

  const parentNames = (variant: ParentageVariant): string =>
    variant.parents.length === 0
      ? '—'
      : variant.parents.map((id) => nameOf(nodeById.get(id), tradition, lang)).join(' · ');

  const links = Object.entries(figure.refs ?? {}).filter(([, url]) => typeof url === 'string');

  return (
    <>
      {byRank.map((variant) => (
        <div key={variant.id} className="source-entry">
          <div className="source-entry__head">
            <span
              className={
                variant.canonical
                  ? 'source-entry__kind source-entry__kind--leading'
                  : 'source-entry__kind'
              }
            >
              {variant.canonical ? texts.leadingVersion : texts.variantVersion}
            </span>
            <span className="source-entry__parents">{parentNames(variant)}</span>
          </div>

          <p className="source-entry__mode">
            {texts.parentageMode[variant.mode]} · {texts.confidence[variant.confidence]}
          </p>

          <p className="source-entry__cite">
            {variant.sources.map((reference) => formatSource(reference, meta, lang)).join(' · ')}
          </p>

          {variant.note !== undefined && (
            <Prose
              text={variant.note[lang]}
              nameIndex={nameIndex}
              selfId={figure.id}
              onPick={onPick}
              className="source-entry__note"
            />
          )}
        </div>
      ))}

      {(aspectOf(figure, tradition)?.sources ?? []).length > 0 && (
        <Field label={texts.panelSources}>
          <p className="source-entry__cite">
            {(aspectOf(figure, tradition)?.sources ?? [])
              .map((reference) => formatSource(reference, meta, lang))
              .join(' · ')}
          </p>
        </Field>
      )}

      {links.length > 0 && (
        <Field label={texts.externalLinks}>
          <ul className="link-list">
            {links.map(([key, url]) => (
              <li key={key}>
                <a href={String(url)} target="_blank" rel="noreferrer noopener">
                  {key.replace('wikipedia', 'Wikipedia ').replace('theoi', 'Theoi')}
                </a>
              </li>
            ))}
          </ul>
        </Field>
      )}
    </>
  );
}
