import { describe, expect, it } from 'vitest';
import { TRIP_STOCK } from '@/core/constants';
import { ruleCheck, ruleRun } from '@/domain/lean/ruleLogic';
import { updateRulesEngine } from '@/domain/lean/rulesEngine';
import { activateRule, freshState, gameplayState, noopTruckCb } from './helpers';

describe('rules — happy path', () => {
  it('fires each rule when its condition is met', () => {
    const s = freshState();
    s.zoneMap.machine!.on = true;
    s.zoneMap.machine!.value = 0.85;
    expect(ruleCheck(s, 'r_cool')).toBe(true);

    s.zoneMap.hopper!.on = true;
    s.zoneMap.hopper!.value = 0.9;
    expect(ruleCheck(s, 'r_order')).toBe(true);

    s.zoneMap.fridge!.on = true;
    s.zoneMap.fridge!.value = 0.75;
    expect(ruleCheck(s, 'r_chill')).toBe(true);

    s.zoneMap.power!.on = true;
    s.zoneMap.power!.value = 0.9;
    expect(ruleCheck(s, 'r_grid')).toBe(true);

    s.zoneMap.dock!.on = true;
    s.stock = TRIP_STOCK;
    s.gameT = 100;
    s.trucks[0]!.phase = 'ready';
    s.trucks[0]!.deadline = 104;
    expect(ruleCheck(s, 'r_go')).toBe(true);
  });

  it('ruleRun applies corrective actions', () => {
    const s = freshState();
    s.zoneMap.machine!.on = true;
    s.zoneMap.machine!.value = 0.9;
    ruleRun(s, 'r_cool', noopTruckCb());
    expect(s.zoneMap.machine!.value).toBeCloseTo(0.12);

    s.money = 100;
    s.zoneMap.hopper!.on = true;
    ruleRun(s, 'r_order', noopTruckCb());
    expect(s.zoneMap.hopper!.value).toBe(0);
    expect(s.money).toBe(60);

    s.zoneMap.fridge!.on = true;
    s.zoneMap.fridge!.failed = true;
    ruleRun(s, 'r_chill', noopTruckCb());
    expect(s.zoneMap.fridge!.value).toBeCloseTo(0.15);
    expect(s.zoneMap.fridge!.failed).toBe(false);
  });

  it('rules engine fires active rules in play3', () => {
    const s = gameplayState('play3');
    s.zoneMap.machine!.on = true;
    s.zoneMap.machine!.value = 0.85;
    activateRule(s, 'r_cool');

    let autoCount = 0;
    updateRulesEngine(s, 0.1, noopTruckCb(), {
      onAuto: () => autoCount++,
      onFloatZone: () => {},
      maybeSay: () => {},
    });

    expect(autoCount).toBe(1);
    expect(s.autoActs).toBe(1);
    expect(s.rules.find((r) => r.id === 'r_cool')!.cd).toBeCloseTo(1.4);
    expect(s.zoneMap.machine!.value).toBeCloseTo(0.12);
  });
});

describe('rules — boundary', () => {
  it('uses exact threshold values', () => {
    const s = freshState();
    s.zoneMap.machine!.on = true;
    s.zoneMap.machine!.value = 0.799;
    expect(ruleCheck(s, 'r_cool')).toBe(false);
    s.zoneMap.machine!.value = 0.8;
    expect(ruleCheck(s, 'r_cool')).toBe(true);

    s.zoneMap.fridge!.on = true;
    s.zoneMap.fridge!.value = 0.699;
    expect(ruleCheck(s, 'r_chill')).toBe(false);
    s.zoneMap.fridge!.value = 0.7;
    expect(ruleCheck(s, 'r_chill')).toBe(true);
  });

  it('r_go fires when deadline is exactly 5 seconds away', () => {
    const s = freshState();
    s.zoneMap.dock!.on = true;
    s.stock = TRIP_STOCK;
    s.gameT = 50;
    s.trucks[0]!.phase = 'ready';
    s.trucks[0]!.deadline = 55;
    expect(ruleCheck(s, 'r_go')).toBe(true);
  });

  it('respects cooldown until elapsed', () => {
    const s = gameplayState('play3');
    s.zoneMap.machine!.on = true;
    s.zoneMap.machine!.value = 0.9;
    const rule = s.rules.find((r) => r.id === 'r_cool')!;
    rule.active = true;
    rule.cd = 1.0;

    let fired = 0;
    updateRulesEngine(s, 0.1, noopTruckCb(), {
      onAuto: () => fired++,
      onFloatZone: () => {},
      maybeSay: () => {},
    });
    expect(fired).toBe(0);
    expect(rule.cd).toBeCloseTo(0.9);

    updateRulesEngine(s, 1.0, noopTruckCb(), {
      onAuto: () => fired++,
      onFloatZone: () => {},
      maybeSay: () => {},
    });
    expect(fired).toBe(1);
  });
});

describe('rules — negative', () => {
  it('rejects unknown rule ids', () => {
    const s = freshState();
    expect(ruleCheck(s, 'r_unknown')).toBe(false);
  });

  it('does not fire when zone is off, failed, or power is out', () => {
    const s = freshState();
    s.zoneMap.machine!.on = false;
    s.zoneMap.machine!.value = 1;
    expect(ruleCheck(s, 'r_cool')).toBe(false);

    s.zoneMap.machine!.on = true;
    s.zoneMap.machine!.failed = true;
    expect(ruleCheck(s, 'r_cool')).toBe(false);

    s.zoneMap.machine!.failed = false;
    s.zoneMap.power!.on = true;
    s.zoneMap.power!.value = 0.9;
    s.powerOut = true;
    expect(ruleCheck(s, 'r_grid')).toBe(false);
  });

  it('skips inactive rules and non-play3 modes', () => {
    const s = gameplayState('play2');
    s.zoneMap.machine!.on = true;
    s.zoneMap.machine!.value = 0.9;
    activateRule(s, 'r_cool');

    let fired = 0;
    updateRulesEngine(s, 1, noopTruckCb(), {
      onAuto: () => fired++,
      onFloatZone: () => {},
      maybeSay: () => {},
    });
    expect(fired).toBe(0);

    s.mode = 'play3';
    s.rules.find((r) => r.id === 'r_cool')!.active = false;
    updateRulesEngine(s, 1, noopTruckCb(), {
      onAuto: () => fired++,
      onFloatZone: () => {},
      maybeSay: () => {},
    });
    expect(fired).toBe(0);
  });

  it('r_go fails without stock or ready truck', () => {
    const s = freshState();
    s.zoneMap.dock!.on = true;
    s.stock = TRIP_STOCK - 1;
    s.trucks[0]!.phase = 'ready';
    s.trucks[0]!.deadline = s.gameT + 3;
    expect(ruleCheck(s, 'r_go')).toBe(false);

    s.stock = TRIP_STOCK;
    s.trucks[0]!.phase = 'load';
    expect(ruleCheck(s, 'r_go')).toBe(false);
  });
});
