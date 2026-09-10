import { loadDataset } from './lib/dataset.ts';
import { buildGraph } from './lib/derive.ts';
import { buildNameIndex, linkNames } from '../src/ui/nameLinks.ts';
import type { SearchDoc } from '../src/types/runtime.ts';

/**
 * Zeigt, welche grossgeschriebenen Woerter im englischen Fliesstext wie
 * Goetternamen aussehen, aber nicht verlinkt werden.
 *
 * Zwei Arten von Treffern: abweichende Namensformen, die als weiterer Name
 * nachzutragen sind - so fehlte "Hephaestus" neben "Hephaistos" -, und Namen von
 * Gottheiten, die es im Bestand noch nicht gibt. Nur die englischen Texte werden
 * geprueft; im Deutschen sind auch gewoehnliche Hauptwoerter grossgeschrieben,
 * das verrauscht das Ergebnis.
 *
 * Kein Teil des Builds: das Ergebnis will gelesen und abgewogen werden.
 */

const dataset = await loadDataset();
const graph = buildGraph(dataset);

const docs: SearchDoc[] = [...dataset.byId.values()].map((figure) => ({
  id: figure.id,
  category: figure.category,
  names: [figure.greek, figure.roman]
    .flatMap((aspect) => (aspect === undefined ? [] : [aspect.name, ...(aspect.altNames ?? [])])),
  epithets: [],
  terms: [],
}));

const index = buildNameIndex(graph.nodes, docs);
const unlinked = new Map<string, Set<string>>();
const SATZANFANG = /(^|[.!?:;]\s+|["„»(\-]\s*)$/;

function scan(text: string, wo: string): void {
  for (const segment of linkNames(text, index)) {
    if (segment.figureId !== undefined) continue;

    for (const match of segment.text.matchAll(/\b[A-ZÄÖÜ][a-zäöüß]{3,}\b/g)) {
      const wort = match[0];
      // Satzanfaenge sind fast immer gewoehnliche Woerter.
      if (SATZANFANG.test(segment.text.slice(0, match.index))) continue;
      const treffer = unlinked.get(wort) ?? new Set<string>();
      treffer.add(wo);
      unlinked.set(wort, treffer);
    }
  }
}

for (const figure of dataset.byId.values()) {
  for (const aspect of [figure.greek, figure.roman]) {
    if (aspect === undefined) continue;
    scan(aspect.description.en, `${figure.id}.description`);
    if (aspect.cultNotes !== undefined) scan(aspect.cultNotes.en, `${figure.id}.cult`);
  }
  for (const variant of figure.parentage) {
    if (variant.note === undefined) continue;
    scan(variant.note.en, `${figure.id}.${variant.id}`);
  }
}

const sortiert = [...unlinked.entries()].sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]));
process.stdout.write(`${sortiert.length} nicht verlinkte grossgeschriebene Woerter:\n\n`);
for (const [wort, orte] of sortiert) {
  process.stdout.write(`  ${wort.padEnd(18)} ${orte.size}x  ${[...orte].slice(0, 2).join(', ')}\n`);
}
