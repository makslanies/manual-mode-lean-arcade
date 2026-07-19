import { describe, expect, it } from 'vitest';
import { createInitialOrg } from '@/domain/org/OrgController';
import { assignToBrigade, createBrigade } from '@/domain/org/Brigade';
import { createEmployee } from '@/domain/org/Employee';
import { aggregateOrgPenalty, applyPenaltyToOrg } from '@/domain/org/penalties';

describe('unmanaged brigade penalty', () => {
  it('returns chaos penalty when more than four workers lack a manager', () => {
    const org = createInitialOrg();
    const brigade = createBrigade(org, 'machine');
    org.brigades.push(brigade);

    for (let i = 0; i < 5; i++) {
      const emp = createEmployee(42, 'operator', org.nextEmpNum++, 'hire_operator');
      org.employees.push(emp);
      assignToBrigade(org, emp.id, brigade.id, 'machine');
    }

    const penalty = aggregateOrgPenalty(org);
    expect(penalty.chaosLevel).toBe('chaos');
    expect(penalty.efficiencyMult).toBeLessThanOrEqual(0.75);
    expect(penalty.errorMult).toBeGreaterThan(1);
  });

  it('returns managed efficiency with foreman within span', () => {
    const org = createInitialOrg();
    const brigade = createBrigade(org, 'machine');
    org.brigades.push(brigade);

    const foreman = createEmployee(42, 'foreman', org.nextEmpNum++, 'mgr_foreman');
    org.employees.push(foreman);
    assignToBrigade(org, foreman.id, brigade.id, 'machine');

    for (let i = 0; i < 3; i++) {
      const emp = createEmployee(42, 'operator', org.nextEmpNum++, 'hire_operator');
      org.employees.push(emp);
      assignToBrigade(org, emp.id, brigade.id, 'machine');
    }

    const penalty = aggregateOrgPenalty(org);
    expect(penalty.chaosLevel).toBe('managed');
    expect(penalty.efficiencyMult).toBe(1);
  });

  it('boundary: exactly four unmanaged workers is unmanaged not chaos', () => {
    const org = createInitialOrg();
    const brigade = createBrigade(org, 'machine');
    org.brigades.push(brigade);

    for (let i = 0; i < 4; i++) {
      const emp = createEmployee(42, 'operator', org.nextEmpNum++, 'hire_operator');
      org.employees.push(emp);
      assignToBrigade(org, emp.id, brigade.id, 'machine');
    }

    const penalty = aggregateOrgPenalty(org);
    expect(penalty.chaosLevel).toBe('unmanaged');
    expect(penalty.efficiencyMult).toBe(0.75);
  });

  it('boundary: foreman one worker over span is overloaded', () => {
    const org = createInitialOrg();
    const brigade = createBrigade(org, 'machine');
    org.brigades.push(brigade);

    const foreman = createEmployee(42, 'foreman', org.nextEmpNum++, 'mgr_foreman');
    org.employees.push(foreman);
    assignToBrigade(org, foreman.id, brigade.id, 'machine');

    for (let i = 0; i < 6; i++) {
      const emp = createEmployee(42, 'operator', org.nextEmpNum++, 'hire_operator');
      org.employees.push(emp);
      assignToBrigade(org, emp.id, brigade.id, 'machine');
    }

    const penalty = aggregateOrgPenalty(org);
    expect(penalty.chaosLevel).toBe('overloaded');
    expect(penalty.efficiencyMult).toBe(0.9);
  });

  it('negative: unassigned workers beyond threshold trigger chaos', () => {
    const org = createInitialOrg();
    for (let i = 0; i < 5; i++) {
      org.employees.push(createEmployee(42, 'operator', org.nextEmpNum++, 'hire_operator'));
    }

    const penalty = aggregateOrgPenalty(org);
    expect(penalty.chaosLevel).toBe('chaos');
    expect(penalty.unmanagedMembers).toBe(5);
  });

  it('applyPenaltyToOrg writes metrics onto org state', () => {
    const org = createInitialOrg();
    for (let i = 0; i < 5; i++) {
      org.employees.push(createEmployee(42, 'operator', org.nextEmpNum++, 'hire_operator'));
    }
    const result = applyPenaltyToOrg(org);
    expect(org.chaosLevel).toBe(result.chaosLevel);
    expect(org.efficiencyMult).toBe(result.efficiencyMult);
    expect(org.errorMult).toBe(result.errorMult);
  });
});
