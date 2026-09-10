import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import {
  categoriesFileSchema,
  domainsFileSchema,
  figuresFileSchema,
  sourcesFileSchema,
} from '../src/schema/figure.ts';
import { relativeToProject, SCHEMA_DIR } from './lib/paths.ts';

/**
 * Erzeugt aus den Zod-Schemata JSON-Schema-Dateien fuer den Editor.
 *
 * Jede YAML-Datei verweist in ihrer ersten Zeile auf die passende Datei. Dadurch
 * meldet der Editor Tippfehler und fehlende Pflichtfelder schon beim Schreiben -
 * die wirkungsvollste einzelne Massnahme fuer die Pflegbarkeit des Datenbestands.
 */

const JSON_SCHEMA_TARGET = 'draft-2020-12' as const;
const INDENT = 2;

const OUTPUTS = [
  { file: 'figures.schema.json', schema: figuresFileSchema, title: 'Stammbaum: Figurendatei' },
  { file: 'sources.schema.json', schema: sourcesFileSchema, title: 'Stammbaum: Quellenverzeichnis' },
  { file: 'categories.schema.json', schema: categoriesFileSchema, title: 'Stammbaum: Sachgruppen' },
  { file: 'domains.schema.json', schema: domainsFileSchema, title: 'Stammbaum: Zustaendigkeiten' },
] as const;

async function main(): Promise<void> {
  await mkdir(SCHEMA_DIR, { recursive: true });

  for (const output of OUTPUTS) {
    const jsonSchema = z.toJSONSchema(output.schema, { target: JSON_SCHEMA_TARGET });
    const target = path.join(SCHEMA_DIR, output.file);
    const document = { title: output.title, ...jsonSchema };

    await writeFile(target, `${JSON.stringify(document, null, INDENT)}\n`, 'utf8');
    process.stdout.write(`geschrieben  ${relativeToProject(target)}\n`);
  }
}

try {
  await main();
} catch (error) {
  process.stderr.write(`JSON-Schema konnte nicht erzeugt werden: ${(error as Error).message}\n`);
  process.exitCode = 1;
}
