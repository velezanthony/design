import { IssueSeverity } from './tree/types';

/** Las gravedades, de más a menos grave: el orden en que se enseñan y se ordenan. */
export const ALL_SEVERITIES: IssueSeverity[] = [
  IssueSeverity.ERROR,
  IssueSeverity.WARNING,
  IssueSeverity.INFO,
];

/** Lo que hay que arreglar: errores y avisos. La información no resta. */
export const ACTIONABLE_SEVERITIES: IssueSeverity[] = [IssueSeverity.ERROR, IssueSeverity.WARNING];

export const SEVERITY_RANK = Object.fromEntries(
  ALL_SEVERITIES.map((severity, rank) => [severity, rank]),
) as Record<IssueSeverity, number>;

export function isActionable(severity: IssueSeverity): boolean {
  return ACTIONABLE_SEVERITIES.includes(severity);
}

export function compareSeverity(left: IssueSeverity, right: IssueSeverity): number {
  return SEVERITY_RANK[left] - SEVERITY_RANK[right];
}

/** La más grave de una lista; `undefined` si está vacía. */
export function worst(severities: readonly IssueSeverity[]): IssueSeverity | undefined {
  return [...severities].sort(compareSeverity)[0];
}
