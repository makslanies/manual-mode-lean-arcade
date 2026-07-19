import type { GameSnapshot } from '@/core/types';
import { TRIP_STOCK } from '@/core/constants';
import { addMoney } from '@/domain/production/economy';
import { dispatchTruck, type TruckCallbacks } from '@/domain/production/trucks';

export function ruleCheck(state: GameSnapshot, ruleId: string): boolean {
  const Z = state.zoneMap;
  switch (ruleId) {
    case 'r_cool':
      return Z.machine!.on && !Z.machine!.failed && Z.machine!.value >= 0.8;
    case 'r_order':
      return Z.hopper!.on && Z.hopper!.value >= 0.8;
    case 'r_chill':
      return Z.fridge!.on && Z.fridge!.value >= 0.7;
    case 'r_grid':
      return Z.power!.on && !state.powerOut && Z.power!.value >= 0.8;
    case 'r_go':
      return (
        Z.dock!.on &&
        state.trucks.some(
          (t) => t.phase === 'ready' && state.stock >= TRIP_STOCK && t.deadline - state.gameT <= 5,
        )
      );
    default:
      return false;
  }
}

export function ruleRun(
  state: GameSnapshot,
  ruleId: string,
  truckCb: TruckCallbacks,
): void {
  const Z = state.zoneMap;
  switch (ruleId) {
    case 'r_cool':
      Z.machine!.value = 0.12;
      break;
    case 'r_order':
      Z.hopper!.value = 0;
      addMoney(state, -40);
      break;
    case 'r_chill':
      Z.fridge!.value = 0.15;
      Z.fridge!.failed = false;
      break;
    case 'r_grid':
      Z.power!.value = 0.25;
      break;
    case 'r_go':
      dispatchTruck(state, true, truckCb);
      break;
  }
}
