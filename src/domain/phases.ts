import type { GameSnapshot } from '@/core/types';
import {
  RULE_BUDGET,
  RULES_LEN,
  SENSOR_BUDGET,
  SENSOR_PRIORITY,
  SUPPLY_LEN,
  TRIP_WINDOW,
} from '@/core/constants';
import { actLength, nextModeAfterPhase } from '@/core/FSM';

export function unlockZonesAct1(state: GameSnapshot, cb: { onUnlock: (name: string) => void }): void {
  if (state.mode !== 'play') return;
  for (const z of state.zones) {
    if (!z.on && state.phaseT >= z.unlock) {
      z.on = true;
      z.unlockAt = state.gameT;
      z.value =
        z.kind === 'hopper' ? 0.35 : z.kind === 'dock' || z.kind === 'power' ? 0.2 : 0.45;
      if (z.kind === 'dock') {
        for (const tr of state.trucks) {
          tr.deadline = state.gameT + TRIP_WINDOW + tr.id * 8;
        }
      }
      cb.onUnlock(z.name);
    }
  }
}

export function prepareSupply(state: GameSnapshot): void {
  state.mode = 'supply';
  state.supplyLeft = SUPPLY_LEN;
  state.director.fixing = null;
  state.director.targetZone = null;
  state.selSensors.clear();
}

export function mountSensors(state: GameSnapshot): void {
  if (state.selSensors.size < SENSOR_BUDGET) {
    for (const id of SENSOR_PRIORITY) {
      if (state.selSensors.size >= SENSOR_BUDGET) break;
      state.selSensors.add(id);
    }
  }
  for (const id of state.selSensors) {
    state.zoneMap[id]!.sensor = true;
  }
  state.mode = 'play2';
  state.phaseT = 0;
  for (const z of state.zones) {
    z.on = true;
    if (z.unlockAt == null) z.unlockAt = state.gameT;
    z.failed = false;
    z.value = Math.min(z.value, 0.4);
  }
  state.powerOut = false;
  for (const tr of state.trucks) {
    if (tr.deadline < state.gameT) tr.deadline = state.gameT + TRIP_WINDOW + tr.id * 8;
  }
}

export function prepareRules(state: GameSnapshot): void {
  state.mode = 'rules';
  state.rulesLeft = RULES_LEN;
  state.director.fixing = null;
  state.director.targetZone = null;
  state.selRules.clear();
}

export function wireRules(state: GameSnapshot): void {
  if (!state.selRules.size) {
    for (const r of state.rules) {
      if (state.zoneMap[r.zone]!.sensor && state.selRules.size < RULE_BUDGET) {
        state.selRules.add(r.id);
      }
    }
  }
  for (const r of state.rules) {
    r.active = state.selRules.has(r.id);
    r.cd = 0;
  }
  state.mode = 'play3';
  state.phaseT = 0;
  for (const z of state.zones) {
    z.failed = false;
    z.value = Math.min(z.value, 0.4);
  }
  state.powerOut = false;
  for (const tr of state.trucks) {
    if (tr.deadline < state.gameT) tr.deadline = state.gameT + TRIP_WINDOW + tr.id * 8;
  }
}

export function tickPhaseTimer(state: GameSnapshot): void {
  state.phaseT += 0; // incremented in simulation
  const len = actLength(state.mode);
  if (state.phaseT >= len) {
    const next = nextModeAfterPhase(state.mode);
    if (next === 'supply') prepareSupply(state);
    else if (next === 'rules') prepareRules(state);
    else if (next === 'end') state.mode = 'end';
  }
}

export function resetBetweenActs(state: GameSnapshot): void {
  state.director.fixing = null;
  state.director.targetZone = null;
}
