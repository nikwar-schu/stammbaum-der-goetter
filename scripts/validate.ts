import type { Figure } from '../src/schema/figure.ts';
import { CATEGORIES, CONFIDENCE_LEVELS } from '../src/schema/constants.ts';
import { collectNodes, findCycle } from '../src/graph/dag.ts';
import type { Dataset } from './lib/dataset.ts';
import {
  canonicalAdjacency,
  canonicalParentage,
  fullAdjacency,
  loadDataset,
  pairKey,
  variantParentages,
} from './lib/dataset.ts';
import { buildGraph } from './lib/derive.ts';
import { Report } from './lib/report.ts';
import { DataFileError } from './lib/yaml.ts';

/**
 * Prueft den Datenbestand auf strukturelle Fehler.
 *
 * Das ist das Sicherheitsnetz, das beim ersten Anlauf dieses Projekts gefehlt
 * hat. Es findet Verweise ins Leere, Zyklen in der Abstammung, unstimmige
 * Generationsebenen und Tippfehler - aber ausdruecklich keine inhaltlichen
 * Irrtuemer. Wer eine Gottheit falsch einordnet, merkt das hier nicht.
 */

/** Beschreibt eine Fundstelle als 'datei -> kennung'. */
function where(dataset: Dataset, id: string): string {
  return `${dataset.fileById.get(id) ?? 'unbekannte Datei'} -> ${id}`;
}

function checkDuplicateIds(dataset: Dataset, report: Report): void {
  for (const id of new Set(dataset.duplicateIds)) {
    report.error('doppelte-kennung', `Kennung "${id}" ist mehrfach vergeben`, where(dataset, id));
  }
}

function checkAliases(dataset: Dataset, report: Report): void {
  const seenAliases = new Map<string, string>();

  for (const [id, figure] of dataset.byId) {
    for (const alias of figure.aliases ?? []) {
      if (dataset.byId.has(alias)) {
        report.error(
          'kennung-kollision',
          `Alias "${alias}" ist zugleich die Kennung einer anderen Figur`,
          where(dataset, id),
        );
      }
      const owner = seenAliases.get(alias);
      if (owner !== undefined) {
        report.error(
          'kennung-kollision',
          `Alias "${alias}" wird von "${owner}" und "${id}" beansprucht`,
          where(dataset, id),
        );
      }
      seenAliases.set(alias, id);
    }
  }
}

function checkReferences(dataset: Dataset, report: Report): void {
  const resolve = (id: string): boolean => dataset.byId.has(id);

  for (const [id, figure] of dataset.byId) {
    const at = where(dataset, id);

    for (const variant of figure.parentage) {
      for (const parent of variant.parents) {
        if (!resolve(parent)) {
          report.error(
            'verweis-ins-leere',
            `Elternteil "${parent}" (Abstammung "${variant.id}") existiert nicht`,
            at,
          );
        }
      }
      for (const reference of variant.sources) {
        if (!(reference.source in dataset.sources)) {
          report.error(
            'unbekannte-quelle',
            `Quellenschluessel "${reference.source}" steht nicht in sources.yaml`,
            at,
          );
        }
      }
    }

    for (const counterpart of figure.counterparts ?? []) {
      if (!resolve(counterpart.figure)) {
        report.error(
          'verweis-ins-leere',
          `Gegenstueck "${counterpart.figure}" existiert nicht`,
          at,
        );
      }
      if (counterpart.figure === id) {
        report.error('gegenstueck-auf-sich-selbst', 'Figur verweist als Gegenstueck auf sich selbst', at);
      }
    }

    for (const aspect of [figure.greek, figure.roman]) {
      for (const reference of aspect?.sources ?? []) {
        if (!(reference.source in dataset.sources)) {
          report.error(
            'unbekannte-quelle',
            `Quellenschluessel "${reference.source}" steht nicht in sources.yaml`,
            at,
          );
        }
      }
    }
  }
}

/**
 * Prueft die Verbindungen: Verweise, doppelte Paare, Selbstbezug - und meldet
 * Paare mit gemeinsamen Kindern, deren Art noch nicht eingetragen ist.
 */
