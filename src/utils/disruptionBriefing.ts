import { DisruptionCase } from '@/types';

export type SeverityRank = 'critical' | 'high' | 'medium' | 'low';

const SEVERITY_ORDER: Record<SeverityRank, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export interface DisruptionBriefing {
  hasOpenDisruptions: boolean;
  openCritical: number;
  openHigh: number;
  openImpactedPassengers: number;
  totalOpen: number;
  topSeverity: SeverityRank | null;
  topDisruption: DisruptionCase | null;
  recommendedActions: string[];
}

/**
 * Turns raw disruption cases into a concise, actionable operations briefing.
 * Never fabricates information: everything rendered here derives from the
 * authoritative disruption list only.
 */
export function buildDisruptionBriefing(cases: DisruptionCase[]): DisruptionBriefing {
  const openCases = cases.filter((c) => c.status === 'open');

  const topDisruption = [...openCases].sort((a, b) => {
    const rankDiff = SEVERITY_ORDER[b.severity as SeverityRank] - SEVERITY_ORDER[a.severity as SeverityRank];
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime();
  })[0] ?? null;

  const openImpactedPassengers = openCases
    .filter((c) => c.severity === 'critical' || c.severity === 'high')
    .reduce((sum, c) => sum + (Number(c.impactedPassengers) || 0), 0);

  const recommendedActions: string[] = [];
  if (topDisruption) {
    if (topDisruption.severity === 'critical') {
      recommendedActions.push(
        `Prioritise rebooking coordination for flight ${topDisruption.flightNumber} — ${topDisruption.impactedPassengers} passengers are affected.`
      );
    } else if (topDisruption.severity === 'high') {
      recommendedActions.push(
        `Escalate recovery plan for flight ${topDisruption.flightNumber} and monitor weather / operational recovery windows.`
      );
    }
  }
  if (openCases.some((c) => c.incidentType === 'weather')) {
    recommendedActions.push('Cross-check METAR / TAF outlooks for affected airports before final passenger manifest release.');
  }
  if (openCases.some((c) => c.incidentType === 'mechanical')) {
    recommendedActions.push('Confirm engineering inspection status and return-to-service clearance with the operator.');
  }

  return {
    hasOpenDisruptions: openCases.length > 0,
    openCritical: openCases.filter((c) => c.severity === 'critical').length,
    openHigh: openCases.filter((c) => c.severity === 'high').length,
    openImpactedPassengers,
    totalOpen: openCases.length,
    topSeverity: topDisruption?.severity ?? null,
    topDisruption,
    recommendedActions: recommendedActions.length > 0 ? recommendedActions : ['No automated actions required. Continue routine disruption monitoring.'],
  };
}
