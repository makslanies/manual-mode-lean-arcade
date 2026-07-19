import { describe, expect, it } from 'vitest';
import { SeedRng } from '@/core/Seed';

describe('SeedRng — happy path', () => {
  it('produces identical sequences for the same seed', () => {
    const a = new SeedRng(42);
    const b = new SeedRng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('clone preserves stream position', () => {
    const rng = new SeedRng(7);
    rng.next();
    rng.next();
    const snap = rng.clone();
    expect(snap.next()).toBe(rng.next());
  });

  it('pick selects from array', () => {
    const rng = new SeedRng(99);
    const item = rng.pick(['a', 'b', 'c']);
    expect(['a', 'b', 'c']).toContain(item);
  });

  it('range stays within bounds', () => {
    const rng = new SeedRng(123);
    for (let i = 0; i < 50; i++) {
      const v = rng.range(2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThan(5);
    }
  });
});

describe('SeedRng — boundary', () => {
  it('handles seed 0 and large uint32 values', () => {
    const a = new SeedRng(0);
    const b = new SeedRng(0xffffffff);
    expect(a.next()).toBeGreaterThanOrEqual(0);
    expect(a.next()).toBeLessThan(1);
    expect(b.next()).toBeGreaterThanOrEqual(0);
    expect(b.next()).toBeLessThan(1);
  });

  it('chance(0) is always false and chance(1) is always true', () => {
    const rng = new SeedRng(1);
    for (let i = 0; i < 10; i++) {
      expect(rng.chance(0)).toBe(false);
    }
    const rng2 = new SeedRng(1);
    for (let i = 0; i < 10; i++) {
      expect(rng2.chance(1)).toBe(true);
    }
  });

  it('pick with a single item always returns it', () => {
    const rng = new SeedRng(5);
    expect(rng.pick(['only'])).toBe('only');
    expect(rng.pick(['only'])).toBe('only');
  });

  it('range with equal min and max returns that value', () => {
    const rng = new SeedRng(11);
    expect(rng.range(3, 3)).toBe(3);
  });
});

describe('SeedRng — negative', () => {
  it('different seeds diverge quickly', () => {
    const a = new SeedRng(1);
    const b = new SeedRng(2);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('advancing state changes subsequent outputs', () => {
    const first = new SeedRng(42);
    const second = new SeedRng(42);
    first.next();
    expect(first.next()).not.toBe(second.next());
  });
});
