import { describe, expect, it } from 'vitest';
import type { GraphData, GraphEdge, GraphNode } from '../types/runtime.ts';
import type { PartnerLink } from '../types/runtime.ts';
import {
  ancestorsOf,
  buildIndex,
  computeBridges,
  descendantsOf,
  fullSiblingsOf,
  neighbourhoodOf,
  partnerLinksOf,
  siblingsOf,
} from './model.ts';

/**
 * Baut einen Testgraphen aus einer Kurzschreibweise: `'kind: elternteil, elternteil'`.
 * Die Verbindungsknoten entstehen dabei genauso wie in der Aufbereitung.
 */
function graphOf(descent: Record<string, string[]>): GraphData {
  const figureIds = new Set<string>(Object.keys(descent));
  for (const parents of Object.values(descent)) {
    for (const parent of parents) figureIds.add(parent);
  }

  const nodes: GraphNode[] = [...figureIds].map((id) => ({ id, kind: 'figure', tier: 0 }));
  const edges: GraphEdge[] = [];
  const unions = new Map<string, string[]>();

  for (const [child, parents] of Object.entries(descent)) {
    if (parents.length === 0) continue;
    const unionId = `u:${[...parents].sort().join('+')}`;
    const existing = unions.get(unionId);
    if (existing === undefined) unions.set(unionId, [child]);
    else existing.push(child);
  }

  for (const [unionId, children] of unions) {
    const parents = unionId.slice(2).split('+');
    nodes.push({ id: unionId, kind: 'union', tier: 0, parents });
    for (const parent of parents) {
      edges.push({ id: `p:${parent}->${unionId}`, source: parent, target: unionId, kind: 'canonical' });
    }
    for (const child of children) {
      edges.push({ id: `c:${unionId}->${child}`, source: unionId, target: child, kind: 'canonical' });
    }
  }

  return { nodes, edges, partners: [] };
}

describe('buildIndex', () => {
  it('löst Eltern und Kinder über die Verbindungsknoten hinweg auf', () => {
    const index = buildIndex(graphOf({ zeus: ['kronos', 'rheia'], hera: ['kronos', 'rheia'] }));

    expect(new Set(index.parentsOf('zeus'))).toEqual(new Set(['kronos', 'rheia']));
    expect(new Set(index.childrenOf('kronos'))).toEqual(new Set(['zeus', 'hera']));
    expect(index.parentsOf('kronos')).toEqual([]);
  });

  it('führt Verbindungsknoten nicht als Figuren', () => {
    const index = buildIndex(graphOf({ zeus: ['kronos', 'rheia'] }));
    expect(index.figureIds).not.toContain('u:kronos+rheia');
    expect(new Set(index.figureIds)).toEqual(new Set(['zeus', 'kronos', 'rheia']));
  });

  it('erkennt Elternschaft aus nur einem Elternteil', () => {
    const index = buildIndex(graphOf({ hephaistos: ['hera'] }));
    expect(index.parentsOf('hephaistos')).toEqual(['hera']);
    expect(index.childrenOf('hera')).toEqual(['hephaistos']);
  });
});

describe('ancestorsOf und descendantsOf', () => {
  const index = buildIndex(
    graphOf({
      uranos: ['gaia'],
      kronos: ['gaia', 'uranos'],
      zeus: ['kronos', 'rheia'],
      athena: ['zeus', 'metis'],
    }),
  );

  it('begrenzt die Vorfahren auf die angegebene Generationstiefe', () => {
    expect(ancestorsOf(index, 'athena', 1)).toEqual(new Set(['zeus', 'metis']));
    expect(ancestorsOf(index, 'athena', 2)).toEqual(new Set(['zeus', 'metis', 'kronos', 'rheia']));
  });

  it('liefert bei unbegrenzter Tiefe die ganze Ahnenreihe', () => {
    expect(ancestorsOf(index, 'athena', Number.POSITIVE_INFINITY)).toEqual(
      new Set(['zeus', 'metis', 'kronos', 'rheia', 'gaia', 'uranos']),
    );
  });

  it('begrenzt die Nachkommen ebenso', () => {
    expect(descendantsOf(index, 'gaia', 1)).toEqual(new Set(['uranos', 'kronos']));
    expect(descendantsOf(index, 'gaia', 2)).toEqual(new Set(['uranos', 'kronos', 'zeus']));
  });

  it('nimmt die Ausgangsfigur nicht in das Ergebnis auf', () => {
    expect(ancestorsOf(index, 'zeus', Number.POSITIVE_INFINITY)).not.toContain('zeus');
  });
});

describe('siblingsOf', () => {
  it('findet Geschwister über beide Elternteile', () => {
    const index = buildIndex(
      graphOf({ zeus: ['kronos', 'rheia'], hera: ['kronos', 'rheia'], hades: ['kronos', 'rheia'] }),
    );
    expect(siblingsOf(index, 'zeus')).toEqual(new Set(['hera', 'hades']));
  });

  it('liefert nichts für eine Figur ohne Eltern', () => {
    expect(siblingsOf(buildIndex(graphOf({ chaos: [] })), 'chaos')).toEqual(new Set());
  });
});

