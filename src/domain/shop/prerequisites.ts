import type { GameSnapshot } from '@/core/types';
import type { ShopItemDef } from './types';
import { catalogById } from './CatalogItems';

export interface PrereqContext {
  money: number;
  ownedItemIds: string[];
  tutorialStep: number;
  employeeCount: number;
}

export function buildPrereqContext(state: GameSnapshot): PrereqContext {
  return {
    money: state.money,
    ownedItemIds: state.growth.ownedItemIds,
    tutorialStep: state.growth.tutorialStep,
    employeeCount: state.org.employees.length,
  };
}

export function checkPrerequisites(item: ShopItemDef, ctx: PrereqContext): string | null {
  if (ctx.ownedItemIds.includes(item.id)) {
    return 'already_owned';
  }
  if (item.minMoney !== undefined && ctx.money < item.minMoney) {
    return 'insufficient_money';
  }
  if (ctx.money < item.price) {
    return 'insufficient_money';
  }
  if (item.minTutorialStep !== undefined && ctx.tutorialStep < item.minTutorialStep) {
    return 'tutorial_locked';
  }
  for (const req of item.prerequisites) {
    if (!ctx.ownedItemIds.includes(req)) {
      const dep = catalogById(req);
      return dep ? `needs:${dep.id}` : `needs:${req}`;
    }
  }
  return null;
}

export function blockReasonText(reason: string | null, labels: Record<string, string>): string {
  if (!reason) return '';
  if (reason === 'already_owned') return labels.alreadyOwned ?? 'Already purchased';
  if (reason === 'insufficient_money') return labels.noMoney ?? 'Not enough cash';
  if (reason === 'tutorial_locked') return labels.tutorialLocked ?? 'Complete tutorial step first';
  if (reason.startsWith('needs:')) {
    const id = reason.slice(6);
    return (labels[`needs_${id}`] ?? labels.needsDefault ?? 'Requires prior purchase').replace('{id}', id);
  }
  return reason;
}

export function canPurchase(item: ShopItemDef, ctx: PrereqContext): boolean {
  return checkPrerequisites(item, ctx) === null;
}
