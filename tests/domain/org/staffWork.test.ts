import { describe, expect, it } from 'vitest';
import { unlockedShopState } from '../../helpers';
import { purchaseItem } from '@/domain/shop/ShopController';
import { assignEmployee } from '@/domain/org/OrgController';
import {
  DONE_BUBBLE,
  FIXING_BUBBLE,
  NAP_INTERVAL_BASE,
  SLEEP_BUBBLE,
  SLEEP_MIN_BEFORE_YELL,
  STAFF_ALERT_AVG,
  YELL_BUBBLE,
  staffPressureMult,
  tickStaffWork,
} from '@/domain/org/staffWork';

describe('staffWork', () => {
  it('assigned workers reduce zone pressure multiplier', () => {
    const state = unlockedShopState(1, 5000);
    expect(staffPressureMult(state, 'machine')).toBe(1);
    expect(purchaseItem(state, 'hire_operator').ok).toBe(true);
    assignEmployee(state, state.org.employees[0]!.id, 'machine');
    expect(staffPressureMult(state, 'machine')).toBeLessThan(1);
  });

  it('sleeping workers do not reduce pressure', () => {
    const state = unlockedShopState(2, 5000);
    purchaseItem(state, 'hire_operator');
    const emp = state.org.employees[0]!;
    assignEmployee(state, emp.id, 'machine');
    emp.status = 'sleeping';
    expect(staffPressureMult(state, 'machine')).toBe(1);
  });

  it('worker naps with Zzzzz, foreman yells and wakes them', () => {
    const state = unlockedShopState(7, 8000);
    purchaseItem(state, 'hire_operator');
    const worker = state.org.employees[0]!;
    assignEmployee(state, worker.id, 'machine');

    // Unlock foreman path: need hire_operator owned already; buy foreman.
    state.growth.tutorialStep = 5;
    expect(purchaseItem(state, 'mgr_foreman').ok).toBe(true);
    const foreman = state.org.employees.find((e) => e.roleId === 'foreman')!;
    assignEmployee(state, foreman.id, 'machine');

    state.zoneMap.machine!.on = true;
    state.zoneMap.machine!.value = 0.2;

    // Force nap.
    worker.napAcc = NAP_INTERVAL_BASE + 20;
    // Deterministic: tick until sleeping (rng may defer — force state).
    worker.status = 'sleeping';
    worker.sleepT = SLEEP_MIN_BEFORE_YELL;
    worker.bubble = SLEEP_BUBBLE;
    worker.bubbleUntil = Number.POSITIVE_INFINITY;

    tickStaffWork(state, 0.1);

    expect(foreman.bubble).toBe(YELL_BUBBLE);
    expect(worker.status).not.toBe('sleeping');
    expect(worker.bubble).not.toBe(SLEEP_BUBBLE);
  });

  it('mechanic finishes with «Готово, босс» then can fix again', () => {
    const state = unlockedShopState(4, 5000);
    purchaseItem(state, 'hire_mechanic');
    const emp = state.org.employees[0]!;
    assignEmployee(state, emp.id, 'machine');
    state.zoneMap.machine!.on = true;
    state.zoneMap.machine!.value = 0.8;
    state.gameT = 10;

    tickStaffWork(state, 0.05);
    emp.actionT = emp.actionDur;
    // Prevent instant nap from interrupting assertion path.
    emp.napAcc = -10;
    tickStaffWork(state, 0.05);

    expect(emp.bubble).toBe(DONE_BUBBLE);
    expect(state.zoneMap.machine!.value).toBeLessThan(STAFF_ALERT_AVG);

    state.zoneMap.machine!.value = STAFF_ALERT_AVG + 0.05;
    emp.napAcc = -10;
    tickStaffWork(state, 0.05);
    expect(emp.actionT).toBeGreaterThan(0);
    expect(emp.bubble).toBe(FIXING_BUBBLE);
  });
});
