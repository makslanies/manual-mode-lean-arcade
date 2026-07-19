import type { GameSnapshot, ZoneState } from '@/core/types';
import { SeedRng } from '@/core/Seed';
import { clamp } from '@/core/math';
import type { Employee } from './types';
import { isManagerRole } from './Employee';

/** Gauge above this = «выше средней» — start a discrete fix action. */
export const STAFF_ALERT_AVG = 0.5;

export const DONE_BUBBLE = 'Готово, босс';
export const FIXING_BUBBLE = 'Чиню…';
export const SLEEP_BUBBLE = 'Zzzzz';
export const YELL_BUBBLE = 'Эй! На работу!';

/** Seconds between naps (modified by discipline). */
export const NAP_INTERVAL_BASE = 11;
/** Without foreman, sleep lasts longer. */
export const SLEEP_ALONE_DUR = 5.5;
/** Minimum Zzz time before foreman can wake them. */
export const SLEEP_MIN_BEFORE_YELL = 0.7;

/** How much assigned *awake* staff slows crisis buildup (1 = no help). */
export function staffPressureMult(state: GameSnapshot, zoneId: string): number {
  const crew = state.org.employees.filter(
    (e) =>
      e.zoneId === zoneId &&
      !isManagerRole(e.roleId) &&
      e.status !== 'sleeping',
  );
  if (!crew.length) return 1;
  const avgSkill =
    crew.reduce((s, e) => s + e.stats.skill, 0) / crew.length / 100;
  const relief = Math.min(0.72, 0.3 * crew.length * avgSkill * state.org.efficiencyMult);
  return Math.max(0.28, 1 - relief);
}

export function roleControlsZone(roleId: string, z: ZoneState): boolean {
  switch (roleId) {
    case 'mechanic':
      return z.kind === 'machine' || z.kind === 'press';
    case 'operator':
      return z.kind === 'machine' || z.kind === 'fridge' || z.kind === 'power';
    case 'assembler':
      return z.kind === 'worker';
    case 'material_handler':
      return z.kind === 'hopper';
    case 'forklift_driver':
      return z.kind === 'hopper' || z.kind === 'dock' || z.kind === 'fridge';
    default:
      return false;
  }
}

function actionDuration(emp: Employee): number {
  const skill = emp.stats.skill / 100;
  return clamp(2.2 - skill * 0.7, 1.4, 2.5);
}

function napInterval(emp: Employee): number {
  const discipline = emp.stats.discipline / 100;
  return NAP_INTERVAL_BASE + discipline * 6;
}

function startAction(emp: Employee): void {
  emp.status = 'working';
  emp.actionT = 0.001;
  emp.actionDur = actionDuration(emp);
  emp.bubble = FIXING_BUBBLE;
  emp.bubbleUntil = Number.POSITIVE_INFINITY;
}

function finishAction(
  state: GameSnapshot,
  emp: Employee,
  z: ZoneState,
  onFloat?: (zoneId: string, txt: string) => void,
): void {
  const wasFailed = z.failed;
  if (z.failed) {
    z.failed = false;
    if (z.kind === 'power') state.powerOut = false;
    state.prevented += 1;
  }

  const dropTo =
    emp.roleId === 'mechanic' ? 0.22 : emp.roleId === 'operator' ? 0.28 : 0.3;
  z.value = Math.min(z.value, dropTo);

  emp.status = 'available';
  emp.actionT = 0;
  emp.actionDur = 0;
  emp.bubble = DONE_BUBBLE;
  emp.bubbleUntil = state.gameT + 2.4;
  onFloat?.(z.id, wasFailed ? `${shortRole(emp.roleId)}: ${DONE_BUBBLE}` : DONE_BUBBLE);
}

function shortRole(roleId: string): string {
  switch (roleId) {
    case 'mechanic':
      return 'МЕХАНИК';
    case 'operator':
      return 'ОПЕРАТОР';
    case 'assembler':
      return 'СБОРЩИК';
    case 'material_handler':
      return 'СНАБЖЕНЕЦ';
    case 'forklift_driver':
      return 'ПОГРУЗЧИК';
    case 'foreman':
      return 'БРИГАДИР';
    default:
      return 'БРИГАДА';
  }
}

function clearBubbleIfExpired(state: GameSnapshot, emp: Employee): void {
  if (
    emp.bubble &&
    emp.bubble !== SLEEP_BUBBLE &&
    emp.bubble !== FIXING_BUBBLE &&
    emp.bubbleUntil < Number.POSITIVE_INFINITY &&
    state.gameT >= emp.bubbleUntil
  ) {
    emp.bubble = null;
    emp.bubbleUntil = 0;
  }
}

function fallAsleep(emp: Employee): void {
  emp.status = 'sleeping';
  emp.actionT = 0;
  emp.actionDur = 0;
  emp.napAcc = 0;
  emp.sleepT = 0.001;
  emp.bubble = SLEEP_BUBBLE;
  emp.bubbleUntil = Number.POSITIVE_INFINITY;
}

