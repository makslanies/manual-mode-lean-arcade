import { describe, expect, it } from 'vitest';
import { freshState, unlockedShopState } from '../../helpers';
import { unlockGrowth } from '@/domain/org/OrgController';
import {
  canBuyItem,
  filterPurchasable,
  getBlockLabel,
  listShopItems,
  purchaseItem,
} from '@/domain/shop/ShopController';
import { catalogById } from '@/domain/shop/CatalogItems';
import { resetEventCounter } from '@/domain/economy/EventJournal';

describe('ShopController — purchase', () => {
  it('happy path: buys material and updates growth metrics', () => {
    resetEventCounter(0);
    const state = unlockedShopState(1, 500);
    const before = state.money;

    const result = purchaseItem(state, 'mat_raw_stock');
    expect(result.ok).toBe(true);
    expect(state.money).toBe(before - 120);
    expect(state.growth.ownedItemIds).toContain('mat_raw_stock');
    expect(state.growth.bonusIncomeRate).toBeCloseTo(0.3);
    expect(state.events.some((e) => e.type === 'purchase')).toBe(true);
    expect(state.commandJournal.some((c) => c.startsWith('shop:mat_raw_stock'))).toBe(true);
  });

  it('happy path: hire purchase creates employee', () => {
    const state = unlockedShopState(1, 500);
    const result = purchaseItem(state, 'hire_operator');
    expect(result.ok).toBe(true);
    expect(state.org.employees).toHaveLength(1);
    expect(state.org.employees[0].roleId).toBe('operator');
    expect(state.growth.ui.panel).toBe('hire');
  });

  it('boundary: succeeds at exact price', () => {
    const state = unlockedShopState(1, 180);
    expect(purchaseItem(state, 'hire_operator').ok).toBe(true);
    expect(state.money).toBe(0);
  });

  it('boundary: fails one ruble short', () => {
    const state = unlockedShopState(1, 179);
    const result = purchaseItem(state, 'hire_operator');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('insufficient_money');
    expect(state.growth.ownedItemIds).not.toContain('hire_operator');
  });

  it('negative: rejects unknown item', () => {
    const state = unlockedShopState();
    const result = purchaseItem(state, 'nonexistent_item');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('unknown_item');
  });

  it('negative: rejects duplicate purchase', () => {
    const state = unlockedShopState();
    purchaseItem(state, 'mat_raw_stock');
    const result = purchaseItem(state, 'mat_raw_stock');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('already_owned');
  });

  it('negative: rejects blocked prerequisite chain', () => {
    const state = unlockedShopState();
    const result = purchaseItem(state, 'hire_assembler');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/^needs:/);
  });
});

describe('ShopController — previews', () => {
  it('listShopItems marks blocked items', () => {
    const state = unlockedShopState();
    const previews = listShopItems(state);
    expect(previews.length).toBeGreaterThanOrEqual(18);

    const assembler = previews.find((p) => p.item.id === 'hire_assembler')!;
    expect(assembler.canBuy).toBe(false);
    expect(assembler.blockReason).toMatch(/^needs:/);

    const operator = previews.find((p) => p.item.id === 'hire_operator')!;
    expect(operator.canBuy).toBe(true);
    expect(operator.blockReason).toBeNull();
  });

  it('canBuyItem reflects prerequisite state', () => {
    const state = unlockedShopState();
    expect(canBuyItem(state, 'hire_operator')).toBe(true);
    expect(canBuyItem(state, 'hire_assembler')).toBe(false);
    expect(canBuyItem(state, 'bogus')).toBe(false);

    purchaseItem(state, 'hire_operator');
    expect(canBuyItem(state, 'hire_assembler')).toBe(true);
  });

  it('filterPurchasable scopes by category', () => {
    const state = unlockedShopState();
    const personnel = filterPurchasable(state, 'personnel');
    expect(personnel.every((p) => p.item.category === 'personnel')).toBe(true);
    expect(personnel.length).toBeGreaterThanOrEqual(4);
  });

  it('getBlockLabel maps reason codes to labels', () => {
    const labels = {
      alreadyOwned: 'Already bought',
      noMoney: 'Need cash',
      tutorialLocked: 'Finish tutorial',
      needsDefault: 'Needs {id}',
    };
    expect(getBlockLabel('already_owned', labels)).toBe('Already bought');
    expect(getBlockLabel('needs:hire_operator', labels)).toContain('hire_operator');
    expect(getBlockLabel(null, labels)).toBe('');
  });

  it('preview forecast includes item upkeep and income', () => {
    const state = unlockedShopState();
    const item = catalogById('mat_raw_stock')!;
    purchaseItem(state, 'mat_raw_stock');
    const preview = listShopItems(state).find((p) => p.item.id === 'mat_spare_parts')!;
    expect(preview.forecastUpkeep).toBeGreaterThan(state.growth.totalUpkeep - item.upkeep);
  });
});

describe('ShopController — locked growth', () => {
  it('can still evaluate prerequisites before unlock', () => {
    const state = freshState();
    expect(state.growth.unlocked).toBe(false);
    const operator = listShopItems(state).find((p) => p.item.id === 'hire_operator')!;
    expect(operator.canBuy).toBe(true);
  });

  it('unlockGrowth is required for tutorial-gated items', () => {
    const state = freshState();
    unlockGrowth(state);
    state.money = 5000;
    state.growth.ownedItemIds.push('hire_operator');
    state.growth.tutorialStep = 2;
    expect(purchaseItem(state, 'mgr_foreman').error).toBe('tutorial_locked');
  });
});
