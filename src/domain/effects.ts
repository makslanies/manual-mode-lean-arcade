import type { GameSnapshot } from '@/core/types';
import { clamp } from '@/core/math';
import { problemCount } from './production/flow';
import { producingZones } from './production/economy';

const IDLE_QUIPS: [string, string][] = [
  ['БУХГАЛТЕРИЯ', 'Где прибыль за смену?'],
  ['ДИРЕКТОР', 'Кофе. Срочно.'],
  ['ОХРАНА', 'На проходной всё тихо.'],
  ['БРИГАДИР', 'Люди держатся. Пока.'],
  ['ДИСПЕТЧЕР', 'Жду график, шеф.'],
  ['СНАБЖЕНЦ', 'Поставщик снова торгуется…'],
];

export function addFloat(
  state: GameSnapshot,
  x: number,
  y: number,
  txt: string,
  color: string,
  size = 16,
): void {
  state.floats.push({ x, y, txt, color, size, life: 1.4 });
}

export function puff(
  state: GameSnapshot,
  x: number,
  y: number,
  n: number,
  color: string,
  spread = 26,
  up = -30,
  rng: { next: () => number },
): void {
  for (let i = 0; i < n; i++) {
    state.parts.push({
      t: 'dust',
      x: x + (rng.next() - 0.5) * spread,
      y: y + (rng.next() - 0.5) * 10,
      vx: (rng.next() - 0.5) * 40,
      vy: up * rng.next(),
      life: 0.6 + rng.next() * 0.5,
      size: 3 + rng.next() * 4,
      color,
    });
  }
}

export function say(state: GameSnapshot, who: string, txt: string): void {
  if (state.quips.length > 4) return;
  state.quips.push({ who, txt });
}

export function hintOnce(state: GameSnapshot, key: string, txt: string, emit: (t: string) => void): void {
  if (state.hintedOnce[key]) return;
  state.hintedOnce[key] = true;
  emit(txt);
}

export function updateQuips(state: GameSnapshot, dt: number, rng: { pick: <T>(a: T[]) => T }): void {
  if (state.quipCur) {
    state.quipCur.t += dt;
    if (state.quipCur.t > 3.2) state.quipCur = null;
  }
  if (!state.quipCur && state.quips.length) {
    const q = state.quips.shift()!;
    state.quipCur = { ...q, t: 0 };
  }
  state.quipIdle += dt;
  if (state.quipIdle > 13) {
    state.quipIdle = 0;
    if (!state.quips.length && problemCount(state) === 0) {
      const q = rng.pick(IDLE_QUIPS);
      say(state, q[0], q[1]);
    }
  }
}

export function updateParticles(state: GameSnapshot, dt: number, hudX: number, hudY: number): void {
  if (state.parts.length > 800) state.parts.splice(0, state.parts.length - 800);
  for (let i = state.parts.length - 1; i >= 0; i--) {
    const p = state.parts[i]!;
    if (p.t === 'coin') {
      p.p = (p.p ?? 0) + dt * 1.6;
      if (p.p >= 1) {
        state.parts.splice(i, 1);
        state.moneyPulse = 1;
        continue;
      }
      if ((p.p ?? 0) < 0) continue;
      const t = p.p!;
      const mt = 1 - t;
      p.x = mt * mt * (p.x0 ?? 0) + 2 * mt * t * (p.cx ?? 0) + t * t * hudX;
      p.y = mt * mt * (p.y0 ?? 0) + 2 * mt * t * (p.cy ?? 0) + t * t * hudY;
      continue;
    }
    p.life -= dt;
    if (p.life <= 0) {
      state.parts.splice(i, 1);
      continue;
    }
    p.x += (p.vx ?? 0) * dt;
    p.y += (p.vy ?? 0) * dt;
    if (p.t === 'smoke') {
      p.size += dt * 10;
      p.vy = (p.vy ?? 0) * (1 - dt * 0.4);
    }
  }
  for (let i = state.floats.length - 1; i >= 0; i--) {
    const f = state.floats[i]!;
    f.life -= dt;
    f.y -= dt * 26;
    if (f.life <= 0) state.floats.splice(i, 1);
  }
}

export function tickCoinParticles(
  state: GameSnapshot,
  dt: number,
  rng: { pick: <T>(a: T[]) => T; next: () => number },
  screenPos: (gx: number, gy: number) => { x: number; y: number },
  scale: number,
  onCoin: () => void,
): void {
  state.coinAcc += dt;
  if (state.coinAcc > 1.2) {
    state.coinAcc = 0;
    const prod = producingZones(state);
    if (prod.length) {
      const z = rng.pick(prod);
      const s = screenPos(z.gx, z.gy);
      for (let i = 0; i < 3; i++) {
        state.parts.push({
          t: 'coin',
          x: s.x,
          y: s.y - 60 * scale,
          x0: s.x,
          y0: s.y - 60 * scale,
          cx: s.x + (rng.next() - 0.5) * 120,
          cy: s.y - 140 * scale - rng.next() * 80,
          p: -i * 0.45,
          life: 1,
          size: 5,
          color: '#ffd24a',
        });
      }
      onCoin();
    }
  }
}

export function tickPhoneAlarm(state: GameSnapshot, dt: number, onPhone: () => void): void {
  const pc = problemCount(state);
  if (pc > 0) {
    state.alarmAcc += dt;
    const every = clamp(2.6 - pc * 0.5, 0.9, 2.6);
    if (state.alarmAcc > every) {
      state.alarmAcc = 0;
      onPhone();
    }
  } else {
    state.alarmAcc = 0;
  }
}
