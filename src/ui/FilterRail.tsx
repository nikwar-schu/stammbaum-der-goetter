import type { Category, Lang } from '../schema/constants.ts';
import { CATEGORIES } from '../schema/constants.ts';
import type { Meta } from '../types/runtime.ts';
import type { Texts } from '../i18n/texts.ts';
import { MAX_DEPTH, MIN_DEPTH, type ViewMode } from '../state/url.ts';

interface FilterRailProps {
  readonly texts: Texts;
  readonly lang: Lang;
  readonly meta: Meta;
  readonly counts: ReadonlyMap<Category, number>;
  readonly hiddenCategories: readonly Category[];
  readonly view: ViewMode;
  readonly depth: number;
  readonly open: boolean;
  readonly onToggleCategory: (category: Category) => void;
  readonly onSetHidden: (categories: readonly Category[]) => void;
  readonly onDepth: (depth: number) => void;
  readonly onOutline: () => void;
}

export function FilterRail({
  texts,
  lang,
  meta,
  counts,
  hiddenCategories,
  view,
  depth,
  open,
  onToggleCategory,
  onSetHidden,
  onDepth,
  onOutline,
}: FilterRailProps): React.JSX.Element {
  const hidden = new Set(hiddenCategories);
  const present = CATEGORIES.filter((category) => (counts.get(category) ?? 0) > 0).sort(
    (a, b) => (meta.categories[a]?.order ?? 0) - (meta.categories[b]?.order ?? 0),
  );

  return (
    <nav className={open ? 'rail rail--open' : 'rail'} aria-label={texts.categoriesLabel}>
      {view === 'focus' && (
        <section>
          <div className="rail__section-head">
            <h2 className="rail__title">{texts.depthLabel}</h2>
          </div>
          <div className="depth">
            <button
              type="button"
              className="depth__button"
              aria-label={texts.depthDecrease}
              disabled={depth <= MIN_DEPTH}
              onClick={() => onDepth(depth - 1)}
            >
              &minus;
            </button>
            <span className="depth__value">{texts.generations(depth)}</span>
            <button
              type="button"
              className="depth__button"
              aria-label={texts.depthIncrease}
              disabled={depth >= MAX_DEPTH}
              onClick={() => onDepth(depth + 1)}
            >
              +
            </button>
          </div>
        </section>
      )}

      <section>
        <div className="rail__section-head">
          <h2 className="rail__title">{texts.categoriesLabel}</h2>
          <div className="rail__bulk">
            <button type="button" onClick={() => onSetHidden([])}>
              {texts.selectAll}
            </button>
            <button type="button" onClick={() => onSetHidden(present)}>
              {texts.selectNone}
            </button>
          </div>
        </div>

        <ul className="rail__list">
          {present.map((category) => {
            const info = meta.categories[category];
            return (
              <li key={category}>
                <button
                  type="button"
                  className="category"
                  aria-pressed={!hidden.has(category)}
                  style={{ '--swatch': info?.color } as React.CSSProperties}
                  onClick={() => onToggleCategory(category)}
                >
                  <span className="category__swatch" aria-hidden="true" />
                  <span className="category__name">{info?.label[lang] ?? category}</span>
                  <span className="category__count">{counts.get(category) ?? 0}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <p className="rail__note">{texts.bridgeNotice}</p>
        <button type="button" className="rail__link" onClick={onOutline}>
          {texts.outlineTitle}
        </button>
      </section>
    </nav>
  );
}
