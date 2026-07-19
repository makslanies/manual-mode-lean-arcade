import type { GameSnapshot, ZoneState } from '@/core/types';
import { clamp } from '@/core/math';
import { staffPressureMult } from '@/domain/org/staffWork';
import { machineFlow, pressFlow, zoneProducing } from './flow';
import { addMoney } from './economy';

export interface FailCallbacks {
  onBreak: () => void;
  onAlarm: () => void;
  onFloat: (txt: string, color: string, size?: number) => void;
  onHintOnce: (key: string, txt: string) => void;
  onSay: (who: string, txt: string) => void;
  onPuff: (n: number, color: string, spread?: number, up?: number) => void;
  onSmoke: () => void;
  onZzz: () => void;
}

export function failZone(state: GameSnapshot, z: ZoneState, cb: FailCallbacks): void {
  switch (z.kind) {
    case 'machine':
      z.failed = true;
      state.accidents++;
      addMoney(state, -220);
      cb.onFloat('АВАРИЯ  −220 ₽', '#ff5a4e', 19);
      cb.onBreak();
      cb.onPuff(16, '#ff5a4e', 60, -60);
      cb.onHintOnce('break', 'Дым — уже поздно. Реагируй раньше!');
      cb.onSay('МАСТЕР', 'Станок встал, шеф!');
      break;
    case 'press':
      z.failed = true;
      state.accidents++;
      addMoney(state, -180);
      cb.onFloat('КЛИН ПРЕССА  −180 ₽', '#ff5a4e', 18);
      cb.onBreak();
      cb.onPuff(12, '#ff5a4e', 50, -50);
      cb.onSay('МАСТЕР', 'Пресс заклинило!');
      break;
    case 'hopper':
      cb.onFloat('БУНКЕР ПУСТ', '#ffb020', 17);
      cb.onAlarm();
      cb.onHintOnce('hungry', 'Линия встала — следи за бункером!');
      cb.onSay('СНАБЖЕНЕЦ', 'Сырьё кончилось!');
      break;
    case 'worker':
      z.failed = true;
      cb.onFloat('УСНУЛ', '#ffb020', 17);
      cb.onAlarm();
      cb.onSay('БРИГАДИР', 'Сборщик уснул на посту…');
      break;
    case 'fridge':
      z.failed = true;
      state.accidents++;
      state.stock = Math.floor(state.stock * 0.5);
      addMoney(state, -260);
      cb.onFloat('ПАРТИЯ ИСПОРЧЕНА  −260 ₽', '#ff5a4e', 18);
      cb.onFloat('ГРУЗ УПОЛОВИНЕН', '#ffb020', 14);
      cb.onBreak();
      z.value = 0.8;
      cb.onSay('КЛАДОВЩИК', 'Партия испорчена, шеф!');
      break;
    case 'power':
      state.powerOut = true;
      z.failed = true;
      state.accidents++;
      addMoney(state, -180);
      cb.onFloat('ВЫБИЛО АВТОМАТ  −180 ₽', '#ff5a4e', 19);
      cb.onBreak();
      state.shake = 8;
      state.hitstop = 0.09;
      cb.onHintOnce('grid', 'Весь завод встал — сбрось автомат!');
      cb.onSay('ЭНЕРГЕТИК', 'Автомат выбило! Всё стоит!');
      break;
  }
}

export function tickZoneValues(
  state: GameSnapshot,
  z: ZoneState,
  dt: number,
  d: number,
  rng: { range: (a: number, b: number) => number },
  cb: FailCallbacks,
): void {
  if (!z.on) return;
  const staff = staffPressureMult(state, z.id);
  switch (z.kind) {
    case 'machine':
      if (!z.failed && zoneProducing(state, z)) {
        z.value = clamp(z.value + 0.018 * d * dt * staff, 0, 1);
        if (z.value >= 1) failZone(state, z, cb);
      }
      if (!z.failed && z.value >= 0.88) {
        z.spawnT -= dt;
        if (z.spawnT <= 0) {
          z.spawnT = 0.14;
          cb.onSmoke();
        }
      }
      if (z.failed) {
        z.spawnT -= dt;
        if (z.spawnT <= 0) {
          z.spawnT = 0.09;
          cb.onSmoke();
        }
      }
      break;
    case 'press':
      if (!z.failed && pressFlow(state)) {
        z.value = clamp(z.value + 0.012 * d * dt * staff, 0, 1);
        if (z.value >= 1) failZone(state, z, cb);
      }
      if (z.failed) {
        z.spawnT -= dt;
        if (z.spawnT <= 0) {
          z.spawnT = 0.12;
          cb.onSmoke();
        }
      }
      break;
    case 'hopper':
      if (machineFlow(state)) {
        z.value = clamp(z.value + 0.014 * d * dt * staff, 0, 1);
      }
      if (z.value >= 1 && !z.failed) {
        z.failed = true;
        failZone(state, z, cb);
      }
      if (z.value < 1) z.failed = false;
      break;
    case 'worker':
      if (!z.failed) {
        z.value = clamp(
          z.value + 0.016 * d * (state.powerOut ? 0.4 : 1) * dt * staff,
          0,
          1,
        );
        if (z.value >= 1) failZone(state, z, cb);
      } else {
        z.spawnT -= dt;
        if (z.spawnT <= 0) {
          z.spawnT = 0.55;
          cb.onZzz();
        }
      }
      break;
    case 'fridge':
      z.value = clamp(
        z.value +
          0.013 * d * (0.6 + rng.range(0, 0.8)) * (state.powerOut ? 1.7 : 1) * dt * staff,
        0,
        1,
      );
      if (z.value >= 1 && !z.failed) failZone(state, z, cb);
      if (z.value >= 0.85) {
        addMoney(state, -8 * dt);
        state.stock = Math.max(0, state.stock - 1.2 * dt);
      }
      break;
    case 'power':
      if (!state.powerOut) {
        const producers = state.zones.filter(
          (zz) => zz.on && zoneProducing(state, zz) && zz.kind !== 'fridge',
        ).length;
        z.value = clamp(z.value + (0.0055 + 0.005 * producers) * d * dt * staff, 0, 1);
        if (z.value >= 1 && !z.failed) failZone(state, z, cb);
      }
      break;
  }
}
