import type { GameSnapshot } from '@/core/types';
import type { TruckCallbacks } from '@/domain/production/trucks';
import { ruleCheck, ruleRun } from './ruleLogic';

export function updateRulesEngine(
  state: GameSnapshot,
  dt: number,
  truckCb: TruckCallbacks,
  cb: {
    onAuto: () => void;
    onFloatZone: (zone: string, txt: string) => void;
    maybeSay: (who: string, txt: string, chance: number) => void;
  },
): void {
  if (state.mode !== 'play3') return;
  for (const r of state.rules) {
    if (!r.active) continue;
    r.cd -= dt;
    if (r.cd > 0) continue;
    if (ruleCheck(state, r.id)) {
      ruleRun(state, r.id, truckCb);
      r.cd = 1.4;
      state.autoActs++;
      r.lastFire = state.gameT;
      cb.onFloatZone(r.zone, 'АВТО');
      state.pulses.push({ zone: r.zone, t: 0 });
      cb.onAuto();
      cb.maybeSay('ЩИТ ЛОГИКИ', 'Обработал сам, директор.', 0.25);
    }
  }
  for (let i = state.pulses.length - 1; i >= 0; i--) {
    state.pulses[i]!.t += dt * 1.8;
    if (state.pulses[i]!.t >= 1) state.pulses.splice(i, 1);
  }
}

export { ruleCheck, ruleRun } from './ruleLogic';
