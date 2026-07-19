import { SeedRng } from '@/core/Seed';
import type { Employee, EmployeeStats } from './types';

const ROLE_SALARY: Record<string, number> = {
  operator: 12,
  assembler: 11,
  mechanic: 15,
  material_handler: 10,
  forklift_driver: 14,
  foreman: 28,
  shift_lead: 40,
};

const ROLE_NAMES: Record<string, string[]> = {
  operator: ['Иван', 'Пётр', 'Сергей'],
  assembler: ['Ольга', 'Мария', 'Анна'],
  mechanic: ['Алексей', 'Дмитрий'],
  material_handler: ['Семён', 'Павел', 'Игорь'],
  forklift_driver: ['Николай', 'Андрей'],
  foreman: ['Виктор', 'Геннадий'],
  shift_lead: ['Елена', 'Татьяна'],
};

export function roleSalary(roleId: string): number {
  return ROLE_SALARY[roleId] ?? 10;
}

export function createEmployee(
  seed: number,
  roleId: string,
  empNum: number,
  shopItemId: string,
): Employee {
  const rng = new SeedRng(seed + empNum * 997 + shopItemId.length * 13);
  const names = ROLE_NAMES[roleId] ?? ['Сотрудник'];
  const name = `${rng.pick(names)} #${empNum}`;
  const stats = rollStats(rng, roleId);
  return {
    id: `emp_${empNum}`,
    name,
    roleId,
    brigadeId: null,
    zoneId: null,
    managerId: null,
    salary: roleSalary(roleId),
    status: 'available',
    stats,
    actionT: 0,
    actionDur: 0,
    bubble: null,
    bubbleUntil: 0,
    napAcc: 0,
    sleepT: 0,
  };
}

/** Fill missing action/bubble fields for older saves. */
export function normalizeEmployee(emp: Employee): Employee {
  if (emp.actionT == null) emp.actionT = 0;
  if (emp.actionDur == null) emp.actionDur = 0;
  if (emp.bubble === undefined) emp.bubble = null;
  if (emp.bubbleUntil == null) emp.bubbleUntil = 0;
  if (emp.napAcc == null) emp.napAcc = 0;
  if (emp.sleepT == null) emp.sleepT = 0;
  return emp;
}

function rollStats(rng: SeedRng, roleId: string): EmployeeStats {
  const base = roleId.includes('foreman') || roleId === 'shift_lead' ? 55 : 45;
  return {
    skill: clampStat(base + Math.floor(rng.range(-8, 12))),
    versatility: clampStat(base + Math.floor(rng.range(-10, 10))),
    discipline: clampStat(base + Math.floor(rng.range(-6, 14))),
    motivation: clampStat(70 + Math.floor(rng.range(-15, 20))),
    fatigue: clampStat(Math.floor(rng.range(0, 15))),
  };
}

function clampStat(v: number): number {
  return Math.max(1, Math.min(100, v));
}

export function isManagerRole(roleId: string): boolean {
  return roleId === 'foreman' || roleId === 'shift_lead';
}

export function totalSalary(employees: Employee[]): number {
  return employees.reduce((s, e) => s + e.salary, 0);
}
