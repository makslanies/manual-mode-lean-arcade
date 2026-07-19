import { describe, expect, it } from 'vitest';
import { createInitialState, resetRun } from '@/domain/GameState';
import { enterEnd, prepareSupply } from '@/domain/phases';
import { unlockGrowth, GROWTH_BONUS_MONEY } from '@/domain/org/OrgController';
import { purchaseItem } from '@/domain/shop/ShopController';
import { START_MONEY } from '@/core/constants';

describe('resetRun preserves growth layer', () => {
  it('keeps employees and unlocked shop across shifts', () => {
    const state = createInitialState(1);
    unlockGrowth(state);
    const bought = purchaseItem(state, 'hire_operator');
    expect(bought.ok).toBe(true);
    const empCount = state.org.employees.length;
    const money = state.money;

    resetRun(state);
    expect(state.growth.unlocked).toBe(true);
    expect(state.org.employees).toHaveLength(empCount);
    expect(state.money).toBe(money);
    expect(state.growth.ui.shopOpen).toBe(false);
  });

  it('hard resetOrg wipes growth when requested', () => {
    const state = createInitialState(1);
    unlockGrowth(state);
    purchaseItem(state, 'hire_operator');
    resetRun(state, { resetOrg: true });
    expect(state.growth.unlocked).toBe(false);
    expect(state.org.employees).toHaveLength(0);
    expect(state.money).toBe(START_MONEY);
  });
});

describe('enterEnd unlocks and auto-opens shop once', () => {
  it('opens shop on first unlock at end', () => {
    const state = createInitialState(2);
    expect(state.growth.unlocked).toBe(false);
    enterEnd(state);
    expect(state.mode).toBe('end');
    expect(state.growth.unlocked).toBe(true);
    expect(state.growth.ui.shopOpen).toBe(true);
    expect(state.money).toBe(START_MONEY + GROWTH_BONUS_MONEY);
  });

  it('does not re-open shop if already unlocked earlier', () => {
    const state = createInitialState(3);
    prepareSupply(state);
    expect(state.growth.unlocked).toBe(true);
    state.growth.ui.shopOpen = false;
    enterEnd(state);
    expect(state.growth.ui.shopOpen).toBe(false);
  });
});
