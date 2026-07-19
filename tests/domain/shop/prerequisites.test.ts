import { describe, expect, it } from 'vitest';
import { freshState } from '../../helpers';
import { SHOP_CATALOG } from '@/domain/shop/CatalogItems';
import type { ShopItemDef } from '@/domain/shop/types';
import {
  blockReasonText,
  buildPrereqContext,
  canPurchase,
  checkPrerequisites,
} from '@/domain/shop/prerequisites';
import { purchaseItem } from '@/domain/shop/ShopController';
import { unlockGrowth } from '@/domain/org/OrgController';

describe('shop prerequisites', () => {
  it('exposes at least six categories', () => {
    const cats = new Set(SHOP_CATALOG.map((i) => i.category));
    expect(cats.size).toBeGreaterThanOrEqual(6);
  });

  it('blocks assembler until operator is owned', () => {
    const state = freshState();
    unlockGrowth(state);
    state.money = 5000;
    const assembler = SHOP_CATALOG.find((i) => i.id === 'hire_assembler')!;
    const ctx = buildPrereqContext(state);
    expect(canPurchase(assembler, ctx)).toBe(false);
    expect(checkPrerequisites(assembler, ctx)).toMatch(/^needs:/);

    purchaseItem(state, 'hire_operator');
    const ctx2 = buildPrereqContext(state);
    expect(canPurchase(assembler, ctx2)).toBe(true);
  });

  it('blocks foreman until tutorial step 3', () => {
    const state = freshState();
    unlockGrowth(state);
    state.money = 5000;
    state.growth.ownedItemIds.push('hire_operator');
    state.growth.tutorialStep = 2;
    const foreman = SHOP_CATALOG.find((i) => i.id === 'mgr_foreman')!;
    expect(checkPrerequisites(foreman, buildPrereqContext(state))).toBe('tutorial_locked');
    state.growth.tutorialStep = 3;
    expect(checkPrerequisites(foreman, buildPrereqContext(state))).toBeNull();
  });

  it('negative: blocks already owned items', () => {
    const state = freshState();
    unlockGrowth(state);
    state.money = 5000;
    state.growth.ownedItemIds.push('hire_operator');
    const operator = SHOP_CATALOG.find((i) => i.id === 'hire_operator')!;
    expect(checkPrerequisites(operator, buildPrereqContext(state))).toBe('already_owned');
  });

  it('boundary: minMoney gate blocks before price check', () => {
    const item: ShopItemDef = {
      id: 'test_gate',
      category: 'materials',
      nameKey: 'test',
      descriptionKey: 'test',
      price: 10,
      upkeep: 0,
      prerequisites: [],
      minMoney: 500,
    };
    const ctx = { money: 100, ownedItemIds: [] as string[], tutorialStep: 99, employeeCount: 0 };
    expect(checkPrerequisites(item, ctx)).toBe('insufficient_money');
    expect(canPurchase(item, ctx)).toBe(false);
  });

  it('blockReasonText handles needs prefix and unknown codes', () => {
    const labels = { needsDefault: 'Need {id}', alreadyOwned: 'Owned' };
    expect(blockReasonText('needs:mat_raw_stock', labels)).toContain('mat_raw_stock');
    expect(blockReasonText('custom_code', labels)).toBe('custom_code');
  });
});
