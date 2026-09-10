import type { StylesheetStyle } from 'cytoscape';
import { NODE_HEIGHT, NODE_WIDTH } from '../schema/constants.ts';

/**
 * Erscheinungsbild des Stammbaums.
 *
 * Zwei Punkte sind hier nicht Geschmack, sondern Voraussetzung:
 * die Kastengroesse ist fest (sonst wuerde der Wechsel von "Zeus" auf
 * "Iuppiter" die Kaesten umformen und wie ein Verrutschen wirken), und die
 * Sichtbarkeit laeuft ausschliesslich ueber Klassen - nie ueber das Entfernen
 * von Knoten, denn deren Koordinaten sollen unveraendert bleiben.
 */

export interface Theme {
  readonly nodeText: string;
  readonly nodeTextMuted: string;
  readonly edge: string;
  readonly edgeVariant: string;
  readonly edgeBridge: string;
  readonly union: string;
  readonly selection: string;
  readonly mixTarget: string;
  readonly mixAmount: number;
}

export const LIGHT_THEME: Theme = {
  nodeText: '#241f1a',
  nodeTextMuted: '#6b6259',
  edge: '#9c9086',
  edgeVariant: '#a8739a',
  edgeBridge: '#8a8f9c',
  union: '#b3a99f',
  selection: '#1f1b16',
  mixTarget: '#ffffff',
  mixAmount: 0.82,
};

export const DARK_THEME: Theme = {
  nodeText: '#f0e9e0',
  nodeTextMuted: '#a89f94',
  edge: '#6d635a',
  edgeVariant: '#b784ab',
  edgeBridge: '#7d8494',
  union: '#5d554d',
  selection: '#fbf7f1',
  mixTarget: '#1a1714',
  mixAmount: 0.68,
};

const HEX_LENGTH = 7;
const OPACITY_DIMMED = 0.12;
const OPACITY_MUTED = 0.45;

function channel(hex: string, offset: number): number {
  return Number.parseInt(hex.slice(offset, offset + 2), 16);
}

/** Mischt eine Farbe zum Zielton hin; `amount` 1 ergaebe reines Ziel. */
export function mix(hex: string, target: string, amount: number): string {
  if (hex.length !== HEX_LENGTH || target.length !== HEX_LENGTH) return hex;

  const blend = (offset: number): string => {
    const value = Math.round(channel(hex, offset) * (1 - amount) + channel(target, offset) * amount);
    return value.toString(16).padStart(2, '0');
  };

  return `#${blend(1)}${blend(3)}${blend(5)}`;
}

export function buildStylesheet(theme: Theme): StylesheetStyle[] {
  return [
    {
      selector: 'node[kind="figure"]',
      style: {
        shape: 'round-rectangle',
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        'background-color': 'data(fill)',
        'border-width': 2,
        'border-color': 'data(stroke)',
        label: 'data(label)',
        color: theme.nodeText,
        'font-size': 13,
        'font-family': 'Iowan Old Style, Palatino Linotype, Georgia, serif',
        'text-valign': 'center',
        'text-halign': 'center',
        'text-wrap': 'wrap',
        'text-max-width': `${NODE_WIDTH - 18}px`,
        'text-overflow-wrap': 'anywhere',
        'transition-property': 'opacity, border-width',
        'transition-duration': 180,
      },
    },
    {
      selector: 'node[kind="union"]',
      style: {
        shape: 'ellipse',
        width: 10,
        height: 10,
        'background-color': theme.union,
        'border-width': 0,
        label: '',
      },
    },
    {
      selector: 'edge[kind="canonical"]',
      style: {
        width: 1.6,
        'line-color': theme.edge,
        'curve-style': 'taxi',
        'taxi-direction': 'downward',
        'taxi-turn': 24,
        'taxi-turn-min-distance': 8,
        'target-arrow-shape': 'none',
        'transition-property': 'opacity',
        'transition-duration': 180,
      },
    },
    {
      selector: 'edge[kind="variant"]',
      style: {
        width: 1.4,
        'line-color': theme.edgeVariant,
        'line-style': 'dashed',
        'line-dash-pattern': [7, 5],
        'curve-style': 'unbundled-bezier',
        'control-point-distances': [46],
        'control-point-weights': [0.5],
        'target-arrow-shape': 'triangle',
        'target-arrow-color': theme.edgeVariant,
        'arrow-scale': 0.8,
      },
    },
    {
      selector: 'edge[kind="bridge"]',
      style: {
        width: 1.4,
        'line-color': theme.edgeBridge,
        'line-style': 'dotted',
        'curve-style': 'taxi',
        'taxi-direction': 'downward',
        'taxi-turn': 24,
        'target-arrow-shape': 'triangle',
        'target-arrow-color': theme.edgeBridge,
        'arrow-scale': 0.7,
      },
    },
    {
      selector: 'node.no-counterpart',
      style: {
        'border-style': 'dashed',
        color: theme.nodeTextMuted,
      },
    },
    {
      selector: 'node.selected',
      style: {
        'border-width': 4,
        'border-color': theme.selection,
        'z-index': 30,
      },
    },
    {
      selector: '.lineage',
      style: { 'z-index': 20 },
    },
    {
      selector: '.muted',
      style: { opacity: OPACITY_MUTED },
    },
    {
      selector: '.dimmed',
      style: { opacity: OPACITY_DIMMED, 'z-index': 1 },
    },
    {
      selector: '.out-of-view',
      style: { display: 'none' },
    },
  ];
}
