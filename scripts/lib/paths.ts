import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Alle Pfade des Projekts an einer Stelle, damit kein Skript relativ herumrechnet. */
const scriptsLibDir = path.dirname(fileURLToPath(import.meta.url));

export const PROJECT_ROOT = path.resolve(scriptsLibDir, '..', '..');
export const DATA_DIR = path.join(PROJECT_ROOT, 'data');
export const FIGURES_DIR = path.join(DATA_DIR, 'figures');
export const SCHEMA_DIR = path.join(PROJECT_ROOT, 'schema');
export const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public', 'data');

export const SOURCES_FILE = path.join(DATA_DIR, 'sources.yaml');
export const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.yaml');
export const DOMAINS_FILE = path.join(DATA_DIR, 'domains.yaml');

/** Pfad zur Ausgabe des Meldungstexts: relativ zum Projekt, mit Schraegstrichen. */
export function relativeToProject(absolutePath: string): string {
  return path.relative(PROJECT_ROOT, absolutePath).split(path.sep).join('/');
}
