import { describe, expect, it } from 'vitest';
import { freshState, unlockedShopState } from '../../helpers';
import { purchaseItem } from '@/domain/shop/ShopController';
import { resetOrgTickAcc, tickOrgEconomy } from '@/domain/economy/OrgTick';
import { resetEventCounter } from '@/domain/economy/EventJournal';
import { resetTaskCounter } from '@/domain/org/Manager';

describe('OrgTick — gated behavior', () => {
  it('negative: no economy changes when growth locked', () => {
    resetOrgTickAcc();
    const state = freshState();
    const before = state.money;
    tickOrgEconomy(state, 60);
    expect(state.money).toBe(before);
  });
});

describe('OrgTick — upkeep and income', () => {
  it('happy path: deducts upkeep when no bonus income', () => {
    resetOrgTickAcc();
    resetEventCounter(0);
    resetTaskCounter(0);
    const state = unlockedShopState(1, 500);
    purchaseItem(state, 'hire_operator');
    state.growth.bonusIncomeRate = 0;
    const before = state.money;
    tickOrgEconomy(state, 60);
    expect(state.money).toBeLessThan(before);
  });

  it('happy path: bonus income exceeds upkeep on short tick', () => {
    resetOrgTickAcc();
    const state = unlockedShopState(1, 500);
    purchaseItem(state, 'mat_raw_stock');
    state.org.efficiencyMult = 1;
    const before = state.money;
    tickOrgEconomy(state, 10);
    expect(state.money).toBeGreaterThan(before);
  });

  it('boundary: money never drops below zero from upkeep', () => {
    resetOrgTickAcc();
    const state = unlockedShopState(1, 200);
    purchaseItem(state, 'hire_operator');
    state.growth.bonusIncomeRate = 0;
    tickOrgEconomy(state, 3600);
    expect(state.money).toBe(0);
  });

  it('happy path: bonus income splits across stat zones', () => {
    resetOrgTickAcc();
    const state = unlockedShopState(1, 500);
    purchaseItem(state, 'mat_raw_stock');
    const earnedBefore = ([1, 2, 3] as const).map((p) => state.stat[p].earned);
    tickOrgEconomy(state, 10);
    const totalGain = ([1, 2, 3] as const).reduce(
      (sum, p, i) => sum + state.stat[p].earned - earnedBefore[i],
      0,
    );
    expect(totalGain).toBeGreaterThan(0);
  });
});

describe('OrgTick — periodic org simulation', () => {
  it('happy path: spawns routine tasks after 5s accrual', () => {
    resetOrgTickAcc();
    resetTaskCounter(0);
    const state = unlockedShopState(1, 5000);
    purchaseItem(state, 'hire_operator');
    state.org.employees[0].zoneId = 'machine';
    state.org.employees[0].status = 'available';

    tickOrgEconomy(state, 5);
    expect(state.org.tasks.some((t) => t.routine && t.zoneId === 'machine')).toBe(true);
  });
});
