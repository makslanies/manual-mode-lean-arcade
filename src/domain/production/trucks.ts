import type { GameSnapshot } from '@/core/types';
import {
  LOAD_TIME,
  ROAD_PATH,
  TRIP_STOCK,
  TRIP_TIME,
  TRIP_WINDOW,
} from '@/core/constants';
import { addMoney } from './economy';

function pathLen(): number {
  let L = 0;
  for (let i = 1; i < ROAD_PATH.length; i++) {
    L += Math.hypot(
      ROAD_PATH[i]!.gx - ROAD_PATH[i - 1]!.gx,
      ROAD_PATH[i]!.gy - ROAD_PATH[i - 1]!.gy,
    );
  }
  return L;
}

const PATH_L = pathLen();

function pathPos(f: number): { gx: number; gy: number } {
  let d = f * PATH_L;
  for (let i = 1; i < ROAD_PATH.length; i++) {
    const a = ROAD_PATH[i - 1]!;
    const b = ROAD_PATH[i]!;
    const seg = Math.hypot(b.gx - a.gx, b.gy - a.gy);
    if (d <= seg) {
      const k = d / seg;
      return { gx: a.gx + (b.gx - a.gx) * k, gy: a.gy + (b.gy - a.gy) * k };
    }
    d -= seg;
  }
  return { ...ROAD_PATH[ROAD_PATH.length - 1]! };
}

export function truckPos(tr: GameSnapshot['trucks'][0]): { gx: number; gy: number } {
  if (tr.phase !== 'route') {
    return { gx: 13.4 + tr.park * 0.2, gy: 8.8 + tr.park * 1.1 };
  }
  const f = tr.p < 0.5 ? tr.p * 2 : (1 - tr.p) * 2;
  return pathPos(f);
}

export interface TruckCallbacks {
  onTruck: () => void;
  onCoin: () => void;
  onFloat: (txt: string, color: string, size?: number) => void;
  onBreak: () => void;
  onHintOnce: (key: string, txt: string) => void;
  onSay: (who: string, txt: string) => void;
  maybeSay: (who: string, txt: string, chance: number) => void;
}

export function dispatchTruck(state: GameSnapshot, auto: boolean, cb: TruckCallbacks): boolean {
  const tr = state.trucks
    .filter((t) => t.phase === 'ready' && state.stock >= TRIP_STOCK)
    .sort((a, b) => a.deadline - b.deadline)[0];
  if (!tr) return false;
  state.stock -= TRIP_STOCK;
  tr.phase = 'route';
  tr.p = 0;
  tr.delivered = false;
  tr.onTime = state.gameT <= tr.deadline;
  cb.onTruck();
  cb.onFloat(auto ? 'АВТО: РЕЙС' : 'РЕЙС ПОШЁЛ', auto ? '#35d6e8' : '#dcebff', 14);
  return true;
}

export function updateTrucks(state: GameSnapshot, dt: number, cb: TruckCallbacks): void {
  if (!state.zoneMap.dock!.on) return;
  for (const tr of state.trucks) {
    switch (tr.phase) {
      case 'load':
        tr.t -= dt;
        if (tr.t <= 0) {
          tr.phase = 'ready';
          if (!tr.deadline || tr.deadline < state.gameT) {
            tr.deadline = state.gameT + TRIP_WINDOW * 0.7;
          }
        }
        break;
      case 'ready':
        break;
      case 'route':
        tr.p += dt / TRIP_TIME;
        if (!tr.delivered && tr.p >= 0.5) {
          tr.delivered = true;
          if (tr.onTime) {
            state.tripsOnTime++;
            addMoney(state, 180);
            cb.onFloat('РЕЙС ВОВРЕМЯ  +180 ₽', '#39d98a', 16);
            cb.maybeSay('ДИСПЕТЧЕР', 'Доставили вовремя!', 0.5);
          } else {
            state.tripsLate++;
            addMoney(state, 90);
            cb.onFloat('С ОПОЗДАНИЕМ  +90 ₽', '#ffb020', 15);
          }
          cb.onCoin();
        }
        if (tr.p >= 1) {
          tr.phase = 'load';
          tr.t = LOAD_TIME;
          tr.deadline = state.gameT + TRIP_WINDOW;
        }
        break;
    }
    if (tr.phase !== 'route' && tr.deadline && state.gameT > tr.deadline) {
      state.accidents++;
      state.tripsLate++;
      addMoney(state, -160);
      cb.onFloat('РЕЙС СОРВАН  −160 ₽', '#ff5a4e', 17);
      cb.onBreak();
      state.shake = 4;
      state.hitstop = 0.06;
      tr.deadline = state.gameT + TRIP_WINDOW;
      if (tr.phase === 'ready' && state.stock < TRIP_STOCK) {
        tr.phase = 'load';
        tr.t = LOAD_TIME * 0.5;
      }
      cb.onHintOnce('trip', 'График сорван — следи за доком!');
      cb.onSay('ДИСПЕТЧЕР', 'Рейс сорван, клиент в ярости!');
    }
  }
}
