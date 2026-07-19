import type { GameSnapshot } from '@/core/types';
import type { GrowthState, OrgState } from './types';
import { createEmployee, isManagerRole, totalSalary } from './Employee';
import { assignToBrigade, ensureBrigade } from './Brigade';
import { applyPenaltyToOrg } from './penalties';
import { createRoutineTask } from './Manager';
import { catalogById } from '@/domain/shop/CatalogItems';
import { logEvent, resetEventCounter } from '@/domain/economy/EventJournal';

export const GROWTH_BONUS_MONEY = 1200;
export const TUTORIAL_CONFLICT_WORKERS = 3;

export function createInitialOrg(): OrgState {
  return {
    employees: [],
    brigades: [],
    tasks: [],
    escalations: [],
    nextEmpNum: 1,
    nextBrigadeNum: 1,
    efficiencyMult: 1,
    errorMult: 1,
    chaosLevel: 'managed',
  };
}

export function createInitialGrowth(): GrowthState {
  return {
    unlocked: false,
    tutorialStep: 0,
    totalUpkeep: 0,
    bonusIncomeRate: 0,
    ownedItemIds: [],
    ui: { shopOpen: false, panel: null, hireItemId: null, selectedCategory: 'personnel' },
  };
}

export function unlockGrowth(state: GameSnapshot): void {
  if (state.growth.unlocked) return;
  state.growth.unlocked = true;
  state.growth.tutorialStep = 1;
  state.money += GROWTH_BONUS_MONEY;
  logEvent(state, 'growth_unlock', 'Shop unlocked — reinvest shift earnings');
  state.commandJournal.push(`growth:unlock@${state.gameT.toFixed(2)}`);
}

export function hireFromShopItem(state: GameSnapshot, shopItemId: string): string | null {
  const item = catalogById(shopItemId);
  if (!item?.roleId) return null;

  const emp = createEmployee(state.seed, item.roleId, state.org.nextEmpNum++, shopItemId);
  state.org.employees.push(emp);
  state.growth.ui.hireItemId = shopItemId;
  state.growth.ui.panel = 'hire';

  logEvent(state, 'hire', `Hired ${emp.name} (${item.roleId})`, { employeeId: emp.id, shopItemId });
  state.commandJournal.push(`hire:${shopItemId}:${emp.id}@${state.gameT.toFixed(2)}`);

  advanceTutorialOnHire(state);
  return emp.id;
}

export function assignEmployee(
  state: GameSnapshot,
  employeeId: string,
  zoneId: string,
  brigadeId?: string,
): boolean {
  const emp = state.org.employees.find((e) => e.id === employeeId);
  if (!emp) return false;

  const brigade = brigadeId
    ? state.org.brigades.find((b) => b.id === brigadeId)
    : ensureBrigade(state.org, zoneId);
  if (!brigade) return false;

  assignToBrigade(state.org, employeeId, brigade.id, zoneId);
  applyPenaltyToOrg(state.org);
  recalcGrowthMetrics(state);

  logEvent(state, 'assign', `${emp.name} → ${zoneId}`, { employeeId, zoneId, brigadeId: brigade.id });
  state.commandJournal.push(`assign:${employeeId}:${zoneId}@${state.gameT.toFixed(2)}`);

  if (isManagerRole(emp.roleId)) {
    advanceTutorialOnForeman(state);
  } else if (state.growth.tutorialStep === 2) {
    state.growth.tutorialStep = 3;
  }

  state.growth.ui.panel = 'shop';
  state.growth.ui.hireItemId = null;
  return true;
}

function advanceTutorialOnHire(state: GameSnapshot): void {
  const workers = state.org.employees.filter((e) => !isManagerRole(e.roleId));
  if (state.growth.tutorialStep === 1 && workers.length >= 1) {
    state.growth.tutorialStep = 2;
  }
  if (workers.length >= TUTORIAL_CONFLICT_WORKERS && state.growth.tutorialStep < 4) {
    state.growth.tutorialStep = 4;
    for (const zone of ['machine', 'worker']) {
      createRoutineTask(state.org, zone, 'Конфликт приоритетов', state.gameT);
    }
  }
}

function advanceTutorialOnForeman(state: GameSnapshot): void {
  if (state.growth.tutorialStep >= 4) {
    state.growth.tutorialStep = 5;
  }
}

export function recalcGrowthMetrics(state: GameSnapshot): void {
  const salary = totalSalary(state.org.employees);
  let itemUpkeep = 0;
  let incomeBonus = 0;
  for (const id of state.growth.ownedItemIds) {
    const item = catalogById(id);
    if (item) {
      itemUpkeep += item.upkeep;
      incomeBonus += item.incomeBonus ?? 0;
    }
  }
  state.growth.totalUpkeep = salary + itemUpkeep;
  state.growth.bonusIncomeRate = incomeBonus * state.org.efficiencyMult;
}

export function resetOrgState(state: GameSnapshot): void {
  state.org = createInitialOrg();
  state.growth = createInitialGrowth();
  state.events = [];
  resetEventCounter(0);
}
