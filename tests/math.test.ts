import { describe, expect, it } from 'vitest';
import { clamp, fmtMoney, fmtTime, lerp, lossPct } from '@/core/math';

describe('math — happy path', () => {
  it('lerps between endpoints', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(100, 200, 0)).toBe(100);
    expect(lerp(100, 200, 1)).toBe(200);
  });

  it('formats money and time for display', () => {
    expect(fmtMoney(1234)).toContain('1');
    expect(fmtMoney(1234)).toContain('₽');
    expect(fmtTime(125)).toBe('2:05');
    expect(fmtTime(59)).toBe('0:59');
  });

  it('computes loss percentage from earned/lost totals', () => {
    expect(lossPct({ earned: 100, lost: 50 })).toBe(33);
    expect(lossPct({ earned: 200, lost: 0 })).toBe(0);
  });
});

describe('math — boundary', () => {
  it('clamp pins values to range', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(0, 0, 0)).toBe(0);
  });

  it('lossPct treats zero earned as 100% loss', () => {
    expect(lossPct({ earned: 0, lost: 100 })).toBe(100);
    expect(lossPct({ earned: 0, lost: 0 })).toBe(0);
  });

  it('fmtTime never shows negative seconds', () => {
    expect(fmtTime(-10)).toBe('0:00');
    expect(fmtTime(0)).toBe('0:00');
    expect(fmtTime(60)).toBe('1:00');
  });
});

describe('math — negative', () => {
  it('lerp extrapolates outside 0..1', () => {
    expect(lerp(0, 10, 2)).toBe(20);
    expect(lerp(0, 10, -1)).toBe(-10);
  });

  it('lossPct rounds to nearest integer percent', () => {
    expect(lossPct({ earned: 1, lost: 2 })).toBe(67);
  });
});
