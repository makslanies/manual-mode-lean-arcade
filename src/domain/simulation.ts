import type { GameSnapshot } from '@/core/types';
import { SeedRng } from '@/core/Seed';
import {
  actLength,
  difficulty,
  isGameplayMode,
  nextModeAfterPhase,
} from '@/core/FSM';
import { clamp } from '@/core/math';
import { machineFlow, pressFlow, zoneProducing, dockDeadlineLeft } from './production/flow';
import { tickEconomy } from './production/economy';
import { tickZoneValues } from './production/failures';
import { updateTrucks, type TruckCallbacks } from './production/trucks';
import { updateRulesEngine } from './lean/rulesEngine';
import { updateDirector, keyMoveDirector } from './director';
import { unlockZonesAct1, prepareSupply, prepareRules } from './phases';
import {
  addFloat,
  hintOnce,
  puff,
  say,
  tickCoinParticles,
  tickPhoneAlarm,
  updateParticles,
  updateQuips,
} from './effects';

export interface SimHooks {
  keys: Record<string, boolean>;
  screenPos: (gx: number, gy: number) => { x: number; y: number };
  scale: number;
  hudCenter: { x: number; y: number };
  onHint: (txt: string) => void;
  audio: {
    alarm: () => void;
    break: () => void;
    coin: () => void;
    fix: () => void;
    prevent: () => void;
    truck: () => void;
    auto: () => void;
    phone: () => void;
    unlock: () => void;
  };
}