function checkRelationships(dataset: Dataset, report: Report): void {
  const seen = new Map<string, number>();
  const at = 'data/relationships.yaml';

  for (const relationship of dataset.relationships) {
    const [a, b] = relationship.between;

    for (const id of [a, b]) {
      if (!dataset.byId.has(id)) {
        report.error('verweis-ins-leere', `Verbindung nennt die unbekannte Figur "${id}"`, at);
      }
    }

    if (a === b) {
      report.error('verbindung-mit-sich-selbst', `"${a}" ist mit sich selbst verbunden`, at);
    }

    for (const reference of relationship.sources) {
      if (!(reference.source in dataset.sources)) {
        report.error(
          'unbekannte-quelle',
          `Quellenschluessel "${reference.source}" steht nicht in sources.yaml`,
          at,
        );
      }
    }

    const key = pairKey(a, b);
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count > 1) {
      report.error('doppelte-verbindung', `Das Paar "${key}" ist mehrfach eingetragen`, at);
    }
  }

  // Gemeinsame Kinder verraten noch nicht, ob es eine Ehe war.
  const graph = buildGraph(dataset);
  const offen = graph.partners
    .filter((partner) => partner.type === 'unknown' && partner.children > 0)
    .map((partner) => pairKey(partner.a, partner.b));

  for (const key of offen) {
    report.warn(
      'verbindung-ohne-art',
      `"${key}" hat gemeinsame Kinder, aber es ist nicht eingetragen, welcher Art die Verbindung war`,
      at,
    );
  }
}

function checkParentagePlausibility(dataset: Dataset, report: Report): void {
  for (const [id, figure] of dataset.byId) {
    const at = where(dataset, id);
    const canonicalCount = figure.parentage.filter((variant) => variant.canonical).length;

    if (figure.parentage.length > 0 && canonicalCount !== 1) {
      report.error(
        'leitversion',
        `genau eine Abstammung muss "canonical: true" tragen, gefunden: ${canonicalCount}`,
        at,
      );
    }

    const variantIds = new Set<string>();
    for (const variant of figure.parentage) {
      if (variantIds.has(variant.id)) {
        report.error('doppelte-abstammung', `Abstammungskennung "${variant.id}" doppelt vergeben`, at);
      }
      variantIds.add(variant.id);

      if (variant.parents.includes(id)) {
        report.error('eigener-elternteil', `Figur ist in Abstammung "${variant.id}" ihr eigener Elternteil`, at);
      }
      if (new Set(variant.parents).size !== variant.parents.length) {
        report.error('doppelter-elternteil', `Abstammung "${variant.id}" nennt einen Elternteil mehrfach`, at);
      }
    }
  }
}

function checkTiers(dataset: Dataset, report: Report): void {
  for (const [id, figure] of dataset.byId) {
    const at = where(dataset, id);

    const canonical = canonicalParentage(figure);
    if (canonical !== undefined) {
      for (const parentId of canonical.parents) {
        const parent = dataset.byId.get(parentId);
        if (parent === undefined) continue;
        if (figure.tier <= parent.tier) {
          report.error(
            'generationsebene',
            `Ebene ${figure.tier} liegt nicht unter der von "${parentId}" (${parent.tier}); ` +
              'das Layout kann so keine saubere Schichtung bilden',
            at,
          );
        }
      }
    }

    for (const variant of variantParentages(figure)) {
      for (const parentId of variant.parents) {
        const parent = dataset.byId.get(parentId);
        if (parent === undefined) continue;
        if (figure.tier <= parent.tier) {
          report.warn(
            'generationsebene-variante',
            `Abstammung "${variant.id}" nennt "${parentId}" (Ebene ${parent.tier}) als Elternteil, ` +
              `die Figur steht aber auf Ebene ${figure.tier}; die Variantenlinie laeuft ruecklaeufig`,
            at,
          );
        }
      }
    }
  }
}

