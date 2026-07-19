import type { OrgState } from './types';

export interface PenaltyResult {
  efficiencyMult: number;
  errorMult: number;
  chaosLevel: OrgState['chaosLevel'];
  unmanagedMembers: number;
}

const FOREMAN_SPAN = 6;
const CHAOS_THRESHOLD = 4;

/** Measurable brigade management penalty per supplement §5.2. */
export function computeBrigadePenalty(org: OrgState): PenaltyResult {
  let worst: PenaltyResult = {
    efficiencyMult: 1,
    errorMult: 1,
    chaosLevel: 'managed',
    unmanagedMembers: 0,
  };

  for (const brigade of org.brigades) {
    const members = brigade.memberIds.length;
    if (members === 0) continue;

    const leader = brigade.leaderId
      ? org.employees.find((e) => e.id === brigade.leaderId)
      : null;
    const span = leader?.roleId === 'foreman' || leader?.roleId === 'shift_lead' ? FOREMAN_SPAN : 0;

    if (!leader && members > CHAOS_THRESHOLD) {
      worst = pickWorse(worst, {
        efficiencyMult: 0.6,
        errorMult: 1.4,
        chaosLevel: 'chaos',
        unmanagedMembers: members,
      });
      continue;
    }

    if (!leader) {
      worst = pickWorse(worst, {
        efficiencyMult: 0.75,
        errorMult: 1.25,
        chaosLevel: 'unmanaged',
        unmanagedMembers: members,
      });
      continue;
    }

    const overload = members / span;
    if (overload <= 1) continue;

    const excess = overload - 1;
    if (excess <= 0.25) {
      worst = pickWorse(worst, {
        efficiencyMult: 0.9,
        errorMult: 1.1,
        chaosLevel: 'overloaded',
        unmanagedMembers: Math.max(0, members - span),
      });
    } else if (excess <= 0.75) {
      worst = pickWorse(worst, {
        efficiencyMult: 0.75,
        errorMult: 1.25,
        chaosLevel: 'unmanaged',
        unmanagedMembers: Math.max(0, members - span),
      });
    } else {
      worst = pickWorse(worst, {
        efficiencyMult: 0.6,
        errorMult: 1.4,
        chaosLevel: 'chaos',
        unmanagedMembers: Math.max(0, members - span),
      });
    }
  }

  const unassigned = org.employees.filter(
    (e) => !e.brigadeId && e.roleId !== 'foreman' && e.roleId !== 'shift_lead',
  );
  if (unassigned.length > CHAOS_THRESHOLD) {
    worst = pickWorse(worst, {
      efficiencyMult: 0.6,
      errorMult: 1.4,
      chaosLevel: 'chaos',
      unmanagedMembers: unassigned.length,
    });
  }

  return worst;
}

function severity(level: OrgState['chaosLevel']): number {
  return { managed: 0, overloaded: 1, unmanaged: 2, chaos: 3 }[level];
}

function pickWorse(a: PenaltyResult, b: PenaltyResult): PenaltyResult {
  return severity(b.chaosLevel) > severity(a.chaosLevel) ? b : a;
}

export function applyPenaltyToOrg(org: OrgState): PenaltyResult {
  const result = computeBrigadePenalty(org);
  org.efficiencyMult = result.efficiencyMult;
  org.errorMult = result.errorMult;
  org.chaosLevel = result.chaosLevel;
  return result;
}

export function aggregateOrgPenalty(org: OrgState): PenaltyResult {
  return computeBrigadePenalty(org);
}
