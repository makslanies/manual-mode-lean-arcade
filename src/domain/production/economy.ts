import type { GameSnapshot, ZoneState } from '@/core/types';
import { phaseFromMode } from '@/core/FSM';
import { zoneProducing, zoneRate } from './flow';

export function addMoney(state: GameSnapshot, v: number): void {
  state.money += v;
  const p = phaseFromMode(state.mode);
  if (v >= 0) state.stat[p].earned += v;
  else state.stat[p].lost += -v;
}

export function applyPreventBonus(state: GameSnapshot): void {
  state.prevented++;
  state.comboN++;
  state.comboUntil = state.gameT + 6;
  state.comboMult = Math.min(3, 1 + state.comboN * 0.5);
  addMoney(state, 40);
}

export function tickEconomy(state: GameSnapshot, dt: number): void {
  const p = phaseFromMode(state.mode);
  let rate = 1;
  for (const z of state.zones) {
    if (z.kind === 'fridge' || z.kind === 'dock' || z.kind === 'power' || z.kind === 'hopper') continue;
    if (zoneProducing(state, z)) rate += zoneRate(z);
    else if (z.on) state.stat[p].lost += zoneRate(z) * dt;
  }
  const fridge = state.zoneMap.fridge!;
  if (fridge.on && !zoneProducing(state, fridge)) {
    state.stat[p].lost += zoneRate(fridge) * dt;
  }
  if (state.gameT > state.comboUntil) {
    state.comboMult = 1;
    state.comboN = 0;
  }
  addMoney(state, rate * state.comboMult * dt);
}

export function producingZones(state: GameSnapshot): ZoneState[] {
  return state.zones.filter((z) => zoneProducing(state, z));
}
