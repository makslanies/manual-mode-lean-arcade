import type { DirectorAction, GameSnapshot, ZoneState } from '@/core/types';
import { dockDeadlineLeft } from './flow';

export function actionFor(state: GameSnapshot, z: ZoneState): DirectorAction | null {
  switch (z.kind) {
    case 'machine':
      if (state.powerOut) return null;
      if (z.failed) return { label: 'ЧИНЮ…', dur: 3.2, kind: 'repair', cost: 80 };
      if (z.value >= 0.25) return { label: 'ОБДУВ…', dur: 1.0, kind: 'cool', preventive: z.value >= 0.7 };
      return null;
    case 'press':
      if (state.powerOut) return null;
      if (z.failed) return { label: 'ЧИНЮ…', dur: 2.6, kind: 'repair', cost: 60 };
      if (z.value >= 0.3) return { label: 'СМАЗЫВАЮ…', dur: 1.1, kind: 'cool', preventive: z.value >= 0.7 };
      return null;
    case 'hopper':
      if (z.value >= 1) return { label: 'ЗАКАЗЫВАЮ…', dur: 1.5, kind: 'order', cost: 40 };
      if (z.value >= 0.6) return { label: 'ЗАКАЗЫВАЮ…', dur: 1.2, kind: 'order', cost: 40, preventive: z.value >= 0.7 };
      return null;
    case 'worker':
      if (z.failed) return { label: 'БУЖУ…', dur: 1.0, kind: 'wake' };
      if (z.value >= 0.6) return { label: 'КОФЕ…', dur: 0.8, kind: 'coffee', preventive: z.value >= 0.7 };
      return null;
    case 'fridge':
      if (z.value >= 0.3) return { label: 'ОХЛАЖДАЮ…', dur: 1.5, kind: 'chill', preventive: z.value >= 0.7 && !z.failed };
      return null;
    case 'power':
      if (state.powerOut) return { label: 'СБРАСЫВАЮ…', dur: 2.0, kind: 'resetPower' };
      if (z.value >= 0.6) return { label: 'РАЗВОЖУ НАГРУЗКУ…', dur: 1.2, kind: 'balance', preventive: z.value >= 0.7 };
      return null;
    case 'dock':
      if (state.trucks.some((t) => t.phase === 'ready') && state.stock >= 25) {
        return { label: 'ОТПРАВЛЯЮ…', dur: 0.8, kind: 'dispatch', preventive: dockDeadlineLeft(state) < 6 };
      }
      return null;
  }
  return null;
}
