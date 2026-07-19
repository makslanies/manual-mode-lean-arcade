import { describe, expect, it } from 'vitest';
import { RULE_BUDGET, SENSOR_BUDGET, SENSOR_PRIORITY } from '@/core/constants';
import {
  mountSensors,
  prepareRules,
  prepareSupply,
  unlockZonesAct1,
  wireRules,
} from '@/domain/phases';
import { gameplayState } from './helpers';

describe('phases — happy path', () => {
  it('unlocks zones during act 1 at scheduled times', () => {
    const s = gameplayState('play');
    const unlocked: string[] = [];
    s.phaseT = 20;
    unlockZonesAct1(s, { onUnlock: (name) => unlocked.push(name) });
    expect(s.zoneMap.hopper!.on).toBe(true);
    expect(unlocked).toContain('БУНКЕР СЫРЬЯ');

    s.phaseT = 40;
    unlockZonesAct1(s, { onUnlock: (name) => unlocked.push(name) });
    expect(s.zoneMap.dock!.on).toBe(true);
  });

  it('prepareSupply switches to supply overlay', () => {
    const s = gameplayState('play');
    prepareSupply(s);
    expect(s.mode).toBe('supply');
    expect(s.selSensors.size).toBe(0);
    expect(s.director.fixing).toBeNull();
  });

  it('mountSensors auto-fills budget and enters play2', () => {
    const s = gameplayState('supply');
    mountSensors(s);
    expect(s.mode).toBe('play2');
    expect(s.selSensors.size).toBe(SENSOR_BUDGET);
    expect(s.zoneMap.machine!.sensor).toBe(true);
    for (const z of s.zones) expect(z.on).toBe(true);
  });

  it('prepareRules and wireRules activate automation', () => {
    const s = gameplayState('play2');
    for (const id of SENSOR_PRIORITY.slice(0, SENSOR_BUDGET)) {
      s.zoneMap[id]!.sensor = true;
    }
    prepareRules(s);
    expect(s.mode).toBe('rules');
    expect(s.selRules.size).toBe(0);

    wireRules(s);
    expect(s.mode).toBe('play3');
    expect(s.selRules.size).toBeGreaterThan(0);
    expect(s.selRules.size).toBeLessThanOrEqual(RULE_BUDGET);
    const active = s.rules.filter((r) => r.active);
    expect(active.length).toBe(s.selRules.size);
  });
});

describe('phases — boundary', () => {
  it('does not re-unlock zones already on', () => {
    const s = gameplayState('play');
    for (const z of s.zones) z.on = true;
    let count = 0;
    s.phaseT = 120;
    unlockZonesAct1(s, { onUnlock: () => count++ });
    expect(count).toBe(0);
  });

  it('mountSensors keeps pre-selected sensors and fills remaining budget', () => {
    const s = gameplayState('supply');
    s.selSensors.add('machine');
    s.selSensors.add('hopper');
    mountSensors(s);
    expect(s.selSensors.has('machine')).toBe(true);
    expect(s.selSensors.has('hopper')).toBe(true);
    expect(s.selSensors.size).toBe(SENSOR_BUDGET);
    expect(s.zoneMap.machine!.sensor).toBe(true);
    expect(s.zoneMap.hopper!.sensor).toBe(true);
  });

  it('wireRules caps auto-selection at RULE_BUDGET', () => {
    const s = gameplayState('play2');
    for (const id of SENSOR_PRIORITY) {
      s.zoneMap[id]!.sensor = true;
    }
    wireRules(s);
    expect(s.selRules.size).toBeLessThanOrEqual(RULE_BUDGET);
  });

  it('sets dock truck deadlines on first dock unlock', () => {
    const s = gameplayState('play');
    s.phaseT = 40;
    s.gameT = 40;
    unlockZonesAct1(s, { onUnlock: () => {} });
    expect(s.trucks[0]!.deadline).toBeGreaterThan(s.gameT);
    expect(s.trucks[1]!.deadline).toBeGreaterThan(s.trucks[0]!.deadline);
  });
});

describe('phases — negative', () => {
  it('unlockZonesAct1 ignores non-play modes', () => {
    const s = gameplayState('play2');
    s.phaseT = 100;
    unlockZonesAct1(s, { onUnlock: () => {} });
    expect(s.zoneMap.press!.on).toBe(false);
  });

  it('wireRules only activates rules on sensor-equipped zones', () => {
    const s = gameplayState('play2');
    s.zoneMap.machine!.sensor = true;
    s.zoneMap.hopper!.sensor = false;
    wireRules(s);
    expect(s.selRules.has('r_cool')).toBe(true);
    expect(s.selRules.has('r_order')).toBe(false);
  });

  it('prepareSupply clears prior sensor selection', () => {
    const s = gameplayState('play');
    s.selSensors.add('machine');
    prepareSupply(s);
    expect(s.selSensors.size).toBe(0);
  });

  it('mountSensors resets power outage and caps zone values', () => {
    const s = gameplayState('supply');
    s.powerOut = true;
    s.zoneMap.machine!.value = 0.9;
    mountSensors(s);
    expect(s.powerOut).toBe(false);
    expect(s.zoneMap.machine!.value).toBeLessThanOrEqual(0.4);
  });
});
