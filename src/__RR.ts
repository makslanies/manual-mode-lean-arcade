import type { GameController } from '@/game/GameController';
import { ACT1_LEN, ACT2_LEN, ACT3_LEN } from '@/core/constants';

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
    };
  }
}

export {};
