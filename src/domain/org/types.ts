export type EmployeeStatus =
  | 'available'
  | 'working'
  | 'moving'
  | 'training'
  | 'break'
  | 'sleeping';

export type TaskStatus = 'queued' | 'assigned' | 'in_progress' | 'blocked' | 'escalated' | 'completed';

export type TaskCategory = 'production' | 'maintenance' | 'transport' | 'quality' | 'improvement';

export interface EmployeeStats {
  skill: number;
  versatility: number;
  discipline: number;
  motivation: number;
  fatigue: number;
}

export interface Employee {
  id: string;
  name: string;
  roleId: string;
  brigadeId: string | null;
  zoneId: string | null;
  managerId: string | null;
  salary: number;
  status: EmployeeStatus;
  stats: EmployeeStats;
  /** Elapsed time of current discrete fix/control action (0 = idle). */
  actionT: number;
  actionDur: number;
  /** Speech bubble above the worker, e.g. «Готово, босс» / «Zzzzz». */
  bubble: string | null;
  bubbleUntil: number;
  /** Time awake toward next nap. */
  napAcc: number;
  /** How long the current nap has lasted. */
  sleepT: number;
}

export interface Brigade {
  id: string;
  name: string;
  zoneId: string;
  leaderId: string | null;
  memberIds: string[];
  morale: number;
  maxLoad: number;
}

export interface OrgTask {
  id: string;
  type: TaskCategory;
  title: string;
  priority: number;
  status: TaskStatus;
  assigneeId: string | null;
  brigadeId: string | null;
  zoneId: string;
  createdAt: number;
  routine: boolean;
}

export interface Escalation {
  id: string;
  taskId: string;
  reason: string;
  at: number;
}

export interface OrgState {
  employees: Employee[];
  brigades: Brigade[];
  tasks: OrgTask[];
  escalations: Escalation[];
  nextEmpNum: number;
  nextBrigadeNum: number;
  efficiencyMult: number;
  errorMult: number;
  chaosLevel: 'managed' | 'overloaded' | 'unmanaged' | 'chaos';
}

export interface GrowthUiState {
  shopOpen: boolean;
  panel: 'shop' | 'hire' | 'org' | null;
  hireItemId: string | null;
  selectedCategory: string | null;
}

export interface GrowthState {
  unlocked: boolean;
  tutorialStep: number;
  totalUpkeep: number;
  bonusIncomeRate: number;
  ownedItemIds: string[];
  ui: GrowthUiState;
}

export interface GameEvent {
  id: string;
  gameTime: number;
  type: string;
  message: string;
  payload?: Record<string, unknown>;
}
