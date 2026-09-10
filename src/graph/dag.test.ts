import { describe, expect, it } from 'vitest';
import { collectNodes, collectReachable, findCycle, invert } from './dag.ts';

function adjacency(entries: Record<string, string[]>): Map<string, string[]> {
  return new Map(Object.entries(entries));
}

describe('findCycle', () => {
  it('erkennt einen zyklenfreien Graphen', () => {
    expect(findCycle(adjacency({ a: ['b'], b: ['c'], c: [] }))).toBeNull();
  });

  it('findet einen unmittelbaren Kreis und gibt den Pfad zurück', () => {
    expect(findCycle(adjacency({ a: ['b'], b: ['a'] }))).toEqual(['a', 'b', 'a']);
  });

  it('findet einen längeren Kreis', () => {
    const cycle = findCycle(adjacency({ a: ['b'], b: ['c'], c: ['a'], d: ['a'] }));
    expect(cycle).not.toBeNull();
    expect(cycle![0]).toBe(cycle![cycle!.length - 1]);
    expect(new Set(cycle)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('meldet eine Figur, die ihr eigener Vorfahre ist', () => {
    expect(findCycle(adjacency({ a: ['a'] }))).toEqual(['a', 'a']);
  });

  it('bleibt bei einer sehr tiefen Kette ohne Stapelüberlauf', () => {
    const deep: Record<string, string[]> = {};
    const length = 50_000;
    for (let i = 0; i < length; i += 1) deep[`n${i}`] = [`n${i + 1}`];
    deep[`n${length}`] = [];

    expect(findCycle(adjacency(deep))).toBeNull();
  });
});

describe('collectNodes', () => {
  it('erfasst auch Knoten, die nur als Kantenziel vorkommen', () => {
    expect(new Set(collectNodes(adjacency({ a: ['b'] })))).toEqual(new Set(['a', 'b']));
  });
});

describe('collectReachable', () => {
  it('liefert alle erreichbaren Knoten ohne den Startknoten', () => {
    const graph = adjacency({ a: ['b', 'c'], b: ['d'], c: ['d'], d: [] });
    expect(collectReachable(graph, 'a')).toEqual(new Set(['b', 'c', 'd']));
  });

  it('liefert eine leere Menge für einen Knoten ohne ausgehende Kanten', () => {
    expect(collectReachable(adjacency({ a: [] }), 'a')).toEqual(new Set());
  });
});

describe('invert', () => {
  it('dreht die Kantenrichtung um', () => {
    const inverted = invert(adjacency({ a: ['b'], b: ['c'] }));
    expect(inverted.get('b')).toEqual(['a']);
    expect(inverted.get('c')).toEqual(['b']);
    expect(inverted.get('a')).toEqual([]);
  });
});
