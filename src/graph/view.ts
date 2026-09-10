import cytoscape from 'cytoscape';
import type { Core, ElementDefinition, NodeSingular } from 'cytoscape';
import type { Category, Lang, Tradition } from '../schema/constants.ts';
import { RELATIONSHIP_SYMBOLS } from '../schema/constants.ts';
import { nameOf } from './naming.ts';
import type { GraphData, LayoutData, Meta } from '../types/runtime.ts';
import type { BridgeEdge } from './model.ts';
import type { Theme } from './style.ts';
import { buildStylesheet, mix } from './style.ts';

/**
 * Der Stammbaum als Zeichenflaeche.
 *
 * Cytoscape laeuft bewusst ausserhalb des React-Baums: React erzeugt einen
 * leeren Bereich, dieser Wrapper baut den Graphen einmal darin auf und
 * veraendert ihn danach nur noch gezielt. Wuerde React die hunderten Knoten
 * verwalten, waere jede Umschaltung ein vollstaendiger Neuaufbau.
 *
 * Knoten werden nie entfernt und nie verschoben - alle Schalter wirken
 * ausschliesslich ueber Klassen.
 */

const FIT_PADDING = 48;
const ANIMATION_MS = 320;
const MIN_ZOOM = 0.08;
const MAX_ZOOM = 2.5;

/**
 * Untergrenze fuer das selbsttaetige Einpassen.
 *
 * Die Verwandtschaft einer Figur kann im Stammbaum weit auseinanderliegen -
 * Zeus' Kinder verteilen sich ueber die halbe Breite. Wuerde der Ausschnitt sie
 * um jeden Preis alle zeigen, waeren die Namen nicht mehr zu lesen. Lieber ein
 * lesbarer Ausschnitt um die gewaehlte Figur; wer alles sehen will, hat den
 * Knopf zum Einpassen und kann verschieben.
 */
const MIN_AUTO_ZOOM = 0.62;

export interface TreeViewOptions {
  readonly container: HTMLElement;
  readonly graph: GraphData;
  readonly layout: LayoutData;
  readonly meta: Meta;
  readonly theme: Theme;
  readonly tradition: Tradition;
  readonly lang: Lang;
  readonly onSelect: (figureId: string | null) => void;
}

export interface VisibilityState {
  /** Figuren, die in der aktuellen Sicht ueberhaupt vorkommen. */
  readonly present: ReadonlySet<string>;
  /** Figuren, die zusaetzlich durch die Sachgruppenfilter ausgeblendet sind. */
  readonly filtered: ReadonlySet<string>;
  readonly bridges: readonly BridgeEdge[];
}

export class TreeView {
  readonly #cy: Core;
  readonly #graph: GraphData;
  readonly #meta: Meta;

