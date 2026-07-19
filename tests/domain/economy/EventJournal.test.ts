import { describe, expect, it } from 'vitest';
import { freshState } from '../../helpers';
import {
  logEvent,
  recentEvents,
  resetEventCounter,
  syncEventCounter,
} from '@/domain/economy/EventJournal';

describe('EventJournal — logEvent', () => {
  it('happy path: appends event with monotonic ids', () => {
    resetEventCounter(0);
    const state = freshState();
    const a = logEvent(state, 'test', 'First');
    const b = logEvent(state, 'test', 'Second');
    expect(a.id).toBe('evt_1');
    expect(b.id).toBe('evt_2');
    expect(state.events).toHaveLength(2);
    expect(b.gameTime).toBe(state.gameT);
  });

  it('continues ids after restored journal (no duplicate keys)', () => {
    resetEventCounter(0);
    const state = freshState();
    state.events = [
      { id: 'evt_1', gameTime: 0, type: 'growth_unlock', message: 'restored' },
      { id: 'evt_5', gameTime: 1, type: 'hire', message: 'restored hire' },
    ];
    syncEventCounter(state.events);
    const next = logEvent(state, 'purchase', 'New buy');
    expect(next.id).toBe('evt_6');
    const ids = state.events.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('happy path: stores optional payload', () => {
    resetEventCounter(0);
    const state = freshState();
    logEvent(state, 'purchase', 'Bought item', { itemId: 'mat_raw_stock', price: 120 });
    expect(state.events[0].payload).toEqual({ itemId: 'mat_raw_stock', price: 120 });
  });

  it('boundary: trims journal to 200 events', () => {
    resetEventCounter(0);
    const state = freshState();
    for (let i = 0; i < 210; i++) {
      logEvent(state, 'spam', `Event ${i}`);
    }
    expect(state.events).toHaveLength(200);
    expect(state.events[0].message).toBe('Event 10');
    expect(state.events.at(-1)?.message).toBe('Event 209');
  });
});

describe('EventJournal — recentEvents', () => {
  it('returns tail slice with default limit', () => {
    resetEventCounter(0);
    const state = freshState();
    for (let i = 0; i < 30; i++) logEvent(state, 'x', `E${i}`);
    const recent = recentEvents(state);
    expect(recent).toHaveLength(20);
    expect(recent[0].message).toBe('E10');
  });

  it('boundary: limit larger than journal returns all', () => {
    resetEventCounter(0);
    const state = freshState();
    logEvent(state, 'x', 'only');
    expect(recentEvents(state, 100)).toHaveLength(1);
  });
});
