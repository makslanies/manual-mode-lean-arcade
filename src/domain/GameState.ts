import {
  DEFAULT_SEED,
  LOAD_TIME,
  START_MONEY,
  START_STOCK,
  SUPPLY_LEN,
  RULES_LEN,
} from '@/core/constants';
import type { GameSnapshot, ZoneState } from '@/core/types';
import { ZONE_DEFS } from './production/zones';
import { createRules } from './lean/rules';

function createZone(def: (typeof ZONE_DEFS)[0]): ZoneState {
  return {
    ...def,
    on: false,
    unlockAt: null,
    value: 0,
    failed: false,
    lookUntil: 0,
    sensor: false,
    warned: false,
    spawnT: 0,
  };
}

export function createInitialState(seed = DEFAULT_SEED): GameSnapshot {
  const zones = ZONE_DEFS.map(createZone);
  const zoneMap = Object.fromEntries(zones.map((z) => [z.id, z]));
  return {
    mode: 'title',
    gameT: 0,
    phaseT: 0,
    money: START_MONEY,
    comboMult: 1,
    comboN: 0,
    comboUntil: 0,
    accidents: 0,
    prevented: 0,
    autoActs: 0,
    stock: START_STOCK,
    tripsOnTime: 0,
    tripsLate: 0,
    powerOut: false,
    shake: 0,
    hitstop: 0,
    supplyLeft: SUPPLY_LEN,
    rulesLeft: RULES_LEN,
    stat: {
      1: { earned: 0, lost: 0 },
      2: { earned: 0, lost: 0 },
      3: { earned: 0, lost: 0 },
    },
    zones,
    zoneMap,
    trucks: [
      { id: 0, phase: 'load', t: LOAD_TIME, p: 0, deadline: 0, delivered: false, park: 0 },
      { id: 1, phase: 'load', t: LOAD_TIME + 8, p: 0, deadline: 0, delivered: false, park: 1 },
    ],
    rules: createRules(),
    pulses: [],
    director: {
      gx: 8,
      gy: 9.5,
      tx: 8,
      ty: 9.5,
      targetZone: null,
      fixing: null,
      step: 0,
      face: 1,
    },
    parts: [],
    floats: [],
    quips: [],
    quipCur: null,
    quipIdle: 0,
    coinAcc: 0,
    alarmAcc: 0,
    moneyPulse: 0,
    hintedOnce: {},
    selSensors: new Set(),
    selRules: new Set(),
    seed,
    commandJournal: [],
  };
}

export function resetRun(state: GameSnapshot): void {
  state.money = START_MONEY;
  state.comboMult = 1;
  state.comboN = 0;
  state.comboUntil = 0;
  state.accidents = 0;
  state.prevented = 0;
  state.autoActs = 0;
  state.stock = START_STOCK;
  state.tripsOnTime = 0;
  state.tripsLate = 0;
  state.powerOut = false;
  state.shake = 0;
  state.hitstop = 0;
  state.gameT = 0;
  state.phaseT = 0;
  state.supplyLeft = SUPPLY_LEN;
  state.rulesLeft = RULES_LEN;
  state.stat = {
    1: { earned: 0, lost: 0 },
    2: { earned: 0, lost: 0 },
    3: { earned: 0, lost: 0 },
  };
  state.parts = [];
  state.floats = [];
  state.pulses = [];
  for (const z of state.zones) {
    z.on = false;
    z.unlockAt = null;
    z.failed = false;
    z.sensor = false;
    z.value = 0;
    z.lookUntil = 0;
    z.warned = false;
    z.spawnT = 0;
  }
  for (const tr of state.trucks) {
    tr.phase = 'load';
    tr.t = LOAD_TIME + tr.id * 8;
    tr.p = 0;
    tr.deadline = 0;
    tr.delivered = false;
    delete tr.onTime;
  }
  for (const r of state.rules) {
    r.active = false;
    r.cd = 0;
    r.lastFire = -9;
  }
  state.quips = [];
  state.quipCur = null;
  state.quipIdle = 0;
  state.selSensors.clear();
  state.selRules.clear();
  state.hintedOnce = {};
  state.director = {
    gx: 8,
    gy: 9.5,
    tx: 8,
    ty: 9.5,
    targetZone: null,
    fixing: null,
    step: 0,
    face: 1,
  };
  state.coinAcc = 0;
  state.alarmAcc = 0;
  state.moneyPulse = 0;
  state.commandJournal = [];
}