function checkCycles(dataset: Dataset, report: Report): void {
  const canonicalCycle = findCycle(canonicalAdjacency(dataset));
  if (canonicalCycle !== null) {
    report.error(
      'zyklus-leitversion',
      `Abstammung im Kreis: ${canonicalCycle.join(' -> ')}`,
    );
  }

  const fullCycle = findCycle(fullAdjacency(dataset));
  if (fullCycle !== null) {
    report.warn(
      'zyklus-varianten',
      `ueber die Varianten hinweg entsteht ein Kreis: ${fullCycle.join(' -> ')}. ` +
        'Bei widerspruechlichen Ueberlieferungen ist das zu erwarten.',
    );
  }
}

function checkAspects(dataset: Dataset, report: Report): void {
  for (const [id, figure] of dataset.byId) {
    const at = where(dataset, id);

    if (figure.greek === undefined && figure.roman === undefined) {
      report.error('ohne-auspraegung', 'weder eine griechische noch eine roemische Sicht angegeben', at);
    }

    for (const [tradition, aspect] of [
      ['griechisch', figure.greek],
      ['roemisch', figure.roman],
    ] as const) {
      for (const domain of aspect?.domains ?? []) {
        if (!(domain in dataset.domains)) {
          report.error(
            'unbekannte-zustaendigkeit',
            `"${domain}" (${tradition}) steht nicht in domains.yaml`,
            at,
          );
        }
      }
    }
  }
}

function checkCounterpartSymmetry(dataset: Dataset, report: Report): void {
  for (const [id, figure] of dataset.byId) {
    for (const counterpart of figure.counterparts ?? []) {
      const target = dataset.byId.get(counterpart.figure);
      if (target === undefined) continue;

      const pointsBack = (target.counterparts ?? []).some((back) => back.figure === id);
      if (!pointsBack) {
        report.warn(
          'gegenstueck-einseitig',
          `"${id}" verweist auf "${counterpart.figure}", aber nicht umgekehrt`,
          where(dataset, id),
        );
      }
    }
  }
}

function checkOrphans(dataset: Dataset, report: Report): void {
  const childrenOf = fullAdjacency(dataset);
  const hasChildren = new Set<string>();
  for (const [parent, children] of childrenOf) {
    if (children.length > 0) hasChildren.add(parent);
  }

  const partnered = new Set<string>();
  for (const partner of buildGraph(dataset).partners) {
    partnered.add(partner.a);
    partnered.add(partner.b);
  }

  for (const [id, figure] of dataset.byId) {
    const hasParents = figure.parentage.some((variant) => variant.parents.length > 0);
    const hasCounterparts = (figure.counterparts ?? []).length > 0;

    if (!hasParents && !hasChildren.has(id) && !partnered.has(id) && !hasCounterparts) {
      report.warn(
        'ohne-verbindung',
        'Figur haengt an keiner Stelle im Stammbaum und erscheint isoliert',
        where(dataset, id),
      );
    }
  }
}

function checkUnusedSources(dataset: Dataset, report: Report): void {
  const used = new Set<string>();
  for (const relationship of dataset.relationships) {
    for (const reference of relationship.sources) used.add(reference.source);
  }

  for (const figure of dataset.byId.values()) {
    for (const variant of figure.parentage) {
      for (const reference of variant.sources) used.add(reference.source);
    }
    for (const aspect of [figure.greek, figure.roman]) {
      for (const reference of aspect?.sources ?? []) used.add(reference.source);
    }
    for (const counterpart of figure.counterparts ?? []) {
      for (const reference of counterpart.sources ?? []) used.add(reference.source);
    }
    for (const myth of figure.myths ?? []) {
      for (const reference of myth.sources) used.add(reference.source);
    }
  }

  for (const key of Object.keys(dataset.sources)) {
    if (!used.has(key)) {
      report.warn('quelle-ungenutzt', `Quelle "${key}" wird von keiner Figur zitiert`, 'data/sources.yaml');
    }
  }
}

