import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { load, YAMLException } from 'js-yaml';
import type { ZodType } from 'zod';
import { relativeToProject } from './paths.ts';

/** Fehler beim Lesen oder Auswerten einer Datendatei, mit Angabe der Fundstelle. */
export class DataFileError extends Error {
  readonly file: string;

  constructor(file: string, message: string, options?: { cause?: unknown }) {
    super(`${relativeToProject(file)}: ${message}`, options);
    this.name = 'DataFileError';
    this.file = file;
  }
}

const YAML_EXTENSION = '.yaml';

/** Liest eine YAML-Datei und liefert den unausgewerteten Inhalt. */
export async function loadYaml(file: string): Promise<unknown> {
  let raw: string;
  try {
    raw = await readFile(file, 'utf8');
  } catch (cause) {
    throw new DataFileError(file, 'Datei kann nicht gelesen werden', { cause });
  }

  try {
    return load(raw, { filename: file });
  } catch (cause) {
    const detail = cause instanceof YAMLException ? cause.message : String(cause);
    throw new DataFileError(file, `YAML ist fehlerhaft: ${detail}`, { cause });
  }
}

/** Formatiert Schemaverstoesse als eingerueckte Liste mit Feldpfad. */
export function formatIssues(issues: readonly { path: PropertyKey[]; message: string }[]): string {
  return issues
    .map((issue) => {
      const where = issue.path.length === 0 ? '(Wurzel)' : issue.path.map(String).join('.');
      return `\n  - ${where}: ${issue.message}`;
    })
    .join('');
}

/**
 * Liest eine YAML-Datei und prueft sie gegen ein Schema.
 * Wirft mit vollstaendiger Liste aller Verstoesse, nicht nur des ersten.
 */
export async function parseYamlFile<T>(file: string, schema: ZodType<T>): Promise<T> {
  const content = await loadYaml(file);
  const result = schema.safeParse(content);

  if (!result.success) {
    throw new DataFileError(file, `entspricht nicht dem Schema:${formatIssues(result.error.issues)}`);
  }
  return result.data;
}

/** Alle YAML-Dateien eines Verzeichnisses, alphabetisch - die Reihenfolge haelt das Layout stabil. */
export async function listYamlFiles(directory: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(directory);
  } catch (cause) {
    throw new DataFileError(directory, 'Verzeichnis kann nicht gelesen werden', { cause });
  }

  return entries
    .filter((entry) => entry.endsWith(YAML_EXTENSION))
    .sort((a, b) => a.localeCompare(b, 'en'))
    .map((entry) => path.join(directory, entry));
}
