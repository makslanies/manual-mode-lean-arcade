import type { GameMode } from './types';
import {
  ACT1_LEN,
  ACT2_LEN,
  ACT3_LEN,
  RULES_LEN,
  SUPPLY_LEN,
} from './constants';

export function phaseFromMode(mode: GameMode): 1 | 2 | 3 {
  if (mode === 'play3') return 3;
  if (mode === 'play2') return 2;
  return 1;
}

export function actLength(mode: GameMode): number {
  if (mode === 'play3') return ACT3_LEN;
  if (mode === 'play2') return ACT2_LEN;
  return ACT1_LEN;
}

export function isGameplayMode(mode: GameMode): boolean {
  return mode === 'play' || mode === 'play2' || mode === 'play3';
}

export function overlayOpen(mode: GameMode): boolean {
  return mode === 'title' || mode === 'supply' || mode === 'rules' || mode === 'end';
}

export function pauseCountdown(mode: GameMode): 'supply' | 'rules' | null {
  if (mode === 'supply') return 'supply';
  if (mode === 'rules') return 'rules';
  return null;
}

export function pauseDuration(kind: 'supply' | 'rules'): number {
  return kind === 'supply' ? SUPPLY_LEN : RULES_LEN;
}

export function difficulty(mode: GameMode, phaseT: number): number {
  if (mode === 'play') {
    const t = Math.max(0, Math.min(1, phaseT / ACT1_LEN));
    return 1 + t * 0.85; // gentler ramp — more time to react
  }
  return mode === 'play3' ? 2.0 : 1.85;
}

export function nextModeAfterPhase(mode: GameMode): GameMode | null {
  switch (mode) {
    case 'play':
      return 'supply';
    case 'play2':
      return 'rules';
    case 'play3':
      return 'end';
    default:
      return null;
  }
}

export function gameplayModeAfterPause(mode: GameMode): GameMode | null {
  if (mode === 'supply') return 'play2';
  if (mode === 'rules') return 'play3';
  return null;
}
