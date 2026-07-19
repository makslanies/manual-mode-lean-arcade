import { describe, expect, it } from 'vitest';
import { TRIP_STOCK, TRIP_WINDOW } from '@/core/constants';
import { applyPreventBonus, tickEconomy } from '@/domain/production/economy';
import { failZone } from '@/domain/production/failures';
import {
  chainFlow,
  gaugeFill,
  machineFlow,
  pressFlow,
  problemCount,
  zoneProblem,
  zoneProducing,
  zoneVisible,
} from '@/domain/production/flow';
import { dispatchTruck, truckPos } from '@/domain/production/trucks';
import { freshState, noopFailCb, noopTruckCb } from './helpers';

describe('production — happy path', () => {
  it('machine and press flow when prerequisites are met', () => {
    const s = freshState();
    s.mode = 'play';
    s.zoneMap.machine!.on = true;
    s.zoneMap.hopper!.on = true;
    s.zoneMap.hopper!.value = 0.5;
    expect(machineFlow(s)).toBe(true);

    s.zoneMap.press!.on = true;
    expect(pressFlow(s)).toBe(true);
    expect(chainFlow(s)).toBe(true);
  });

  it('zoneProducing reflects active production chain', () => {
    const s = freshState();
    s.mode = 'play';
    s.zoneMap.machine!.on = true;
    s.zoneMap.hopper!.value = 0.5;
    expect(zoneProducing(s, s.zoneMap.machine!)).toBe(true);

    s.zoneMap.worker!.on = true;
    s.zoneMap.press!.on = true;
    expect(zoneProducing(s, s.zoneMap.worker!)).toBe(true);
  });

  it('tickEconomy earns money from producing zones', () => {
    const s = freshState();
    s.mode = 'play';
    s.zoneMap.machine!.on = true;
    s.zoneMap.hopper!.value = 0.5;
    const before = s.money;
    tickEconomy(s, 1);
    expect(s.money).toBeGreaterThan(before);
    expect(s.stat[1].earned).toBeGreaterThan(0);
  });

  it('dispatchTruck consumes stock and starts route', () => {
    const s = freshState();
    s.zoneMap.dock!.on = true;
    s.stock = TRIP_STOCK;
    s.trucks[0]!.phase = 'ready';
    s.trucks[0]!.deadline = s.gameT + 10;

    const ok = dispatchTruck(s, false, noopTruckCb());
    expect(ok).toBe(true);
    expect(s.stock).toBe(0);
    expect(s.trucks[0]!.phase).toBe('route');
  });

  it('applyPreventBonus stacks combo and pays bonus', () => {
    const s = freshState();
    s.mode = 'play';
    applyPreventBonus(s);
    expect(s.prevented).toBe(1);
    expect(s.comboN).toBe(1);
    expect(s.comboMult).toBe(1.5);
    expect(s.money).toBeGreaterThan(500);
  });
});

describe('production — boundary', () => {
  it('blocks machineFlow when hopper is exactly full', () => {
    const s = freshState();
    s.zoneMap.machine!.on = true;
    s.zoneMap.hopper!.on = true;
    s.zoneMap.hopper!.value = 1;
    expect(machineFlow(s)).toBe(false);
    s.zoneMap.hopper!.value = 0.999;
    expect(machineFlow(s)).toBe(true);
  });

  it('dispatch requires exactly TRIP_STOCK units', () => {
    const s = freshState();
    s.zoneMap.dock!.on = true;
    s.trucks[0]!.phase = 'ready';
    s.trucks[0]!.deadline = s.gameT + 10;
    s.stock = TRIP_STOCK;
    expect(dispatchTruck(s, false, noopTruckCb())).toBe(true);

    s.trucks[0]!.phase = 'ready';
    s.stock = TRIP_STOCK - 1;
    expect(dispatchTruck(s, false, noopTruckCb())).toBe(false);
  });

  it('gaugeFill inverts hopper and dock urgency', () => {
    const s = freshState();
    s.zoneMap.hopper!.value = 0.8;
    expect(gaugeFill(s, s.zoneMap.hopper!)).toBeCloseTo(0.2);

    s.trucks[0]!.phase = 'ready';
    s.trucks[0]!.deadline = s.gameT + TRIP_WINDOW;
    s.trucks[1]!.phase = 'route';
    expect(gaugeFill(s, s.zoneMap.dock!)).toBeCloseTo(1);
    s.gameT = 10;
    s.trucks[0]!.deadline = 10;
    expect(gaugeFill(s, s.zoneMap.dock!)).toBeCloseTo(0);
  });

  it('zoneVisible respects sensor and lookUntil fog', () => {
    const s = freshState();
    const z = s.zoneMap.machine!;
    z.sensor = false;
    z.lookUntil = 5;
    s.gameT = 4;
    expect(zoneVisible(s, z)).toBe(true);
    s.gameT = 6;
    expect(zoneVisible(s, z)).toBe(false);
    z.sensor = true;
    expect(zoneVisible(s, z)).toBe(true);
  });
});

describe('production — negative', () => {
  it('stops flow on power outage and failures', () => {
    const s = freshState();
    s.zoneMap.machine!.on = true;
    s.zoneMap.hopper!.value = 0.5;
    s.powerOut = true;
    expect(machineFlow(s)).toBe(false);

    s.powerOut = false;
    s.zoneMap.machine!.failed = true;
    expect(machineFlow(s)).toBe(false);
    expect(pressFlow(s)).toBe(false);
  });

  it('reports zone problems for common failure modes', () => {
    const s = freshState();
    s.zoneMap.machine!.on = true;
    s.powerOut = true;
    expect(zoneProblem(s, s.zoneMap.machine!)).toBe('НЕТ ПИТАНИЯ');

    s.powerOut = false;
    s.zoneMap.machine!.failed = true;
    expect(zoneProblem(s, s.zoneMap.machine!)).toBe('АВАРИЯ');

    s.zoneMap.hopper!.on = true;
    s.zoneMap.hopper!.value = 1;
    expect(zoneProblem(s, s.zoneMap.hopper!)).toBe('ПУСТО');
    expect(problemCount(s)).toBeGreaterThan(0);
  });

  it('failZone deducts money and marks accidents', () => {
    const s = freshState();
    s.mode = 'play';
    const before = s.money;
    failZone(s, s.zoneMap.machine!, noopFailCb());
    expect(s.zoneMap.machine!.failed).toBe(true);
    expect(s.accidents).toBe(1);
    expect(s.money).toBeLessThan(before);
    expect(s.stat[1].lost).toBeGreaterThan(0);
  });

  it('dispatchTruck returns false without ready truck', () => {
    const s = freshState();
    s.stock = TRIP_STOCK;
    s.trucks[0]!.phase = 'load';
    expect(dispatchTruck(s, false, noopTruckCb())).toBe(false);
  });

  it('truckPos stays at dock when not routing', () => {
    const tr = freshState().trucks[0]!;
    tr.phase = 'ready';
    const pos = truckPos(tr);
    expect(pos.gx).toBeCloseTo(13.4);
    expect(pos.gy).toBeCloseTo(8.8);
  });
});
