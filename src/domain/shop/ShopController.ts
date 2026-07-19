import type { GameSnapshot } from '@/core/types';
import type { PurchasePreview, ShopItemDef } from './types';
import { SHOP_CATALOG, catalogById } from './CatalogItems';
import {
  blockReasonText,
  buildPrereqContext,
  canPurchase,
  checkPrerequisites,
} from './prerequisites';
import { hireFromShopItem, recalcGrowthMetrics } from '@/domain/org/OrgController';
import { logEvent } from '@/domain/economy/EventJournal';
import { isManagerRole } from '@/domain/org/Employee';
import { assignToBrigade, ensureBrigade } from '@/domain/org/Brigade';

export function listShopItems(state: GameSnapshot): PurchasePreview[] {
  const ctx = buildPrereqContext(state);
  return SHOP_CATALOG.map((item) => previewItem(item, ctx, state));
}

export function previewItem(
  item: ShopItemDef,
  ctx: ReturnType<typeof buildPrereqContext>,
  state: GameSnapshot,
): PurchasePreview {
  const blockReason = checkPrerequisites(item, ctx);
  const forecastUpkeep = state.growth.totalUpkeep + item.upkeep + (item.roleId ? 0 : 0);
  const forecastIncome = state.growth.bonusIncomeRate + (item.incomeBonus ?? 0);
  return { item, canBuy: blockReason === null, blockReason, forecastUpkeep, forecastIncome };
}

export function purchaseItem(state: GameSnapshot, itemId: string): { ok: boolean; error?: string } {
  const item = catalogById(itemId);
  if (!item) return { ok: false, error: 'unknown_item' };

  const ctx = buildPrereqContext(state);
  const block = checkPrerequisites(item, ctx);
  if (block) return { ok: false, error: block };

  state.money -= item.price;
  state.growth.ownedItemIds.push(itemId);
  logEvent(state, 'purchase', `Bought ${itemId}`, { itemId, price: item.price });
  state.commandJournal.push(`shop:${itemId}@${state.gameT.toFixed(2)}`);

  if (item.roleId) {
    const empId = hireFromShopItem(state, itemId);
    if (!empId) return { ok: false, error: 'hire_failed' };
    const emp = state.org.employees.find((e) => e.id === empId)!;
    if (isManagerRole(emp.roleId) && item.zoneId) {
      const brigade = ensureBrigade(state.org, item.zoneId);
      assignToBrigade(state.org, empId, brigade.id, item.zoneId);
      brigade.leaderId = empId;
    }
  }

  recalcGrowthMetrics(state);
  return { ok: true };
}

export function getBlockLabel(reason: string | null, labels: Record<string, string>): string {
  return blockReasonText(reason, labels);
}

export function isHireCategory(cat: ShopItemDef['category']): boolean {
  return cat === 'personnel' || cat === 'managers';
}

export function filterPurchasable(state: GameSnapshot, category: ShopItemDef['category']): PurchasePreview[] {
  const ctx = buildPrereqContext(state);
  return SHOP_CATALOG.filter((i) => i.category === category).map((item) => previewItem(item, ctx, state));
}

export function canBuyItem(state: GameSnapshot, itemId: string): boolean {
  const item = catalogById(itemId);
  if (!item) return false;
  return canPurchase(item, buildPrereqContext(state));
}
