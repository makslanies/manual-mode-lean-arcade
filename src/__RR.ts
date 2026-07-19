import type { GameController } from '@/game/GameController';
import { ACT1_LEN, ACT2_LEN, ACT3_LEN } from '@/core/constants';
import { purchaseItem } from '@/domain/shop/ShopController';
import { assignEmployee } from '@/domain/org/OrgController';
import { aggregateOrgPenalty } from '@/domain/org/penalties';

export function installRR(ctrl: GameController): void {
  const api = {
    skipToSupply() {
      if (ctrl.state.mode === 'play') ctrl.state.phaseT = ACT1_LEN;
    },
    skipToRules() {
      if (ctrl.state.mode === 'play2') ctrl.state.phaseT = ACT2_LEN;
    },
    skipToEnd() {
      if (ctrl.state.mode === 'play3') ctrl.state.phaseT = ACT3_LEN;
    },
    state() {
      const s = ctrl.state;
      return {
        mode: s.mode,
        t: Math.round(s.phaseT),
        money: Math.round(s.money),
        accidents: s.accidents,
        prevented: s.prevented,
        autoActs: s.autoActs,
        stock: Math.round(s.stock),
        trips: `${s.tripsOnTime}/${s.tripsOnTime + s.tripsLate}`,
        powerOut: s.powerOut,
        rules: s.rules.filter((r) => r.active).map((r) => r.id),
        zones: s.zones.map((z) => ({
          id: z.id,
          on: z.on,
          v: +z.value.toFixed(2),
          failed: z.failed,
          sensor: z.sensor,
        })),
      };
    },
    org() {
      const s = ctrl.state;
      return {
        unlocked: s.growth.unlocked,
        tutorialStep: s.growth.tutorialStep,
        upkeep: s.growth.totalUpkeep,
        bonusIncome: s.growth.bonusIncomeRate,
        efficiency: s.org.efficiencyMult,
        chaos: s.org.chaosLevel,
        employees: s.org.employees.length,
        escalations: s.org.escalations.length,
        events: s.events.length,
      };
    },
    unlockShop() {
      ctrl.unlockShop();
    },
    openShop() {
      ctrl.openShop();
    },
    buy(itemId: string) {
      return purchaseItem(ctrl.state, itemId);
    },
    assign(employeeId: string, zoneId: string) {
      return assignEmployee(ctrl.state, employeeId, zoneId);
    },
    penalty() {
      return aggregateOrgPenalty(ctrl.state.org);
    },
  };
  (window as unknown as { __RR: typeof api }).__RR = api;
}

declare global {
  interface Window {
    __RR: ReturnType<typeof installRR> extends void ? never : {
      skipToSupply: () => void;
      skipToRules: () => void;
      skipToEnd: () => void;
      state: () => Record<string, unknown>;
      org: () => Record<string, unknown>;
      unlockShop: () => void;
      openShop: () => void;
      buy: (itemId: string) => { ok: boolean; error?: string };
      assign: (employeeId: string, zoneId: string) => boolean;
      penalty: () => import('@/domain/org/penalties').PenaltyResult;
    };
  }
}

export {};
