import type { Lang, Tradition } from '../schema/constants.ts';
import { LANGUAGES } from '../schema/constants.ts';
import type { GraphNode, Meta, SearchDoc } from '../types/runtime.ts';
import type { Texts } from '../i18n/texts.ts';
import type { ViewMode } from '../state/url.ts';
import { SearchBox } from './SearchBox.tsx';

interface SegmentedProps<T extends string> {
  readonly label: string;
  readonly options: readonly { value: T; label: string }[];
  readonly value: T;
  readonly onChange: (value: T) => void;
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedProps<T>): React.JSX.Element {
  return (
    <div className="control">
      <span className="control__label">{label}</span>
      <div className="segmented" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="segmented__option"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface HeaderProps {
  readonly texts: Texts;
  readonly lang: Lang;
  readonly tradition: Tradition;
  readonly view: ViewMode;
  readonly showVariants: boolean;
  readonly railOpen: boolean;
  readonly docs: readonly SearchDoc[];
  readonly nodeById: ReadonlyMap<string, GraphNode>;
  readonly meta: Meta;
  readonly onTradition: (tradition: Tradition) => void;
  readonly onLang: (lang: Lang) => void;
  readonly onView: (view: ViewMode) => void;
  readonly onToggleVariants: () => void;
  readonly onPick: (figureId: string) => void;
  readonly onToggleRail: () => void;
}

export function Header({
  texts,
  lang,
  tradition,
  view,
  showVariants,
  railOpen,
  docs,
  nodeById,
  meta,
  onTradition,
  onLang,
  onView,
  onToggleVariants,
  onPick,
  onToggleRail,
}: HeaderProps): React.JSX.Element {
  return (
    <header className="header">
      <div className="header__brand">
        <h1 className="header__title">{texts.appTitle}</h1>
        <p className="header__subtitle">{texts.appSubtitle}</p>
      </div>

      <SearchBox
        docs={docs}
        nodeById={nodeById}
        meta={meta}
        tradition={tradition}
        lang={lang}
        texts={texts}
        onPick={onPick}
      />

      <div className="header__controls">
        <div className="control">
          <span className="control__label">{texts.categoriesLabel}</span>
          <div className="segmented">
            <button
              type="button"
              className="segmented__option"
              aria-pressed={railOpen}
              onClick={onToggleRail}
            >
              <span className="toggle__mark toggle__mark--list" aria-hidden="true" />
              {texts.categoriesLabel}
            </button>
          </div>
        </div>

        <Segmented
          label={texts.traditionLabel}
          value={tradition}
          onChange={onTradition}
          options={[
            { value: 'greek', label: texts.traditionGreek },
            { value: 'roman', label: texts.traditionRoman },
          ]}
        />

        <Segmented
          label={texts.viewLabel}
          value={view}
          onChange={onView}
          options={[
            { value: 'focus', label: texts.viewFocus },
            { value: 'overview', label: texts.viewOverview },
          ]}
        />

        <div className="control">
          <span className="control__label">{texts.variantsLabel}</span>
          <div className="segmented">
            <button
              type="button"
              className="segmented__option"
              aria-pressed={showVariants}
              title={texts.variantsHint}
              onClick={onToggleVariants}
            >
              <span className="toggle__mark toggle__mark--dashed" aria-hidden="true" />
              {texts.variantsLabel}
            </button>
          </div>
        </div>

        <Segmented
          label={texts.languageLabel}
          value={lang}
          onChange={onLang}
          options={LANGUAGES.map((code) => ({ value: code, label: code.toUpperCase() }))}
        />
      </div>
    </header>
  );
}
