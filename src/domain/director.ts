import type { DirectorAction, GameSnapshot, ZoneState } from '@/core/types';
import { clamp } from '@/core/math';
import { GRID, TW, TH } from '@/core/constants';
import { actionFor } from './production/actions';
import { applyPreventBonus, addMoney } from './production/economy';
import { zoneProblem, zoneVisible } from './production/flow';
import { dispatchTruck, type TruckCallbacks } from './production/trucks';

export function completeFix(
  state: GameSnapshot,
  z: ZoneState,
  act: DirectorAction,
  wasVisible: boolean,
  truckCb: TruckCallbacks,
  cb: {
    onFloat: (txt: string, color: string, size?: number) => void;
    onPuff: () => void;
    onPrevent: () => void;
    onFix: () => void;
  },
): void {
  if (act.cost) {
    addMoney(state, -act.cost);
    cb.onFloat(`−${act.cost} ₽`, '#ffb020', 15);
  }
  switch (act.kind) {
    case 'repair':
      z.failed = false;
      z.value = 0.08;
      break;
    case 'cool':
      z.value = 0.08;
      break;
    case 'order':
      z.value = 0;
      cb.onFloat('+СЫРЬЁ', '#35d6e8', 15);
      break;
    case 'wake':
      z.failed = false;
      z.value = 0.05;
      break;
    case 'coffee':
      z.value = 0.05;
      break;
    case 'chill':
      z.value = 0.12;
      z.failed = false;
      break;
    case 'balance':
      z.value = 0.25;
      break;
    case 'resetPower':
      state.powerOut = false;
      z.failed = false;
      z.value = 0.2;
      cb.onFloat('ПИТАНИЕ ЕСТЬ', '#39d98a', 15);
      break;
    case 'dispatch':
      if (!dispatchTruck(state, false, truckCb)) {
        act.preventive = false;
        cb.onFloat('РЕЙС НЕ УШЁЛ', '#ffb020', 14);
      }
      break;
  }
  cb.onPuff();
  const preventive = act.preventive && wasVisible;
  if (preventive) {
    applyPreventBonus(state);
    cb.onFloat('ПРЕДОТВРАЩЕНО', '#39d98a', 17);
    cb.onFloat('+40 ₽', '#ffd24a', 14);
    cb.onPrevent();
  } else {
    cb.onFloat('ГОТОВО', '#39d98a', 15);
    cb.onFix();
  }
}

export function arriveAt(
  state: GameSnapshot,
  z: ZoneState,
  cb: { onFloat: (txt: string, color: string, size?: number) => void },
): void {
  const wasVisible = zoneVisible(state, z);
  z.lookUntil = state.gameT + 3;
  const act = actionFor(state, z);
  if (act) {
    if (act.preventive && !wasVisible) act.preventive = false;
    state.director.fixing = { zone: z, act, t: 0, wasVisible };
  } else {
    const prob = zoneProblem(state, z);
    if (prob === 'НЕТ СЫРЬЯ') cb.onFloat('СЫРЬЁ КОНЧИЛОСЬ — К БУНКЕРУ!', '#ffb020', 14);
    else if (prob === 'НЕТ ДЕТАЛЕЙ') cb.onFloat('ЖДЁТ СТАНОК — ЧИНИ ЕГО!', '#ffb020', 14);
    else if (prob === 'НЕТ ПОТОКА') cb.onFloat('ЛИНИЯ ВЫШЕ ПО ЦЕПОЧКЕ СТОИТ', '#ffb020', 13);
    else if (prob === 'НЕТ ПИТАНИЯ') cb.onFloat('СБРОСЬ ЭНЕРГОЩИТ!', '#ffb020', 14);
    else if (prob === 'НЕТ ГРУЗА') cb.onFloat('НЕТ ГРУЗА — НУЖНА ЦЕПОЧКА', '#ffb020', 13);
    else cb.onFloat('ВСЁ В ПОРЯДКЕ', '#7e8db0', 13);
  }
}

export function updateDirector(
  state: GameSnapshot,
  dt: number,
  truckCb: TruckCallbacks,
  cb: {
    onFloat: (txt: string, color: string, size?: number) => void;
    onPuff: () => void;
    onPrevent: () => void;
    onFix: () => void;
    onDust: () => void;
  },
): void {
  const dir = state.director;
  if (dir.fixing) {
    const f = dir.fixing;
    f.t += dt;
    if (f.t >= f.act.dur) {
      completeFix(state, f.zone, f.act, f.wasVisible, truckCb, cb);
      dir.fixing = null;
    }
    return;
  }
  const dx = dir.tx - dir.gx;
  const dy = dir.ty - dir.gy;
  const dist = Math.hypot(dx, dy);
  if (dist > 0.05) {
    const sp = 3.6 * dt;
    const k = Math.min(1, sp / dist);
    dir.gx += dx * k;
    dir.gy += dy * k;
    dir.step += dt * 10;
    dir.face = dx - dy >= 0 ? 1 : -1;
    if (Math.random() < dt * 8) cb.onDust();
  } else if (dir.targetZone) {
    arriveAt(state, dir.targetZone, cb);
    dir.targetZone = null;
  }
}

export function keyMoveDirector(
  state: GameSnapshot,
  keys: Record<string, boolean>,
  dt: number,
): void {
  let sx = 0;
  let sy = 0;
  if (keys['ArrowLeft'] || keys['a'] || keys['ф']) sx -= 1;
  if (keys['ArrowRight'] || keys['d'] || keys['в']) sx += 1;
  if (keys['ArrowUp'] || keys['w'] || keys['ц']) sy -= 1;
  if (keys['ArrowDown'] || keys['s'] || keys['ы']) sy += 1;
  const moving = sx !== 0 || sy !== 0;
  const dir = state.director;
  if (moving) {
    dir.fixing = null;
    dir.targetZone = null;
    const gx = sx / (TW / 2) + sy / (TH / 2);
    const gy = sy / (TH / 2) - sx / (TW / 2);
    const L = Math.hypot(gx, gy) || 1;
    dir.gx = clamp(dir.gx + (gx / L) * 3.6 * dt, 0.8, GRID - 0.8);
    dir.gy = clamp(dir.gy + (gy / L) * 3.6 * dt, 0.8, GRID - 0.8);
    dir.tx = dir.gx;
    dir.ty = dir.gy;
    dir.step += dt * 10;
  }
  for (const z of state.zones) {
    if (!z.on) continue;
    if (Math.hypot(dir.gx - (z.gx + 1.35), dir.gy - (z.gy + 1.35)) < 0.9) {
      z.lookUntil = state.gameT + 3;
      if (!moving && !dir.fixing && (keys[' '] || keys['Enter'])) {
        const act = actionFor(state, z);
        if (act) dir.fixing = { zone: z, act, t: 0, wasVisible: zoneVisible(state, z) };
      }
      break;
    }
  }
}
