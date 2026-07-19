import type { GameSnapshot } from '@/core/types';
import { applyPenaltyToOrg } from '@/domain/org/penalties';
import { autoAssignTasks, completeStaleTasks, escalateBlockedTasks, createRoutineTask } from '@/domain/org/Manager';
import { recalcGrowthMetrics } from '@/domain/org/OrgController';
import { logEvent } from './EventJournal';
import { SeedRng } from '@/core/Seed';

let tickAcc = 0;

export function tickOrgEconomy(state: GameSnapshot, dt: number): void {
  if (!state.growth.unlocked) return;

  tickAcc += dt;
  applyPenaltyToOrg(state.org);
  recalcGrowthMetrics(state);

  const upkeepCost = state.growth.totalUpkeep * dt / 60;
  state.money = Math.max(0, state.money - upkeepCost);

  const bonus = state.growth.bonusIncomeRate * state.org.efficiencyMult * dt;
  if (bonus > 0) {
    state.money += bonus;
    state.stat[1].earned += bonus * 0.33;
    state.stat[2].earned += bonus * 0.33;
    state.stat[3].earned += bonus * 0.34;
  }

  if (tickAcc >= 5) {
    tickAcc = 0;
    maybeSpawnRoutineTasks(state);
    autoAssignTasks(state);
    const escalated = escalateBlockedTasks(state);
    if (escalated > 0) {
      logEvent(state, 'escalation', `${escalated} task(s) escalated to hero`);
    }
  }

  completeStaleTasks(state, dt);

  const rng = new SeedRng(state.seed + Math.floor(state.gameT));
  if (state.org.chaosLevel !== 'managed' && rng.chance(0.02 * dt * state.org.errorMult)) {
    state.accidents += 1;
  }
}

function maybeSpawnRoutineTasks(state: GameSnapshot): void {
  for (const emp of state.org.employees) {
    if (emp.zoneId && emp.status === 'available') {
      const existing = state.org.tasks.some(
        (t) => t.zoneId === emp.zoneId && t.status === 'queued' && t.routine,
      );
      if (!existing) {
        createRoutineTask(state.org, emp.zoneId, `Routine ${emp.zoneId}`, state.gameT);
      }
    }
  }
}

export function resetOrgTickAcc(): void {
  tickAcc = 0;
}
