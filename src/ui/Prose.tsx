import { Fragment, useMemo } from 'react';
import type { NameIndex } from './nameLinks.ts';
import { linkNames } from './nameLinks.ts';

/**
 * Fliesstext, in dem genannte Gottheiten anklickbar sind.
 *
 * Der Verweis fuehrt zur genannten Figur, ohne dass der Text dafuer ausgezeichnet
 * werden muesste - die Namen werden beim Anzeigen erkannt.
 */

interface ProseProps {
  readonly text: string;
  readonly nameIndex: NameIndex;
  /** Die gerade geoeffnete Figur; ein Verweis auf sie selbst waere sinnlos. */
  readonly selfId?: string;
  readonly onPick: (figureId: string) => void;
  readonly className?: string;
}

export function Prose({
  text,
  nameIndex,
  selfId,
  onPick,
  className = 'prose',
}: ProseProps): React.JSX.Element {
  const segments = useMemo(
    () => linkNames(text, nameIndex, selfId),
    [text, nameIndex, selfId],
  );

  return (
    <p className={className}>
      {segments.map((segment, position) =>
        segment.figureId === undefined ? (
          <Fragment key={position}>{segment.text}</Fragment>
        ) : (
          <button
            key={position}
            type="button"
            className="prose-link"
            onClick={() => onPick(segment.figureId as string)}
          >
            {segment.text}
          </button>
        ),
      )}
    </p>
  );
}
