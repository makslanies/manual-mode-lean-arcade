import { describe, expect, it } from 'vitest';
import { freshState } from '../../helpers';
import { purchaseItem } from '@/domain/shop/ShopController';
import { assignEmployee, unlockGrowth } from '@/domain/org/OrgController';
import { ensureBrigade } from '@/domain/org/Brigade';

describe('hire and assign', () => {
  it('hires via shop and assigns employee to zone brigade', () => {
    const state = freshState();
    unlockGrowth(state);
    state.money = 5000;

    const buy = purchaseItem(state, 'hire_operator');
    expect(buy.ok).toBe(true);
    const emp = state.org.employees.at(-1);
    expect(emp?.roleId).toBe('operator');

    const brigade = ensureBrigade(state.org, 'machine');
    expect(assignEmployee(state, emp!.id, 'machine', brigade.id)).toBe(true);
    expect(emp!.zoneId).toBe('machine');
    expect(emp!.brigadeId).toBe(brigade.id);
    expect(brigade.memberIds).toContain(emp!.id);
  });

  it('assigns foreman as brigade leader', () => {
    const state = freshState();
    unlockGrowth(state);
    state.money = 8000;
    state.growth.tutorialStep = 3;

    purchaseItem(state, 'hire_operator');
    const worker = state.org.employees.find((e) => e.roleId === 'operator')!;
    assignEmployee(state, worker.id, 'machine');

    purchaseItem(state, 'mgr_foreman');
    const foreman = state.org.employees.find((e) => e.roleId === 'foreman')!;
    assignEmployee(state, foreman.id, 'machine');
    const brigade = state.org.brigades.find((b) => b.zoneId === 'machine');
    expect(brigade?.leaderId).toBe(foreman.id);
    expect(worker.managerId).toBe(foreman.id);
  });
});