function wakeWorker(emp: Employee, state: GameSnapshot): void {
  emp.status = 'available';
  emp.sleepT = 0;
  emp.napAcc = 0;
  emp.bubble = null;
  emp.bubbleUntil = 0;
  // Small grace so they don't instantly re-nap.
  emp.napAcc = -3;
  void state;
}

function zoneHasForeman(state: GameSnapshot, zoneId: string): Employee | null {
  return (
    state.org.employees.find(
      (e) => e.zoneId === zoneId && isManagerRole(e.roleId),
    ) ?? null
  );
}

/**
 * Discrete work + nap cycle:
 * workers periodically Zzzzz; foreman yells → they resume «Чиню…» / «Готово, босс».
 */
export function tickStaffWork(
  state: GameSnapshot,
  dt: number,
  onFloat?: (zoneId: string, txt: string) => void,
): void {
  if (!state.growth.unlocked || !state.org.employees.length) return;

  const rng = new SeedRng(state.seed + Math.floor(state.gameT * 10));

  // 1) Foremen yell at sleepers on their zone.
  for (const mgr of state.org.employees) {
    clearBubbleIfExpired(state, mgr);
    if (!isManagerRole(mgr.roleId) || !mgr.zoneId) continue;
    const z = state.zoneMap[mgr.zoneId];
    if (!z?.on) continue;

    const sleepers = state.org.employees.filter(
      (e) =>
        e.zoneId === mgr.zoneId &&
        !isManagerRole(e.roleId) &&
        e.status === 'sleeping' &&
        e.sleepT >= SLEEP_MIN_BEFORE_YELL,
    );

    if (sleepers.length > 0) {
      mgr.status = 'working';
      mgr.bubble = YELL_BUBBLE;
      mgr.bubbleUntil = state.gameT + 1.6;
      for (const w of sleepers) {
        wakeWorker(w, state);
        onFloat?.(mgr.zoneId, `${shortRole(mgr.roleId)}: ${YELL_BUBBLE}`);
      }
    } else {
      if (mgr.bubble === YELL_BUBBLE && state.gameT >= mgr.bubbleUntil) {
        mgr.bubble = null;
      }
      mgr.status =
        z.value >= STAFF_ALERT_AVG || state.org.escalations.length > 0
          ? 'working'
          : 'available';
    }
  }

  // 2) Workers: sleep / work.
  for (const emp of state.org.employees) {
    if (isManagerRole(emp.roleId)) continue;
    clearBubbleIfExpired(state, emp);

    if (!emp.zoneId) {
      if (emp.actionT <= 0 && emp.status !== 'sleeping') emp.status = 'available';
      continue;
    }
    const z = state.zoneMap[emp.zoneId];
    if (!z?.on) {
      emp.actionT = 0;
      emp.actionDur = 0;
      emp.sleepT = 0;
      if (emp.status === 'sleeping') emp.status = 'available';
      if (emp.bubble === FIXING_BUBBLE || emp.bubble === SLEEP_BUBBLE) {
        emp.bubble = null;
        emp.bubbleUntil = 0;
      }
      continue;
    }

    // Sleeping: Zzzzz until foreman yells or solo timeout.
    if (emp.status === 'sleeping') {
      emp.sleepT += dt;
      emp.bubble = SLEEP_BUBBLE;
      emp.bubbleUntil = Number.POSITIVE_INFINITY;
      emp.actionT = 0;
      emp.actionDur = 0;
      const foreman = zoneHasForeman(state, emp.zoneId);
      if (!foreman && emp.sleepT >= SLEEP_ALONE_DUR) {
        wakeWorker(emp, state);
      }
      continue;
    }

    if (!roleControlsZone(emp.roleId, z)) {
      emp.status = 'available';
      // Can still nap even if wrong role.
      emp.napAcc += dt;
      if (emp.napAcc >= napInterval(emp) && rng.chance(0.35)) {
        fallAsleep(emp);
      }
      continue;
    }

    // Accumulate nap timer while awake (less likely mid-fix).
    const napRate = emp.actionT > 0 ? 0.35 : 1;
    emp.napAcc += dt * napRate;
    if (emp.napAcc >= napInterval(emp)) {
      // Prefer napping when not in critical fail, but can interrupt routine work.
      const critical = z.failed && z.value > 0.85;
      if (!critical && rng.chance(0.55)) {
        fallAsleep(emp);
        continue;
      }
      emp.napAcc *= 0.5; // defer
    }

    // In progress fix action.
    if (emp.actionT > 0) {
      emp.status = 'working';
      emp.bubble = FIXING_BUBBLE;
      emp.bubbleUntil = Number.POSITIVE_INFINITY;
      z.value = clamp(z.value - 0.008 * dt * state.org.efficiencyMult, 0, 1);
      emp.actionT += dt;
      if (emp.actionT >= emp.actionDur) {
        finishAction(state, emp, z, onFloat);
      }
      continue;
    }

    const needsJob = z.failed || z.value >= STAFF_ALERT_AVG;
    if (needsJob) {
      startAction(emp);
    } else {
      emp.status = 'available';
    }
  }
}

export function resetStaffFloatCooldown(): void {
  // API compatibility
}
