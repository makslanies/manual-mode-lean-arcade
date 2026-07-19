import type { GameSnapshot, ZoneState } from '@/core/types';
import { TRIP_WINDOW } from '@/core/constants';
import { clamp } from '@/core/math';

export function zoneVisible(state: GameSnapshot, z: ZoneState): boolean {
  return z.sensor || state.gameT < z.lookUntil;
}

export function machineFlow(state: GameSnapshot): boolean {
  const m = state.zoneMap.machine!;
  const h = state.zoneMap.hopper!;
  return m.on && !m.failed && !state.powerOut && !(h.on && h.value >= 1);
}

export function pressFlow(state: GameSnapshot): boolean {
  const p = state.zoneMap.press!;
  return p.on && !p.failed && !state.powerOut && machineFlow(state);
}

export function chainFlow(state: GameSnapshot): boolean {
  return state.zoneMap.press!.on ? pressFlow(state) : machineFlow(state);
}

export function zoneProducing(state: GameSnapshot, z: ZoneState): boolean {
  if (!z.on) return false;
  switch (z.kind) {
    case 'machine':
      return machineFlow(state);
    case 'press':
      return pressFlow(state);
    case 'worker':
      return !z.failed && !state.powerOut && chainFlow(state);
    case 'fridge':
      return z.value < 0.85;
    default:
      return false;
  }
}

export function zoneRate(z: ZoneState): number {
  switch (z.kind) {
    case 'machine':
      return 3;
    case 'press':
      return 3;
    case 'worker':
      return 4;
    case 'fridge':
      return 2;
    default:
      return 0;
  }
}

export function dockDeadlineLeft(state: GameSnapshot): number {
  let m = Infinity;
  for (const tr of state.trucks) {
    if (tr.phase !== 'route' && tr.deadline) {
      m = Math.min(m, tr.deadline - state.gameT);
    }
  }
  return m;
}

export function zoneProblem(state: GameSnapshot, z: ZoneState): string | null {
  if (!z.on) return null;
  const Z = state.zoneMap;
  switch (z.kind) {
    case 'machine':
      if (state.powerOut) return 'НЕТ ПИТАНИЯ';
      if (z.failed) return 'АВАРИЯ';
      if (Z.hopper!.on && Z.hopper!.value >= 1) return 'НЕТ СЫРЬЯ';
      return null;
    case 'press':
      if (state.powerOut) return 'НЕТ ПИТАНИЯ';
      if (z.failed) return 'АВАРИЯ';
      if (!machineFlow(state)) return 'НЕТ ДЕТАЛЕЙ';
      return null;
    case 'hopper':
      return z.value >= 1 ? 'ПУСТО' : null;
    case 'worker':
      if (z.failed) return 'СПИТ';
      if (state.powerOut) return 'НЕТ ПИТАНИЯ';
      if (!chainFlow(state)) return 'НЕТ ПОТОКА';
      return null;
    case 'fridge':
      return z.value >= 0.85 ? 'ТЕПЛЕЕТ' : null;
    case 'power':
      return state.powerOut ? 'ВЫБИЛО АВТОМАТ' : null;
    case 'dock': {
      const ready = state.trucks.some((t) => t.phase === 'ready');
      if (ready && state.stock < 25) return 'НЕТ ГРУЗА';
      if (dockDeadlineLeft(state) < 6) return 'РЕЙС ГОРИТ';
      return null;
    }
  }
  return null;
}

export function problemCount(state: GameSnapshot): number {
  let n = 0;
  for (const z of state.zones) {
    if (z.on && (z.failed || zoneProblem(state, z))) n++;
  }
  return n;
}

export function gaugeFill(state: GameSnapshot, z: ZoneState): number {
  if (z.kind === 'hopper') return 1 - z.value;
  if (z.kind === 'dock') {
    const left = dockDeadlineLeft(state);
    const v = left === Infinity ? 0 : clamp(1 - left / TRIP_WINDOW, 0, 1);
    return 1 - v;
  }
  return z.value;
}

export function gaugeRaw(state: GameSnapshot, z: ZoneState): number {
  if (z.kind === 'hopper') return z.value;
  if (z.kind === 'dock') {
    const left = dockDeadlineLeft(state);
    return left === Infinity ? 0 : clamp(1 - left / TRIP_WINDOW, 0, 1);
  }
  return z.value;
}
