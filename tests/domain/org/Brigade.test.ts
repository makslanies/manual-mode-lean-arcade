import { describe, expect, it } from 'vitest';
import { createInitialOrg } from '@/domain/org/OrgController';
import {
  assignToBrigade,
  brigadeMemberCount,
  createBrigade,
  ensureBrigade,
  listWorkersInZone,
  removeFromBrigade,
} from '@/domain/org/Brigade';
import { createEmployee } from '@/domain/org/Employee';

function seedOrg() {
  const org = createInitialOrg();
  const worker = createEmployee(1, 'operator', org.nextEmpNum++, 'hire_operator');
  const foreman = createEmployee(1, 'foreman', org.nextEmpNum++, 'mgr_foreman');
  org.employees.push(worker, foreman);
  return { org, worker, foreman };
}

describe('Brigade — ensureBrigade', () => {
  it('happy path: creates brigade for zone once', () => {
    const org = createInitialOrg();
    const a = ensureBrigade(org, 'machine');
    const b = ensureBrigade(org, 'machine');
    expect(a.id).toBe(b.id);
    expect(org.brigades).toHaveLength(1);
    expect(a.zoneId).toBe('machine');
  });

  it('boundary: separate brigades per zone', () => {
    const org = createInitialOrg();
    const machine = ensureBrigade(org, 'machine');
    const worker = ensureBrigade(org, 'worker');
    expect(machine.id).not.toBe(worker.id);
    expect(org.brigades).toHaveLength(2);
  });
});

describe('Brigade — assignToBrigade', () => {
  it('happy path: assigns worker and sets manager from leader', () => {
    const { org, worker, foreman } = seedOrg();
    const brigade = createBrigade(org, 'machine');
    org.brigades.push(brigade);

    assignToBrigade(org, foreman.id, brigade.id, 'machine');
    assignToBrigade(org, worker.id, brigade.id, 'machine');

    expect(worker.zoneId).toBe('machine');
    expect(worker.managerId).toBe(foreman.id);
    expect(brigade.leaderId).toBe(foreman.id);
    expect(brigadeMemberCount(org, brigade.id)).toBe(2);
  });

  it('happy path: reassigning removes worker from previous brigade', () => {
    const { org, worker } = seedOrg();
    const brigA = createBrigade(org, 'machine');
    const brigB = createBrigade(org, 'worker');
    org.brigades.push(brigA, brigB);

    assignToBrigade(org, worker.id, brigA.id, 'machine');
    assignToBrigade(org, worker.id, brigB.id, 'worker');

    expect(brigA.memberIds).not.toContain(worker.id);
    expect(brigB.memberIds).toContain(worker.id);
    expect(worker.zoneId).toBe('worker');
  });

  it('negative: returns false for missing employee or brigade', () => {
    const org = createInitialOrg();
    const brigade = createBrigade(org, 'machine');
    org.brigades.push(brigade);
    expect(assignToBrigade(org, 'emp_x', brigade.id, 'machine')).toBe(false);
    expect(assignToBrigade(org, 'emp_1', 'brig_x', 'machine')).toBe(false);
  });
});

describe('Brigade — removeFromBrigade', () => {
  it('happy path: clears membership and leader when leader removed', () => {
    const { org, foreman } = seedOrg();
    const brigade = createBrigade(org, 'machine');
    org.brigades.push(brigade);
    assignToBrigade(org, foreman.id, brigade.id, 'machine');

    removeFromBrigade(org, foreman.id);
    expect(foreman.brigadeId).toBeNull();
    expect(brigade.leaderId).toBeNull();
    expect(brigade.memberIds).not.toContain(foreman.id);
  });

  it('boundary: no-op when employee has no brigade', () => {
    const { org, worker } = seedOrg();
    removeFromBrigade(org, worker.id);
    expect(worker.brigadeId).toBeNull();
  });
});

describe('Brigade — listWorkersInZone', () => {
  it('excludes managers from worker list', () => {
    const { org, worker, foreman } = seedOrg();
    const brigade = createBrigade(org, 'machine');
    org.brigades.push(brigade);
    assignToBrigade(org, foreman.id, brigade.id, 'machine');
    assignToBrigade(org, worker.id, brigade.id, 'machine');

    const workers = listWorkersInZone(org, 'machine');
    expect(workers).toHaveLength(1);
    expect(workers[0].id).toBe(worker.id);
  });
});
