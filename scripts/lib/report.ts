/**
 * Sammelt Befunde aus Pruefungen, statt beim ersten Fehler abzubrechen.
 * Wer Daten pflegt, will alle Probleme eines Durchlaufs auf einmal sehen.
 */

export const SEVERITIES = ['error', 'warning', 'info'] as const;
export type Severity = (typeof SEVERITIES)[number];

export interface Finding {
  readonly severity: Severity;
  /** Kurzkennung der Pruefung, z. B. 'duplicate-id'. Erleichtert das Nachschlagen. */
  readonly check: string;
  readonly message: string;
  /** Fundstelle, z. B. 'data/figures/01-protogenoi.yaml -> chaos'. */
  readonly where?: string;
}

const SEVERITY_LABEL: Record<Severity, string> = {
  error: 'FEHLER ',
  warning: 'WARNUNG',
  info: 'HINWEIS',
};

export class Report {
  readonly #findings: Finding[] = [];

  error(check: string, message: string, where?: string): void {
    this.#add('error', check, message, where);
  }

  warn(check: string, message: string, where?: string): void {
    this.#add('warning', check, message, where);
  }

  info(check: string, message: string, where?: string): void {
    this.#add('info', check, message, where);
  }

  #add(severity: Severity, check: string, message: string, where?: string): void {
    this.#findings.push(where === undefined ? { severity, check, message } : { severity, check, message, where });
  }

  count(severity: Severity): number {
    return this.#findings.filter((finding) => finding.severity === severity).length;
  }

  get hasErrors(): boolean {
    return this.count('error') > 0;
  }

  /** Gibt alle Befunde nach Schweregrad geordnet aus und liefert die Fehlerzahl zurueck. */
  print(): number {
    for (const severity of SEVERITIES) {
      const group = this.#findings.filter((finding) => finding.severity === severity);
      if (group.length === 0) continue;

      for (const finding of group) {
        const location = finding.where === undefined ? '' : `  [${finding.where}]`;
        process.stdout.write(`${SEVERITY_LABEL[severity]} ${finding.check}: ${finding.message}${location}\n`);
      }
      process.stdout.write('\n');
    }
    return this.count('error');
  }
}
