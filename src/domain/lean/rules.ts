import type { RuleDef } from '@/core/types';

export const RULE_DEFS: Omit<RuleDef, 'active' | 'cd' | 'lastFire'>[] = [
  {
    id: 'r_cool',
    zone: 'machine',
    ifTxt: 'T° станка ≥ 80%',
    thenTxt: 'включить обдув',
  },
  {
    id: 'r_order',
    zone: 'hopper',
    ifTxt: 'сырьё ≤ 20%',
    thenTxt: 'автозаказ (−40 ₽)',
  },
  {
    id: 'r_chill',
    zone: 'fridge',
    ifTxt: 'T° склада ≥ 70%',
    thenTxt: 'усилить холод',
  },
  {
    id: 'r_grid',
    zone: 'power',
    ifTxt: 'нагрузка ≥ 80%',
    thenTxt: 'развести нагрузку',
  },
  {
    id: 'r_go',
    zone: 'dock',
    ifTxt: 'рейс горит (< 5 с)',
    thenTxt: 'автодиспетчер',
  },
];

export function createRules(): RuleDef[] {
  return RULE_DEFS.map((r) => ({ ...r, active: false, cd: 0, lastFire: -9 }));
}
