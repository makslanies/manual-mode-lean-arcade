import type { GameSnapshot } from '@/core/types';
import { createInitialState, resetRun } from '@/domain/GameState';
import { unlockGrowth } from '@/domain/org/OrgController';
import type { TruckCallbacks } from '@/domain/production/trucks';
import type { FailCallbacks } from '@/domain/production/failures';

export function freshState(seed = 1): GameSnapshot {
  const s = createInitialState(seed);
  resetRun(s);
  return s;
}

export function gameplayState(mode: GameSnapshot['mode'] = 'play', seed = 1): GameSnapshot {
  const s = freshState(seed);
  s.mode = mode;
  return s;
}

/** Growth-unlocked state with configurable cash for shop/org tests. */
export function unlockedShopState(seed = 1, money = 10_000): GameSnapshot {
  const s = freshState(seed);
  unlockGrowth(s);
  s.money = money;
  return s;
}

export function noopTruckCb(): TruckCallbacks {
  return {
    onTruck: () => {},
    onCoin: () => {},
    onFloat: () => {},
    onBreak: () => {},
    onHintOnce: () => {},
    onSay: () => {},
    maybeSay: () => {},
  };
}

export function noopFailCb(): FailCallbacks {
  return {
    onBreak: () => {},
    onAlarm: () => {},
    onFloat: () => {},
    onHintOnce: () => {},
    onSay: () => {},
    onPuff: () => {},
    onSmoke: () => {},
    onZzz: () => {},
  };
}

export function activateRule(state: GameSnapshot, ruleId: string): void {
  const rule = state.rules.find((r) => r.id === ruleId);
  if (rule) {
    rule.active = true;
    rule.cd = 0;
  }
}