function checkUnusedDomains(dataset: Dataset, report: Report): void {
  const used = new Set<string>();
  for (const figure of dataset.byId.values()) {
    for (const aspect of [figure.greek, figure.roman]) {
      for (const domain of aspect?.domains ?? []) used.add(domain);
    }
  }

  const unused = Object.keys(dataset.domains).filter((key) => !used.has(key));
  if (unused.length > 0) {
    report.info(
      'zustaendigkeit-ungenutzt',
      `${unused.length} Eintraege in domains.yaml werden noch nicht verwendet - ` +
        'bei einem im Aufbau befindlichen Bestand ist das normal',
      'data/domains.yaml',
    );
  }
}

function reportStatistics(dataset: Dataset, report: Report): void {
  const figures = [...dataset.byId.values()];
  const total = figures.length;

  const perCategory = CATEGORIES.map((category) => ({
    category,
    count: figures.filter((figure) => figure.category === category).length,
  })).filter((entry) => entry.count > 0);

  const perConfidence = CONFIDENCE_LEVELS.map((level) => ({
    level,
    count: figures.filter((figure) => figure.confidence === level).length,
  })).filter((entry) => entry.count > 0);

  const withRoman = figures.filter((figure) => figure.roman !== undefined).length;
  const withGreek = figures.filter((figure) => figure.greek !== undefined).length;
  const withVariants = figures.filter((figure) => figure.parentage.length > 1).length;
  const tiers = collectNodes(canonicalAdjacency(dataset)).length;

  const percent = (part: number): string => `${Math.round((part / total) * 100)} %`;

  report.info('bestand', `${total} Figuren in ${dataset.entries.length} Eintraegen, ${tiers} Knoten im Leitgraphen`);
  report.info('bestand', `Sachgruppen: ${perCategory.map((e) => `${e.category} ${e.count}`).join(', ')}`);
  report.info('bestand', `Belegtheit: ${perConfidence.map((e) => `${e.level} ${e.count}`).join(', ')}`);
  report.info(
    'bestand',
    `griechische Sicht ${withGreek} (${percent(withGreek)}), roemische Sicht ${withRoman} (${percent(withRoman)}), ` +
      `mit Abstammungsvarianten ${withVariants}`,
  );
}

function checkFigureShape(dataset: Dataset, report: Report): void {
  const knownIds = new Set(dataset.byId.keys());

  for (const [id, figure] of dataset.byId) {
    if (!knownIds.has(id)) continue;
    assertNoEmptyAspect(figure, id, dataset, report);
  }
}

function assertNoEmptyAspect(figure: Figure, id: string, dataset: Dataset, report: Report): void {
  for (const [tradition, aspect] of [
    ['griechisch', figure.greek],
    ['roemisch', figure.roman],
  ] as const) {
    if (aspect === undefined) continue;
    if (aspect.domains.length === 0) {
      report.error(
        'auspraegung-unvollstaendig',
        `${tradition}e Sicht ohne Zustaendigkeit`,
        where(dataset, id),
      );
    }
  }
}

async function main(): Promise<number> {
  const report = new Report();
  const dataset = await loadDataset();

  checkDuplicateIds(dataset, report);
  checkAliases(dataset, report);
  checkReferences(dataset, report);
  checkRelationships(dataset, report);
  checkParentagePlausibility(dataset, report);
  checkTiers(dataset, report);
  checkCycles(dataset, report);
  checkAspects(dataset, report);
  checkFigureShape(dataset, report);
  checkCounterpartSymmetry(dataset, report);
  checkOrphans(dataset, report);
  checkUnusedSources(dataset, report);
  checkUnusedDomains(dataset, report);
  reportStatistics(dataset, report);

  const errors = report.print();
  const warnings = report.count('warning');

  process.stdout.write(
    errors === 0
      ? `Pruefung bestanden: 0 Fehler, ${warnings} Warnungen.\n`
      : `Pruefung fehlgeschlagen: ${errors} Fehler, ${warnings} Warnungen.\n`,
  );

  return errors === 0 ? 0 : 1;
}

try {
  process.exitCode = await main();
} catch (error) {
  const message = error instanceof DataFileError ? error.message : String(error);
  process.stderr.write(`Pruefung abgebrochen: ${message}\n`);
  process.exitCode = 1;
}