describe('fullSiblingsOf', () => {
  const index = buildIndex(
    graphOf({
      // Uranos hat Kinder aus zwei Verbindungen: mit Gaia die Titanen,
      // aus sich allein Aphrodite. Halbgeschwister zaehlen hier nicht.
      kronos: ['gaia', 'uranos'],
      rheia: ['gaia', 'uranos'],
      aphrodite: ['uranos'],
    }),
  );

  it('zählt nur Kinder derselben Elternverbindung', () => {
    expect(fullSiblingsOf(index, 'kronos')).toEqual(new Set(['rheia']));
  });

  it('lässt Halbgeschwister aus anderen Verbindungen weg', () => {
    expect(fullSiblingsOf(index, 'aphrodite')).toEqual(new Set());
    expect(siblingsOf(index, 'aphrodite')).toEqual(new Set(['kronos', 'rheia']));
  });

  it('liefert nichts für eine Figur ohne Eltern', () => {
    expect(fullSiblingsOf(index, 'gaia')).toEqual(new Set());
  });
});

describe('computeBridges', () => {
  it('überbrückt eine einzelne ausgeblendete Zwischengeneration', () => {
    const index = buildIndex({ ...graphOf({ mitte: ['oben'], unten: ['mitte'] }) });
    const bridges = computeBridges(index, new Set(['oben', 'unten']));

    expect(bridges).toHaveLength(1);
    expect(bridges[0]).toMatchObject({ source: 'oben', target: 'unten', via: ['mitte'] });
  });

  it('überbrückt mehrere ausgeblendete Generationen und nennt den Weg', () => {
    const index = buildIndex(graphOf({ b: ['a'], c: ['b'], d: ['c'] }));
    const bridges = computeBridges(index, new Set(['a', 'd']));

    expect(bridges).toHaveLength(1);
    expect(bridges[0]?.source).toBe('a');
    expect(bridges[0]?.target).toBe('d');
    expect(bridges[0]?.via).toEqual(['c', 'b']);
  });

  it('erzeugt keine Brücke, wenn der Elternteil sichtbar ist', () => {
    const index = buildIndex(graphOf({ kind: ['elternteil'] }));
    expect(computeBridges(index, new Set(['elternteil', 'kind']))).toEqual([]);
  });

  it('überbrückt nur den ausgeblendeten von zwei Elternteilen', () => {
    const index = buildIndex(graphOf({ kind: ['sichtbar', 'verborgen'], verborgen: ['ahn'] }));
    const bridges = computeBridges(index, new Set(['sichtbar', 'kind', 'ahn']));

    expect(bridges).toHaveLength(1);
    expect(bridges[0]).toMatchObject({ source: 'ahn', target: 'kind', via: ['verborgen'] });
  });

  it('führt zwei Wege zum selben Vorfahren nur einmal auf', () => {
    const index = buildIndex(graphOf({ links: ['ahn'], rechts: ['ahn'], kind: ['links', 'rechts'] }));
    const bridges = computeBridges(index, new Set(['ahn', 'kind']));

    expect(bridges).toHaveLength(1);
    expect(bridges[0]).toMatchObject({ source: 'ahn', target: 'kind' });
  });

  it('lässt eine Figur ohne sichtbaren Vorfahren unverbunden', () => {
    const index = buildIndex(graphOf({ kind: ['verborgen'] }));
    expect(computeBridges(index, new Set(['kind']))).toEqual([]);
  });
});

describe('partnerLinksOf', () => {
  const links: PartnerLink[] = [
    { id: 'r:aphrodite+hephaistos', a: 'aphrodite', b: 'hephaistos', type: 'marriage', children: 0 },
    { id: 'r:aphrodite+ares', a: 'aphrodite', b: 'ares', type: 'liaison', children: 0 },
    { id: 'r:hera+zeus', a: 'hera', b: 'zeus', type: 'marriage', children: 3 },
  ];

  it('findet Verbindungen unabhängig davon, auf welcher Seite die Figur steht', () => {
    expect(partnerLinksOf(links, 'aphrodite').map((e) => e.partner).sort()).toEqual([
      'ares',
      'hephaistos',
    ]);
    expect(partnerLinksOf(links, 'zeus').map((e) => e.partner)).toEqual(['hera']);
  });

  it('unterscheidet Ehe und Liebschaft', () => {
    const byPartner = new Map(partnerLinksOf(links, 'aphrodite').map((e) => [e.partner, e.link.type]));
    expect(byPartner.get('hephaistos')).toBe('marriage');
    expect(byPartner.get('ares')).toBe('liaison');
  });

  it('liefert nichts für eine Figur ohne Verbindungen', () => {
    expect(partnerLinksOf(links, 'hestia')).toEqual([]);
  });
});

describe('neighbourhoodOf', () => {
  const index = buildIndex(
    graphOf({
      kronos: ['gaia', 'uranos'],
      zeus: ['kronos', 'rheia'],
      hera: ['kronos', 'rheia'],
      ares: ['zeus', 'hera'],
    }),
  );
  const links: PartnerLink[] = [
    { id: 'r:hera+zeus', a: 'hera', b: 'zeus', type: 'marriage', children: 1 },
  ];

  it('umfasst Eltern, Kinder und Partner', () => {
    expect(neighbourhoodOf(index, links, 'zeus')).toEqual(
      new Set(['zeus', 'kronos', 'rheia', 'ares', 'hera']),
    );
  });

  it('lässt Großeltern und Geschwister weg - sie sind nicht unmittelbar verbunden', () => {
    const near = neighbourhoodOf(index, [], 'zeus');
    expect(near.has('gaia')).toBe(false);
    expect(near.has('uranos')).toBe(false);
    expect(near.has('hera')).toBe(false);
  });

  it('nimmt die Figur selbst mit auf, damit sie nicht abgedunkelt wird', () => {
    expect(neighbourhoodOf(index, [], 'ares').has('ares')).toBe(true);
  });
});
