import { describe, expect, it } from 'vitest';
import { freshState } from '../../helpers';
import { createEmployee } from '@/domain/org/Employee';
import { unlockGrowth } from '@/domain/org/OrgController';
import { resetTaskCounter } from '@/domain/org/Manager';
import { resetEventCounter } from '@/domain/economy/EventJournal';
import { resetOrgTickAcc } from '@/domain/economy/OrgTick';
import { purchaseItem } from '@/domain/shop/ShopController';
import { assignEmployee } from '@/domain/org/OrgController';

describe('org seed determinism', () => {
  it('creates identical employees for same seed and hire sequence', () => {
    resetTaskCounter(0);
    resetEventCounter(0);
    resetOrgTickAcc();

    function runHires(seed: number) {
      const state = freshState(seed);
      unlockGrowth(state);
      state.money = 10000;
      purchaseItem(state, 'hire_operator');
      const emp = state.org.employees[0];
      assignEmployee(state, emp.id, 'machine');
      return emp;
    }

    const a = runHires(42);
    const b = runHires(42);
    expect(a.stats).toEqual(b.stats);
    expect(a.name).toEqual(b.name);
  });

  it('createEmployee differs across seeds', () => {
    const e1 = createEmployee(1, 'operator', 1, 'hire_operator');
    const e2 = createEmployee(99, 'operator', 1, 'hire_operator');
    expect(e1.stats.skill).not.toBe(e2.stats.skill);
  });
});
