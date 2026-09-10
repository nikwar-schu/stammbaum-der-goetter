import { loadDataset } from './lib/dataset.ts';

/**
 * Prueft, ob die verlinkten Nachschlagewerke noch erreichbar sind.
 *
 * Die Verweise werden beim Schreiben der Eintraege aus dem Gedaechtnis gesetzt
 * und sind damit die fehleranfaelligste Angabe ueberhaupt: fuenf von 125 Links
 * zeigten anfangs ins Leere. Nach jeder Etappe einmal laufen lassen.
 *
 * Kein Teil des Builds - er braucht Netz und soll die Veroeffentlichung nicht
 * von der Erreichbarkeit fremder Server abhaengig machen.
 */

/** Gleichzeitige Abfragen. Hoeher waere unhoeflich gegenueber Wikipedia. */
const PARALLEL = 12;

interface Verweis {
  readonly figur: string;
  readonly art: string;
  readonly url: string;
}

interface Befund {
  readonly verweis: Verweis;
  readonly grund: string;
  readonly ziel?: string;
}

async function pruefe(verweis: Verweis): Promise<Befund | undefined> {
  try {
    const antwort = await fetch(verweis.url, { method: 'HEAD', redirect: 'follow' });
    if (!antwort.ok) {
      return { verweis, grund: `HTTP ${antwort.status}` };
    }
    if (decodeURI(antwort.url) !== decodeURI(verweis.url)) {
      return { verweis, grund: 'umgeleitet', ziel: decodeURI(antwort.url) };
    }
    return undefined;
  } catch (fehler) {
    return { verweis, grund: `nicht erreichbar (${(fehler as Error).message})` };
  }
}

async function main(): Promise<number> {
  const dataset = await loadDataset();

  const verweise: Verweis[] = [];
  for (const [figur, figure] of dataset.byId) {
    for (const [art, url] of Object.entries(figure.refs ?? {})) {
      if (typeof url === 'string' && url.startsWith('http')) verweise.push({ figur, art, url });
    }
    const bild = figure.image;
    if (bild != null) verweise.push({ figur, art: 'image', url: bild.source });
  }

  process.stdout.write(`${verweise.length} Verweise werden geprueft ...\n\n`);

  const befunde: Befund[] = [];
  for (let i = 0; i < verweise.length; i += PARALLEL) {
    const teil = await Promise.all(verweise.slice(i, i + PARALLEL).map(pruefe));
    for (const befund of teil) {
      if (befund !== undefined) befunde.push(befund);
    }
  }

  const tot = befunde.filter((befund) => befund.grund !== 'umgeleitet');
  const umgeleitet = befunde.filter((befund) => befund.grund === 'umgeleitet');

  for (const { verweis, grund } of tot) {
    process.stdout.write(`FEHLER  ${verweis.figur} (${verweis.art}): ${grund}\n        ${verweis.url}\n`);
  }
  for (const { verweis, ziel } of umgeleitet) {
    process.stdout.write(`HINWEIS ${verweis.figur} (${verweis.art}) wird umgeleitet\n        ${verweis.url}\n     -> ${ziel}\n`);
  }

  process.stdout.write(
    tot.length === 0
      ? `\nAlle ${verweise.length} Verweise erreichbar, ${umgeleitet.length} Umleitungen.\n`
      : `\n${tot.length} von ${verweise.length} Verweisen zeigen ins Leere.\n`,
  );

  return tot.length === 0 ? 0 : 1;
}

try {
  process.exitCode = await main();
} catch (error) {
  process.stderr.write(`Verweispruefung abgebrochen: ${(error as Error).message}\n`);
  process.exitCode = 1;
}
