export type GameMode =
  | 'title'
  | 'play'
  | 'supply'
  | 'play2'
  | 'rules'
  | 'play3'
  | 'end';

export type ZoneKind =
  | 'machine'
  | 'hopper'
  | 'dock'
  | 'press'
  | 'worker'
  | 'fridge'
  | 'power';

export interface ZoneDef {
  id: string;
  name: string;
  gx: number;
  gy: number;
  unlock: number;
  kind: ZoneKind;
  gauge: string;
  sensorName: string | null;
  sensorDesc: string | null;
}

export interface ZoneState extends ZoneDef {
  on: boolean;
  unlockAt: number | null;
  value: number;
  failed: boolean;
  lookUntil: number;
  sensor: boolean;
  warned: boolean;
  spawnT: number;
}

export interface ActStats {
  earned: number;
  lost: number;
}

export interface TruckState {
  id: number;
  phase: 'load' | 'ready' | 'route';
  t: number;
  p: number;
  deadline: number;
  delivered: boolean;
  park: number;
  onTime?: boolean;
}

export interface RuleDef {
  id: string;
  zone: string;
  ifTxt: string;
  thenTxt: string;
  active: boolean;
  cd: number;
  lastFire: number;
}

export interface DirectorAction {
  label: string;
  dur: number;
  kind: string;
  cost?: number;
  preventive?: boolean;
}

export interface DirectorFix {
  zone: ZoneState;
  act: DirectorAction;
  t: number;
  wasVisible: boolean;
}

export interface DirectorState {
  gx: number;
  gy: number;
  tx: number;
  ty: number;
  targetZone: ZoneState | null;
  fixing: DirectorFix | null;
  step: number;
  face: number;
}

export interface FloatText {
  x: number;
  y: number;
  txt: string;
  color: string;
  size: number;
  life: number;
}

export interface Particle {
  t: 'dust' | 'smoke' | 'coin' | 'zzz';
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  life: number;
  size: number;
  color: string;
  x0?: number;
  y0?: number;
  cx?: number;
  cy?: number;
  p?: number;
}

export interface Pulse {
  zone: string;
  t: number;
}

export interface Quip {
  who: string;
  txt: string;
}

export interface QuipCurrent extends Quip {
  t: number;
}

export interface GameSnapshot {
  mode: GameMode;
  gameT: number;
  phaseT: number;
  money: number;
  comboMult: number;
  comboN: number;
  comboUntil: number;
  accidents: number;
  prevented: number;
  autoActs: number;
  stock: number;
  tripsOnTime: number;
  tripsLate: number;
  powerOut: boolean;
  shake: number;
  hitstop: number;
  supplyLeft: number;
  rulesLeft: number;
  stat: Record<1 | 2 | 3, ActStats>;
  zones: ZoneState[];
  zoneMap: Record<string, ZoneState>;
  trucks: TruckState[];
  rules: RuleDef[];
  pulses: Pulse[];
  director: DirectorState;
  parts: Particle[];
  floats: FloatText[];
  quips: Quip[];
  quipCur: QuipCurrent | null;
  quipIdle: number;
  coinAcc: number;
  alarmAcc: number;
  moneyPulse: number;
  hintedOnce: Record<string, boolean>;
  selSensors: Set<string>;
  selRules: Set<string>;
  seed: number;
  commandJournal: string[];
}

export interface RenderCamera {
  scale: number;
  x: number;
  y: number;
  w: number;
  h: number;
  dpr: number;
}