export function simulateStep(state: GameSnapshot, dt: number, hooks: SimHooks): void {
  const rng = new SeedRng(state.seed + Math.floor(state.gameT * 1000));
  state.gameT += dt;
  const d = difficulty(state.mode, state.phaseT);

  if (state.mode === 'play') {
    unlockZonesAct1(state, {
      onUnlock: (name) => {
        hooks.audio.unlock();
        hooks.onHint(`НОВАЯ ЗОНА: ${name}`);
      },
    });
  }

  const truckCb: TruckCallbacks = {
    onTruck: () => hooks.audio.truck(),
    onCoin: () => hooks.audio.coin(),
    onFloat: (txt, color, size) => {
      const s = hooks.screenPos(13.4, 8.8);
      addFloat(state, s.x, s.y - 60 * hooks.scale, txt, color, size);
    },
    onBreak: () => {
      hooks.audio.break();
    },
    onHintOnce: (k, t) => hintOnce(state, k, t, hooks.onHint),
    onSay: (w, t) => say(state, w, t),
    maybeSay: (w, t, c) => {
      if (rng.chance(c)) say(state, w, t);
    },
  };

  const zoneCbBase = {
    onBreak: () => {
      hooks.audio.break();
      state.shake = 4;
      state.hitstop = 0.06;
    },
    onAlarm: () => hooks.audio.alarm(),
    onHintOnce: (k: string, t: string) => hintOnce(state, k, t, hooks.onHint),
    onSay: (w: string, t: string) => say(state, w, t),
  };

  for (const z of state.zones) {
    const s = hooks.screenPos(z.gx, z.gy);
    const localCb = {
      ...zoneCbBase,
      onFloat: (txt: string, color: string, size = 16) =>
        addFloat(state, s.x, s.y - 70 * hooks.scale, txt, color, size),
      onPuff: (n: number, color: string, spread = 40, up = -40) =>
        puff(state, s.x, s.y - 30 * hooks.scale, n, color, spread, up, rng),
      onSmoke: () => {
        state.parts.push({
          t: 'smoke',
          x: s.x + (rng.next() - 0.5) * 14,
          y: s.y,
          vx: (rng.next() - 0.5) * 12,
          vy: -34 - rng.next() * 20,
          life: 1.6,
          size: 5 + rng.next() * 6,
          color: '#5d6a85',
        });
      },
      onZzz: () => {
        state.parts.push({
          t: 'zzz',
          x: s.x + 10,
          y: s.y - 56 * hooks.scale,
          vx: 8,
          vy: -22,
          life: 1.6,
          size: 13,
          color: '#7e8db0',
        });
      },
    };
    tickZoneValues(state, z, dt, d, rng, localCb);
    if (z.sensor) {
      const warnNow =
        z.kind === 'dock'
          ? dockDeadlineLeft(state) < 8 && dockDeadlineLeft(state) >= 0
          : z.value >= 0.7 && !z.failed;
      if (warnNow && !z.warned) {
        z.warned = true;
        hooks.audio.alarm();
        addFloat(state, s.x, s.y - 84 * hooks.scale, 'ТРЕВОГА', '#ffb020', 15);
      }
      if (!warnNow) z.warned = false;
    }
  }

  updateTrucks(state, dt, truckCb);
  updateRulesEngine(state, dt, truckCb, {
    onAuto: () => hooks.audio.auto(),
    onFloatZone: (zoneId, txt) => {
      const z = state.zoneMap[zoneId]!;
      const s = hooks.screenPos(z.gx, z.gy);
      addFloat(state, s.x, s.y - 92 * hooks.scale, txt, '#35d6e8', 14);
    },
    maybeSay: (w, t, c) => {
      if (rng.chance(c)) say(state, w, t);
    },
  });
  updateQuips(state, dt, rng);

  let mk = 0;
  if (machineFlow(state)) mk += 1.0;
  if (pressFlow(state)) mk += 1.0;
  if (state.zoneMap.worker!.on && zoneProducing(state, state.zoneMap.worker!)) mk += 1.2;
  state.stock = clamp(state.stock + mk * dt, 0, 99);

  tickEconomy(state, dt);

  tickCoinParticles(state, dt, rng, hooks.screenPos, hooks.scale, () => hooks.audio.coin());
  tickPhoneAlarm(state, dt, () => hooks.audio.phone());

  updateDirector(state, dt, truckCb, {
    onFloat: (txt, color, size) => {
      const z = state.director.fixing?.zone;
      if (!z) return;
      const s = hooks.screenPos(z.gx, z.gy);
      addFloat(state, s.x, s.y - 70 * hooks.scale, txt, color, size);
    },
    onPuff: () => {
      const s = hooks.screenPos(state.director.gx, state.director.gy);
      puff(state, s.x, s.y - 30 * hooks.scale, 10, '#35d6e8', 40, -40, rng);
    },
    onPrevent: () => hooks.audio.prevent(),
    onFix: () => hooks.audio.fix(),
    onDust: () => {
      const s = hooks.screenPos(state.director.gx, state.director.gy);
      puff(state, s.x, s.y + 4, 1, '#33415f', 8, -6, rng);
    },
  });

  state.phaseT += dt;
  const len = actLength(state.mode);
  if (state.phaseT >= len) {
    const next = nextModeAfterPhase(state.mode);
    if (next === 'supply') prepareSupply(state);
    else if (next === 'rules') prepareRules(state);
    else if (next === 'end') state.mode = 'end';
  }

  if (state.mode === 'play') {
    if (state.phaseT > 2) hintOnce(state, 'h1', 'Кликни по станку — проверь его!', hooks.onHint);
    if (state.phaseT > 34) hintOnce(state, 'hDock', 'Док открыт — отправляй рейсы!', hooks.onHint);
    if (state.phaseT > 58) hintOnce(state, 'h2', 'Подойди к зоне — взгляни внутрь.', hooks.onHint);
    if (state.phaseT > 110) hintOnce(state, 'h3', 'Не успеваешь? Это нормально.', hooks.onHint);
  }
  if (state.mode === 'play2' && state.phaseT > 3) {
    hintOnce(state, 'h4', 'Жёлтая тревога? Успей до аварии!', hooks.onHint);
  }
  if (state.mode === 'play3' && state.phaseT > 3) {
    hintOnce(state, 'h5', 'Логика работает — лови исключения!', hooks.onHint);
  }

  updateParticles(state, dt, hooks.hudCenter.x, hooks.hudCenter.y);
  state.shake = Math.max(0, state.shake - dt * 26);
}

export function simulateGameplay(state: GameSnapshot, dt: number, hooks: SimHooks): void {
  if (!isGameplayMode(state.mode)) return;
  keyMoveDirector(state, hooks.keys, dt);
  simulateStep(state, dt, hooks);
}
