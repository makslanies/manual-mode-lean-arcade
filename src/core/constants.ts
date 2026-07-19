/** Wall-clock act lengths (seconds of game time). */
export const ACT1_LEN = 165;
export const ACT2_LEN = 75;
export const ACT3_LEN = 85;
export const SUPPLY_LEN = 22;
export const RULES_LEN = 28;
export const SENSOR_BUDGET = 3;
export const RULE_BUDGET = 3;

/**
 * Scales gameplay dt (< 1 = slower). Director movement is compensated so the
 * hero still walks at a usable pace while crises build more slowly.
 */
export const PLAY_SPEED = 0.72;
/** Multiplier so director stays roughly at pre-slowdown responsiveness. */
export const DIRECTOR_SPEED_COMP = 1 / PLAY_SPEED;

export const TW = 68;
export const TH = 34;
export const GRID = 18;

export const TRIP_TIME = 13;
export const TRIP_WINDOW = 32;
export const LOAD_TIME = 6;
export const TRIP_STOCK = 25;

export const HUB = { gx: 11.0, gy: 12.2 };

export const ROAD_PATH = [
  { gx: 13.4, gy: 8.8 },
  { gx: 15.5, gy: 8.8 },
  { gx: 15.5, gy: 1.9 },
];

export const SENSOR_PRIORITY = ['machine', 'power', 'dock', 'fridge', 'hopper'] as const;

export const DASH_SHORT: Record<string, string> = {
  machine: 'СТАНОК',
  hopper: 'БУНКЕР',
  dock: 'ДОК',
  press: 'ПРЕСС',
  worker: 'СБОРКА',
  fridge: 'СКЛАД',
  power: 'ЭНЕРГО',
};

export const START_MONEY = 500;
export const START_STOCK = 30;
export const DEFAULT_SEED = 42;
