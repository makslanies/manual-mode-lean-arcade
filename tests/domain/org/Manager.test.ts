import { describe, expect, it } from 'vitest';
import { unlockedShopState } from '../../helpers';
import { purchaseItem } from '@/domain/shop/ShopController';
import { assignEmployee } from '@/domain/org/OrgController';
import {
  autoAssignTasks,
  completeStaleTasks,
  createRoutineTask,
  escalateBlockedTasks,
  resetTaskCounter,
} from '@/domain/org/Manager';

describe('Manager — createRoutineTask', () => {
  it('happy path: queues routine task in org', () => {
    resetTaskCounter(0);
    const state = unlockedShopState();
    createRoutineTask(state.org, 'machine', 'Test routine', 10);
    expect(state.org.tasks).toHaveLength(1);
    expect(state.org.tasks[0].status).toBe('queued');
    expect(state.org.tasks[0].routine).toBe(true);
  });
});

describe('Manager — autoAssignTasks', () => {
  it('happy path: foreman assigns queued task to available worker', () => {
    resetTaskCounter(0);
    const state = unlockedShopState(1, 20_000);
    state.growth.tutorialStep = 3;

    purchaseItem(state, 'hire_operator');
    const worker = state.org.employees.find((e) => e.roleId === 'operator')!;
    assignEmployee(state, worker.id, 'machine');

    purchaseItem(state, 'mgr_foreman');
    const foreman = state.org.employees.find((e) => e.roleId === 'foreman')!;
    assignEmployee(state, foreman.id, 'machine');

    createRoutineTask(state.org, 'machine', 'Line check', state.gameT);
    const assigned = autoAssignTasks(state);
    expect(assigned).toBe(1);
    expect(state.org.tasks[0].status).toBe('assigned');
    expect(state.org.tasks[0].assigneeId).toBe(worker.id);
    expect(worker.status).toBe('working');
  });

  it('negative: unmanaged brigade assigns nothing', () => {
    resetTaskCounter(0);
    const state = unlockedShopState();
    purchaseItem(state, 'hire_operator');
    const worker = state.org.employees[0];
    assignEmployee(state, worker.id, 'machine');
    createRoutineTask(state.org, 'machine', 'Unmanaged task', state.gameT);
    expect(autoAssignTasks(state)).toBe(0);
    expect(state.org.tasks[0].status).toBe('queued');
  });
});

describe('Manager — escalateBlockedTasks', () => {
  it('happy path: escalates stale routine without manager', () => {
    resetTaskCounter(0);
    const state = unlockedShopState();
    state.gameT = 20;
    createRoutineTask(state.org, 'machine', 'Stale', 5);
    const escalated = escalateBlockedTasks(state);
    expect(escalated).toBe(1);
    expect(state.org.tasks[0].status).toBe('escalated');
    expect(state.org.escalations).toHaveLength(1);
    expect(state.org.escalations[0].reason).toBe('no_manager');
  });

  it('boundary: fresh routine under 8s is not escalated', () => {
    resetTaskCounter(0);
    const state = unlockedShopState();
    state.gameT = 5;
    createRoutineTask(state.org, 'machine', 'Fresh', 2);
    expect(escalateBlockedTasks(state)).toBe(0);
  });

  it('negative: managed brigade skips routine escalation', () => {
    resetTaskCounter(0);
    const state = unlockedShopState(1, 20_000);
    state.growth.tutorialStep = 3;
    state.gameT = 20;

    purchaseItem(state, 'hire_operator');
    assignEmployee(state, state.org.employees[0].id, 'machine');
    purchaseItem(state, 'mgr_foreman');
    assignEmployee(state, state.org.employees.find((e) => e.roleId === 'foreman')!.id, 'machine');

    createRoutineTask(state.org, 'machine', 'Managed stale', 5);
    expect(escalateBlockedTasks(state)).toBe(0);
  });
});

describe('Manager — completeStaleTasks', () => {
  it('happy path: completes long-running assigned tasks', () => {
    resetTaskCounter(0);
    const state = unlockedShopState();
    purchaseItem(state, 'hire_operator');
    const worker = state.org.employees[0];
    worker.status = 'working';
    createRoutineTask(state.org, 'machine', 'Long job', 0);
    state.org.tasks[0].status = 'assigned';
    state.org.tasks[0].assigneeId = worker.id;
    state.gameT = 15;

    completeStaleTasks(state, 0);
    expect(state.org.tasks[0].status).toBe('completed');
    expect(worker.status).toBe('available');
  });

  it('boundary: young assigned task stays active', () => {
    resetTaskCounter(0);
    const state = unlockedShopState();
    createRoutineTask(state.org, 'machine', 'Young', 10);
    state.org.tasks[0].status = 'assigned';
    state.gameT = 15;

    completeStaleTasks(state, 0);
    expect(state.org.tasks[0].status).toBe('assigned');
  });
});