  constructor(options: TreeViewOptions) {
    this.#graph = options.graph;
    this.#meta = options.meta;

    this.#cy = cytoscape({
      container: options.container,
      elements: this.#buildElements(options.layout, options.theme, options.tradition, options.lang),
      style: buildStylesheet(options.theme),
      layout: { name: 'preset' },
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      boxSelectionEnabled: false,
      autoungrabify: true,
      selectionType: 'single',
    });

    this.#cy.on('tap', 'node[kind="figure"]', (event) => {
      options.onSelect((event.target as NodeSingular).id());
    });

    this.#cy.on('tap', (event) => {
      if (event.target === this.#cy) options.onSelect(null);
    });
  }

  #buildElements(
    layout: LayoutData,
    theme: Theme,
    tradition: Tradition,
    lang: Lang,
  ): ElementDefinition[] {
    const elements: ElementDefinition[] = [];

    for (const node of this.#graph.nodes) {
      const position = layout.positions[node.id];
      if (position === undefined) continue;

      const colour = this.#categoryColour(node.category);
      elements.push({
        group: 'nodes',
        data: {
          id: node.id,
          kind: node.kind,
          category: node.category ?? '',
          label: nameOf(node, tradition, lang),
          fill: mix(colour, theme.mixTarget, theme.mixAmount),
          stroke: colour,
        },
        position: { x: position.x, y: position.y },
      });
    }

    const known = new Set(elements.map((element) => element.data.id));
    for (const edge of this.#graph.edges) {
      if (!known.has(edge.source) || !known.has(edge.target)) continue;
      elements.push({
        group: 'edges',
        data: { id: edge.id, source: edge.source, target: edge.target, kind: edge.kind },
      });
    }

    for (const link of this.#graph.partners) {
      if (!known.has(link.a) || !known.has(link.b)) continue;
      elements.push({
        group: 'edges',
        // Verborgen bis eine Figur gewaehlt ist; ab dann verwaltet allein
        // setHighlight diese Klasse. Zwei Stellen, die dieselbe Klasse setzen,
        // ueberschreiben einander je nach Reihenfolge der Aktualisierungen.
        classes: 'out-of-view',
        data: {
          id: link.id,
          source: link.a,
          target: link.b,
          kind: 'partner',
          relationship: link.type,
          symbol: RELATIONSHIP_SYMBOLS[link.type],
        },
      });
    }

    return elements;
  }

  #categoryColour(category: Category | undefined): string {
    if (category === undefined) return '#8c8c8c';
    return this.#meta.categories[category]?.color ?? '#8c8c8c';
  }

  setTheme(theme: Theme): void {
    this.#cy.batch(() => {
      for (const node of this.#cy.nodes('[kind="figure"]')) {
        const colour = this.#categoryColour(node.data('category') as Category);
        node.data('fill', mix(colour, theme.mixTarget, theme.mixAmount));
      }
    });
    this.#cy.style(buildStylesheet(theme));
  }

  /**
   * Wechselt die Beschriftung nach Sicht und Sprache. Die Kaesten behalten
   * dabei Groesse und Lage - genau darum sind sie fest bemessen.
   */
  setLabels(tradition: Tradition, lang: Lang): void {
    const byId = new Map(this.#graph.nodes.map((node) => [node.id, node]));

    this.#cy.batch(() => {
      for (const element of this.#cy.nodes('[kind="figure"]')) {
        const node = byId.get(element.id());
        if (node === undefined) continue;

        const preferred = tradition === 'greek' ? node.greek : node.roman;
        element.data('label', nameOf(node, tradition, lang));
        element.toggleClass('no-counterpart', preferred === undefined);
      }
    });
  }

  /**
   * Setzt Sichtbarkeit und Brueckenlinien.
   *
   * `present` sind die Figuren, die es in der gewaehlten Sicht gibt; wer fehlt,
   * verschwindet, und die Bruecken halten die Abstammung trotzdem zusammen.
   * `filtered` sind zusaetzlich per Sachgruppe ausgeblendete Figuren - dort
   * bleiben Luecken bewusst stehen.
   */
  setVisibility(state: VisibilityState): void {
    const shown = new Set<string>();
    for (const id of state.present) {
      if (!state.filtered.has(id)) shown.add(id);
    }

    this.#cy.batch(() => {
      for (const node of this.#cy.nodes('[kind="figure"]')) {
        node.toggleClass('out-of-view', !shown.has(node.id()));
      }

      for (const node of this.#cy.nodes('[kind="union"]')) {
        const graphNode = this.#graph.nodes.find((candidate) => candidate.id === node.id());
        const parents = graphNode?.parents ?? [];
        const children = node.outgoers('node').map((child) => child.id());

        const usable =
          parents.some((parent) => shown.has(parent)) && children.some((child) => shown.has(child));
        node.toggleClass('out-of-view', !usable);
      }

      this.#cy.remove('edge[kind="bridge"]');
      this.#cy.add(
        state.bridges
          .filter((bridge) => shown.has(bridge.source) && shown.has(bridge.target))
          .map((bridge) => ({
            group: 'edges' as const,
            data: {
              id: bridge.id,
              source: bridge.source,
              target: bridge.target,
              kind: 'bridge',
              via: bridge.via.join(', '),
            },
          })),
      );
    });
  }

  setVariantsVisible(show: boolean): void {
    this.#cy.batch(() => {
      this.#cy.edges('[kind="variant"]').toggleClass('out-of-view', !show);
    });
  }

  /**
   * Hebt die gewaehlte Figur und alles unmittelbar mit ihr Verbundene hervor;
   * der ganze uebrige Baum tritt zurueck. Ohne Auswahl wird nichts abgedunkelt.
   *
   * `neighbours` sind Eltern, Kinder und Partner. Die Verbindungsknoten
   * dazwischen kommen hier dazu, damit die Linien nicht ins Leere fuehren.
   */
  setHighlight(selectedId: string | null, neighbours: ReadonlySet<string>): void {
    this.#cy.batch(() => {
      this.#cy.elements().removeClass('dimmed lineage selected');
      this.#cy.edges('[kind="partner"]').addClass('out-of-view');

      if (selectedId === null) return;

      const selected = this.#cy.getElementById(selectedId);
      let group = this.#cy
        .nodes()
        .filter((node) => node.id() === selectedId || neighbours.has(node.id()));

      // Verbindungsknoten, die auf dem Weg zwischen zwei hervorgehobenen
      // Figuren liegen, gehoeren dazu - sonst reisst die Linie in der Mitte ab.
      const bridgingUnions = this.#cy
        .nodes('[kind="union"]')
        .filter(
          (union) =>
            union.incomers('node').some((parent) => group.contains(parent)) &&
            union.outgoers('node').some((child) => group.contains(child)),
        );
      group = group.union(bridgingUnions);

      const partnerEdges = selected.connectedEdges('[kind="partner"]');
      partnerEdges.removeClass('out-of-view');

      const highlighted = group.union(group.edgesWith(group)).union(partnerEdges);
      this.#cy.elements().difference(highlighted).addClass('dimmed');
      highlighted.addClass('lineage');
      selected.addClass('selected');
    });
  }

  /**
   * Setzt den Ausschnitt auf die sichtbaren Figuren, aber nicht kleiner als
   * lesbar. Ist eine Figur gewaehlt, bleibt sie dabei in der Mitte.
   */
  frame(focusId: string | null, animated = true): void {
    this.#cy.resize();

    const visible = this.#cy.nodes('[kind="figure"]').not('.out-of-view');
    if (visible.empty()) return;

    const box = visible.boundingBox();
    const available = {
      width: Math.max(this.#cy.width() - 2 * FIT_PADDING, 1),
      height: Math.max(this.#cy.height() - 2 * FIT_PADDING, 1),
    };

    const fitZoom = Math.min(available.width / box.w, available.height / box.h);

    // Die Lesbarkeitsgrenze gilt nur, wenn eine Figur gewaehlt ist: dann zeigt
    // der Ausschnitt bewusst nur deren Umgebung. Ohne Auswahl will man das
    // Gesamtbild sehen, auch wenn die Namen dabei klein werden.
    const clamped = focusId !== null && fitZoom < MIN_AUTO_ZOOM;
    const zoom = clamped ? MIN_AUTO_ZOOM : Math.min(MAX_ZOOM, fitZoom);

    // Auf die gewaehlte Figur wird nur zentriert, wenn ohnehin nicht alles
    // hineinpasst. Passt es, gehoert der Ausschnitt auf die Mitte der ganzen
    // Verwandtschaft - sonst verschwinden die Vorfahren ueber dem Bildrand,
    // waehrend darunter Platz frei bleibt.
    const anchor = clamped && focusId !== null ? this.#cy.getElementById(focusId) : null;
    const centre =
      anchor !== null && !anchor.empty() && !anchor.hasClass('out-of-view')
        ? anchor.position()
        : { x: box.x1 + box.w / 2, y: box.y1 + box.h / 2 };

    const target = {
      zoom,
      pan: {
        x: this.#cy.width() / 2 - centre.x * zoom,
        y: this.#cy.height() / 2 - centre.y * zoom,
      },
    };

    if (animated) this.#cy.animate(target, { duration: ANIMATION_MS, easing: 'ease-out-cubic' });
    else this.#cy.viewport(target);
  }

  /**
   * Passt den Ausschnitt an die sichtbaren Figuren an.
   *
   * Die Groesse der Zeichenflaeche wird vorher neu eingelesen: beim ersten
   * Aufbau steht sie noch nicht fest, und ein Einpassen auf die alte Groesse
   * liefert einen zu kleinen Zoom.
   */
  fitToVisible(animated = true): void {
    this.#cy.resize();

    const visible = this.#cy.nodes('[kind="figure"]').not('.out-of-view');
    if (visible.empty()) return;

    if (animated) {
      this.#cy.animate({ fit: { eles: visible, padding: FIT_PADDING } }, { duration: ANIMATION_MS });
    } else {
      this.#cy.fit(visible, FIT_PADDING);
    }
  }

  /**
   * Uebernimmt eine neue Groesse der Zeichenflaeche und haelt dabei den
   * Bildmittelpunkt fest.
   *
   * Cytoscape behaelt beim Groessenwechsel die Verschiebung bei, nicht die
   * Mitte - oeffnet sich das Infofenster, wandert der Ausschnitt deshalb um die
   * halbe Fensterbreite zur Seite und die gewaehlte Figur aus dem Bild.
   */
  resize(): void {
    const before = { width: this.#cy.width(), height: this.#cy.height() };
    this.#cy.resize();
    const after = { width: this.#cy.width(), height: this.#cy.height() };

    const pan = this.#cy.pan();
    this.#cy.pan({
      x: pan.x + (after.width - before.width) / 2,
      y: pan.y + (after.height - before.height) / 2,
    });
  }

  destroy(): void {
    this.#cy.destroy();
  }
}
