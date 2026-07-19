import type { GameSnapshot } from '@/core/types';
import type { OrgTask } from './types';
import { isManagerRole } from './Employee';

let taskCounter = 0;

export function createRoutineTask(
  org: import('./types').OrgState,
  zoneId: string,
  title: string,
  gameTime: number,
): OrgTask {
  const task: OrgTask = {
    id: `task_${++taskCounter}`,
    type: 'production',
    title,
    priority: 5,
    status: 'queued',
    assigneeId: null,
    brigadeId: null,
    zoneId,
    createdAt: gameTime,
    routine: true,
  };
  org.tasks.push(task);
  return task;
}

export function autoAssignTasks(state: GameSnapshot): number {
  const { org } = state;
  let assigned = 0;

  for (const brigade of org.brigades) {
    if (!brigade.leaderId) continue;
    const leader = org.employees.find((e) => e.id === brigade.leaderId);
    if (!leader || !isManagerRole(leader.roleId)) continue;

    const queued = org.tasks.filter(
      (t) => t.status === 'queued' && t.zoneId === brigade.zoneId && t.routine,
    );
    for (const task of queued) {
      const worker = pickWorker(org, brigade);
      if (!worker) break;
      task.status = 'assigned';
      task.assigneeId = worker.id;
      task.brigadeId = brigade.id;
      worker.status = 'working';
      assigned++;
    }
  }

  return assigned;
}

function pickWorker(org: import('./types').OrgState, brigade: import('./types').Brigade) {
  return org.employees.find(
    (e) =>
      e.brigadeId === brigade.id &&
      !isManagerRole(e.roleId) &&
      (e.status === 'available' || e.status === 'break'),
  );
}

export function escalateBlockedTasks(state: GameSnapshot): number {
  const { org } = state;
  let escalated = 0;
  const now = state.gameT;

  for (const task of org.tasks) {
    if (task.status !== 'queued' && task.status !== 'blocked') continue;
    if (task.routine && now - task.createdAt < 8) continue;

    const brigade = org.brigades.find((b) => b.zoneId === task.zoneId);
    const hasLeader = brigade?.leaderId != null;
    if (hasLeader && task.routine) continue;

    task.status = 'escalated';
    org.escalations.push({
      id: `esc_${task.id}`,
      taskId: task.id,
      reason: hasLeader ? 'blocked_sla' : 'no_manager',
      at: now,
    });
    escalated++;
  }

  return escalated;
}

export function completeStaleTasks(state: GameSnapshot, dt: number): void {
  for (const task of state.org.tasks) {
    if (task.status !== 'assigned' && task.status !== 'in_progress') continue;
    if (state.gameT - task.createdAt > 12 + dt) {
      task.status = 'completed';
      const worker = state.org.employees.find((e) => e.id === task.assigneeId);
      if (worker) worker.status = 'available';
    }
  }
}

export function resetTaskCounter(n = 0): void {
  taskCounter = n;
}
