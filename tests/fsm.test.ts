import { describe, expect, it } from 'vitest';
import {
  actLength,
  difficulty,
  gameplayModeAfterPause,
  isGameplayMode,
  nextModeAfterPhase,
  overlayOpen,
  pauseCountdown,
  pauseDuration,
  phaseFromMode,
} from '@/core/FSM';
import { ACT1_LEN, ACT2_LEN, ACT3_LEN, RULES_LEN, SUPPLY_LEN } from '@/core/constants';

describe('FSM — happy path', () => {
  it('maps gameplay modes to act phases', () => {
    expect(phaseFromMode('play')).toBe(1);
    expect(phaseFromMode('play2')).toBe(2);
    expect(phaseFromMode('play3')).toBe(3);
  });

  it('advances through the 7-state cycle', () => {
    expect(nextModeAfterPhase('play')).toBe('supply');
    expect(gameplayModeAfterPause('supply')).toBe('play2');
    expect(nextModeAfterPhase('play2')).toBe('rules');
    expect(gameplayModeAfterPause('rules')).toBe('play3');
    expect(nextModeAfterPhase('play3')).toBe('end');
  });

  it('classifies overlay and gameplay modes', () => {
    expect(isGameplayMode('play')).toBe(true);
    expect(isGameplayMode('play2')).toBe(true);
    expect(isGameplayMode('play3')).toBe(true);
    expect(overlayOpen('title')).toBe(true);
    expect(overlayOpen('supply')).toBe(true);
    expect(overlayOpen('rules')).toBe(true);
    expect(overlayOpen('end')).toBe(true);
  });

  it('returns pause countdown kinds and durations', () => {
    expect(pauseCountdown('supply')).toBe('supply');
    expect(pauseCountdown('rules')).toBe('rules');
    expect(pauseDuration('supply')).toBe(SUPPLY_LEN);
    expect(pauseDuration('rules')).toBe(RULES_LEN);
  });
});

describe('FSM — boundary', () => {
  it('returns prototype act lengths', () => {
    expect(actLength('play')).toBe(ACT1_LEN);
    expect(actLength('play2')).toBe(ACT2_LEN);
    expect(actLength('play3')).toBe(ACT3_LEN);
  });

  it('ramps difficulty at act 1 edges and caps later acts', () => {
    expect(difficulty('play', 0)).toBeCloseTo(1);
    expect(difficulty('play', ACT1_LEN)).toBeCloseTo(2.2);
    expect(difficulty('play', ACT1_LEN * 2)).toBeCloseTo(2.2);
    expect(difficulty('play2', 0)).toBe(2.2);
    expect(difficulty('play3', 999)).toBe(2.4);
  });
});

describe('FSM — negative', () => {
  it('returns null for non-transition modes', () => {
    expect(nextModeAfterPhase('title')).toBeNull();
    expect(nextModeAfterPhase('supply')).toBeNull();
    expect(nextModeAfterPhase('rules')).toBeNull();
    expect(nextModeAfterPhase('end')).toBeNull();
  });

  it('returns null pause countdown outside supply/rules', () => {
    expect(pauseCountdown('play')).toBeNull();
    expect(pauseCountdown('title')).toBeNull();
    expect(pauseCountdown('end')).toBeNull();
  });

  it('treats title as phase 1 for stats routing', () => {
    expect(phaseFromMode('title')).toBe(1);
    expect(isGameplayMode('title')).toBe(false);
    expect(overlayOpen('play')).toBe(false);
    expect(gameplayModeAfterPause('play')).toBeNull();
  });
});
