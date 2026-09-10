import { describe, expect, it } from 'vitest';
import type { GraphNode, SearchDoc } from '../types/runtime.ts';
import { buildNameIndex, linkNames } from './nameLinks.ts';

/** Kurzschreibweise: gleiche Schreibung in beiden Sprachen, sofern nichts anderes steht. */
function node(id: string, greek?: string, roman?: string, greekEn?: string): GraphNode {
  return {
    id,
    kind: 'figure',
    tier: 0,
    ...(greek === undefined ? {} : { greek: { de: greek, en: greekEn ?? greek } }),
    ...(roman === undefined ? {} : { roman: { de: roman, en: roman } }),
  };
}

function doc(id: string, names: string[]): SearchDoc {
  return { id, category: 'olympian', names, epithets: [], terms: [] };
}

const NODES: GraphNode[] = [
  node('zeus', 'Zeus', 'Iuppiter'),
  node('hera', 'Hera', 'Iuno'),
  node('hephaistos', 'Hephaistos', 'Vulcanus'),
  node('ares', 'Ares', 'Mars'),
  node('hemera', 'Hemera', 'Dies'),
  node('athena', 'Athena', 'Minerva'),
  node('pallas-titan', 'Pallas'),
];

const DOCS: SearchDoc[] = [doc('athena', ['Athena', 'Pallas Athene', 'Minerva'])];

const index = buildNameIndex(NODES, DOCS);

/** Nur die verlinkten Abschnitte, als 'Text->kennung'. */
function links(text: string, selfId?: string): string[] {
  return linkNames(text, index, selfId)
    .filter((segment) => segment.figureId !== undefined)
    .map((segment) => `${segment.text}->${segment.figureId}`);
}

describe('buildNameIndex', () => {
  it('nimmt griechische und römische Namen auf', () => {
    expect(index.byName.get('Zeus')).toBe('zeus');
    expect(index.byName.get('Iuppiter')).toBe('zeus');
  });

  it('nimmt weitere Namen aus dem Suchindex auf', () => {
    expect(index.byName.get('Pallas Athene')).toBe('athena');
  });

  it('lässt Namen aus, die zu häufig gewöhnliche Wörter sind', () => {
    expect(index.byName.has('Dies')).toBe(false);
  });

  it('lässt sehr kurze Namen aus', () => {
    const kurz = buildNameIndex([node('gaia', 'Ge')], []);
    expect(kurz.byName.has('Ge')).toBe(false);
  });

  it('verwirft mehrdeutige Namen, statt zu raten', () => {
    const doppelt = buildNameIndex([node('eins', 'Iris'), node('zwei', 'Iris')], []);
    expect(doppelt.byName.has('Iris')).toBe(false);
  });
});

describe('linkNames', () => {
  it('erkennt einen Namen im Fließtext', () => {
    expect(links('Sie ist mit Hephaistos verheiratet.')).toEqual(['Hephaistos->hephaistos']);
  });

  it('erkennt mehrere Namen und behält den Text dazwischen', () => {
    const segments = linkNames('Zeus und Hera streiten.', index);
    expect(segments.map((s) => s.text).join('')).toBe('Zeus und Hera streiten.');
    expect(segments.filter((s) => s.figureId !== undefined)).toHaveLength(2);
  });

  it('erkennt die deutsche Genitivform', () => {
    expect(links('Heras Zorn trifft sie.')).toEqual(['Heras->hera']);
  });

  it('erkennt die englische Genitivform', () => {
    expect(links("Hera's wrath.")).toEqual(["Hera's->hera"]);
  });

  it('erkennt den Genitiv bei Namen auf -s', () => {
    expect(links("Zeus' Blitz.")).toEqual(["Zeus'->zeus"]);
  });

  it('verlinkt die geöffnete Gottheit nicht auf sich selbst', () => {
    expect(links('Ares liebt Aphrodite, sagt Ares.', 'ares')).toEqual([]);
  });

  it('greift den längeren Namen, wenn zwei sich überschneiden', () => {
    expect(links('Nicht zu verwechseln mit Pallas Athene.')).toEqual(['Pallas Athene->athena']);
  });

  it('verlinkt keine Wortteile', () => {
    expect(links('Der Heraklesmythos und die Marsmission.')).toEqual([]);
  });

  it('lässt Text ohne Namen unverändert', () => {
    const segments = linkNames('Ein Satz ganz ohne Gottheiten.', index);
    expect(segments).toEqual([{ text: 'Ein Satz ganz ohne Gottheiten.' }]);
  });

  it('gibt den Text immer vollständig zurück', () => {
    const text = "Zeus, Heras Gatte, und Ares - beide gegen Hephaistos' Netz.";
    expect(linkNames(text, index).map((s) => s.text).join('')).toBe(text);
  });
});
