import { describe, expect, it } from 'vitest';
import { SeedRng } from '@/core/Seed';
import { difficulty, actLength } from '@/core/FSM';
import { lossPct } from '@/core/math';
import { createInitialState, resetRun } from '@/domain/GameState';
import { ruleCheck } from '@/domain/lean/ruleLogic';
import { machineFlow, pressFlow } from '@/domain/production/flow';

describe('SeedRng determinism', () => {
  it('same seed produces same sequence', () => {
    const a = new SeedRng(42);
    const b = new SeedRng(42);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });
});

describe('FSM timings', () => {
  it('act lengths match prototype', () => {
    expect(actLength('play')).toBe(130);
    expect(actLength('play2')).toBe(55);
    expect(actLength('play3')).toBe(60);
  });

  it('difficulty ramps act 1 and caps act 3', () => {
    expect(difficulty('play', 0)).toBeCloseTo(1);
    expect(difficulty('play', 130)).toBeCloseTo(2.2);
    expect(difficulty('play3', 0)).toBe(2.4);
    expect(difficulty('play2', 0)).toBe(2.2);
  });
});

describe('Economy formulas', () => {
  it('loss percentage handles zero earned', () => {
    expect(lossPct({ earned: 0, lost: 100 })).toBe(100);
    expect(lossPct({ earned: 100, lost: 50 })).toBe(33);
  });
});

describe('Production chain', () => {
  it('machineFlow requires power and raw material', () => {
    const s = createInitialState(1);
    resetRun(s);
    s.mode = 'play';
    s.zoneMap.machine!.on = true;
    s.zoneMap.hopper!.on = true;
    s.zoneMap.hopper!.value = 1;
    expect(machineFlow(s)).toBe(false);
    s.zoneMap.hopper!.value = 0.5;
    expect(machineFlow(s)).toBe(true);
    s.powerOut = true;
    expect(machineFlow(s)).toBe(false);
  });

  it('pressFlow depends on machine', () => {
    const s = createInitialState(1);
    resetRun(s);
    s.zoneMap.press!.on = true;
    s.zoneMap.machine!.on = true;
    s.zoneMap.machine!.failed = true;
    expect(pressFlow(s)).toBe(false);
  });
});

describe('Rule checks', () => {
  it('cool rule fires at 80% machine temp', () => {
    const s = createInitialState(1);
    s.zoneMap.machine!.on = true;
    s.zoneMap.machine!.value = 0.79;
    expect(ruleCheck(s, 'r_cool')).toBe(false);
    s.zoneMap.machine!.value = 0.8;
    expect(ruleCheck(s, 'r_cool')).toBe(true);
  });
});
