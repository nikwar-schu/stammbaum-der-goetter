import Fuse from 'fuse.js';
import type { IFuseOptions } from 'fuse.js';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Lang, Tradition } from '../schema/constants.ts';
import type { GraphNode, Meta, SearchDoc } from '../types/runtime.ts';
import type { Texts } from '../i18n/texts.ts';
import { nameOf } from './display.ts';

/**
 * Unscharfe Suche ueber beide Sichten und beide Sprachen.
 *
 * Sie findet ueber Namen, Beinamen und Zustaendigkeiten, weil man eine Gottheit
 * oft nicht ueber ihren Namen sucht, sondern ueber das, wofuer sie zustaendig
 * ist - "Blitz" soll zu Zeus fuehren.
 */

const MAX_RESULTS = 12;

const FUSE_OPTIONS: IFuseOptions<SearchDoc> = {
  threshold: 0.35,
  ignoreLocation: true,
  keys: [
    { name: 'names', weight: 3 },
    { name: 'epithets', weight: 1.5 },
    { name: 'terms', weight: 1 },
  ],
};

interface SearchBoxProps {
  readonly docs: readonly SearchDoc[];
  readonly nodeById: ReadonlyMap<string, GraphNode>;
  readonly meta: Meta;
  readonly tradition: Tradition;
  readonly lang: Lang;
  readonly texts: Texts;
  readonly onPick: (figureId: string) => void;
}

export function SearchBox({
  docs,
  nodeById,
  meta,
  tradition,
  lang,
  texts,
  onPick,
}: SearchBoxProps): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const fuse = useMemo(() => new Fuse([...docs], FUSE_OPTIONS), [docs]);

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed === '') return [];
    return fuse.search(trimmed, { limit: MAX_RESULTS }).map((hit) => hit.item);
  }, [fuse, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const choose = (figureId: string): void => {
    onPick(figureId);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (results.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const chosen = results[activeIndex];
      if (chosen !== undefined) choose(chosen.id);
    }
  };

  const showResults = open && query.trim() !== '';

  return (
    <div className="search">
      <div className="search__field">
        <input
          ref={inputRef}
          className="search__input"
          type="search"
          role="combobox"
          aria-expanded={showResults}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={texts.searchPlaceholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={onInputKeyDown}
        />
        <span className="search__hint">{texts.searchHint}</span>
      </div>

      {showResults && (
        <ul className="search__results" id={listId} role="listbox">
          {results.length === 0 && <li className="search__empty">{texts.searchNoResults}</li>}

          {results.map((doc, index) => (
            <li key={doc.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className="search__result"
                data-active={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(doc.id)}
              >
                <span className="search__result-name">{nameOf(nodeById.get(doc.id), tradition)}</span>
                <span className="search__result-meta">
                  {meta.categories[doc.category]?.label[lang] ?? doc.category}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
