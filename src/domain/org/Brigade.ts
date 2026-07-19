import type { Brigade, Employee, OrgState } from './types';
import { isManagerRole } from './Employee';

export function createBrigade(org: OrgState, zoneId: string, name?: string): Brigade {
  const id = `brig_${org.nextBrigadeNum++}`;
  return {
    id,
    name: name ?? `Бригада ${org.nextBrigadeNum - 1}`,
    zoneId,
    leaderId: null,
    memberIds: [],
    morale: 70,
    maxLoad: 8,
  };
}

export function ensureBrigade(org: OrgState, zoneId: string): Brigade {
  let brigade = org.brigades.find((b) => b.zoneId === zoneId);
  if (!brigade) {
    brigade = createBrigade(org, zoneId);
    org.brigades.push(brigade);
  }
  return brigade;
}

export function assignToBrigade(org: OrgState, employeeId: string, brigadeId: string, zoneId: string): boolean {
  const emp = org.employees.find((e) => e.id === employeeId);
  const brigade = org.brigades.find((b) => b.id === brigadeId);
  if (!emp || !brigade) return false;

  if (emp.brigadeId && emp.brigadeId !== brigadeId) {
    removeFromBrigade(org, emp.id);
  }

  emp.brigadeId = brigadeId;
  emp.zoneId = zoneId;
  if (!brigade.memberIds.includes(emp.id)) {
    brigade.memberIds.push(emp.id);
  }

  if (isManagerRole(emp.roleId)) {
    brigade.leaderId = emp.id;
    for (const memberId of brigade.memberIds) {
      const member = org.employees.find((e) => e.id === memberId);
      if (member) member.managerId = emp.id;
    }
  } else {
    const leader = brigade.leaderId ? org.employees.find((e) => e.id === brigade.leaderId) : null;
    emp.managerId = leader?.id ?? null;
  }

  return true;
}

export function removeFromBrigade(org: OrgState, employeeId: string): void {
  const emp = org.employees.find((e) => e.id === employeeId);
  if (!emp?.brigadeId) return;
  const brigade = org.brigades.find((b) => b.id === emp.brigadeId);
  if (brigade) {
    brigade.memberIds = brigade.memberIds.filter((id) => id !== employeeId);
    if (brigade.leaderId === employeeId) brigade.leaderId = null;
  }
  emp.brigadeId = null;
  emp.managerId = null;
}

export function brigadeMemberCount(org: OrgState, brigadeId: string): number {
  return org.brigades.find((b) => b.id === brigadeId)?.memberIds.length ?? 0;
}

export function listWorkersInZone(org: OrgState, zoneId: string): Employee[] {
  return org.employees.filter((e) => e.zoneId === zoneId && !isManagerRole(e.roleId));
}
