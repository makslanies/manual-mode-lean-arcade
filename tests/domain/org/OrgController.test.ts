import { describe, expect, it } from 'vitest';
import { freshState, unlockedShopState } from '../../helpers';
import {
  GROWTH_BONUS_MONEY,
  TUTORIAL_CONFLICT_WORKERS,
  assignEmployee,
  createInitialGrowth,
  createInitialOrg,
  hireFromShopItem,
  recalcGrowthMetrics,
  resetOrgState,
  unlockGrowth,
} from '@/domain/org/OrgController';
import { purchaseItem } from '@/domain/shop/ShopController';
import { resetEventCounter } from '@/domain/economy/EventJournal';

describe('OrgController — unlockGrowth', () => {
  it('happy path: unlocks shop and grants bonus money', () => {
    resetEventCounter(0);
    const state = freshState();
    const before = state.money;
    unlockGrowth(state);

    expect(state.growth.unlocked).toBe(true);
    expect(state.growth.tutorialStep).toBe(1);
    expect(state.money).toBe(before + GROWTH_BONUS_MONEY);
    expect(state.events.some((e) => e.type === 'growth_unlock')).toBe(true);
  });

  it('boundary: second unlock is idempotent', () => {
    const state = freshState();
    unlockGrowth(state);
    const afterFirst = state.money;
    unlockGrowth(state);
    expect(state.money).toBe(afterFirst);
    expect(state.growth.tutorialStep).toBe(1);
  });
});

describe('OrgController — assignEmployee', () => {
  it('negative: returns false for unknown employee', () => {
    const state = unlockedShopState();
    expect(assignEmployee(state, 'emp_missing', 'machine')).toBe(false);
  });

  it('negative: returns false for unknown brigade id', () => {
    const state = unlockedShopState();
    purchaseItem(state, 'hire_operator');
    const emp = state.org.employees[0];
    expect(assignEmployee(state, emp.id, 'machine', 'brig_999')).toBe(false);
  });

  it('happy path: advances tutorial from step 2 to 3 on worker assign', () => {
    const state = unlockedShopState();
    state.growth.tutorialStep = 2;
    purchaseItem(state, 'hire_operator');
    const emp = state.org.employees[0];
    assignEmployee(state, emp.id, 'machine');
    expect(state.growth.tutorialStep).toBe(3);
  });

  it('boundary: conflict tutorial fires at exactly three workers', () => {
    const state = unlockedShopState(1, 20_000);
    state.growth.tutorialStep = 2;

    for (let i = 0; i < TUTORIAL_CONFLICT_WORKERS; i++) {
      hireFromShopItem(state, 'hire_operator');
    }
    expect(state.growth.tutorialStep).toBe(4);
    expect(state.org.tasks.filter((t) => t.routine).length).toBeGreaterThanOrEqual(2);
  });
});

describe('OrgController — recalcGrowthMetrics', () => {
  it('sums employee salary and owned item upkeep', () => {
    const state = unlockedShopState();
    purchaseItem(state, 'hire_operator');
    purchaseItem(state, 'mat_raw_stock');

    recalcGrowthMetrics(state);
    expect(state.growth.totalUpkeep).toBe(12 + 12 + 4);
    expect(state.growth.bonusIncomeRate).toBeCloseTo(0.3);
  });

  it('scales bonus income by org efficiency', () => {
    const state = unlockedShopState();
    purchaseItem(state, 'mat_raw_stock');
    state.org.efficiencyMult = 0.75;
    recalcGrowthMetrics(state);
    expect(state.growth.bonusIncomeRate).toBeCloseTo(0.3 * 0.75);
  });
});

describe('OrgController — hireFromShopItem', () => {
  it('negative: returns null for non-hire catalog item', () => {
    const state = unlockedShopState();
    expect(hireFromShopItem(state, 'mat_raw_stock')).toBeNull();
    expect(hireFromShopItem(state, 'unknown')).toBeNull();
  });

  it('happy path: logs hire event and command journal entry', () => {
    resetEventCounter(0);
    const state = unlockedShopState();
    const id = hireFromShopItem(state, 'hire_operator');
    expect(id).toBe('emp_1');
    expect(state.events.some((e) => e.type === 'hire')).toBe(true);
    expect(state.commandJournal.some((c) => c.startsWith('hire:hire_operator'))).toBe(true);
  });
});

describe('OrgController — resetOrgState', () => {
  it('clears org, growth, and events', () => {
    const state = unlockedShopState();
    purchaseItem(state, 'hire_operator');
    resetOrgState(state);
    expect(state.org.employees).toHaveLength(0);
    expect(state.growth.unlocked).toBe(false);
    expect(state.events).toHaveLength(0);
    expect(state.growth).toEqual(createInitialGrowth());
    expect(state.org).toEqual(createInitialOrg());
  });
});
