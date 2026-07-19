export interface ShopContent {
  openBtn: string;
  closeBtn: string;
  title: string;
  cash: string;
  upkeep: string;
  bonus: string;
  efficiency: string;
  categories: Record<string, string>;
  buyBtn: string;
  assignBtn: string;
  hireTitle: string;
  zoneLabel: string;
  brigadeLabel: string;
  orgTitle: string;
  journalTitle: string;
  block: {
    alreadyOwned: string;
    noMoney: string;
    tutorialLocked: string;
    needsDefault: string;
  };
  tutorial: string[];
  items: Record<string, { name: string; desc: string }>;
}

export type ShopItemKey =
  | 'operator'
  | 'assembler'
  | 'mechanic'
  | 'hopper'
  | 'forklift'
  | 'foreman'
  | 'shiftLead'
  | 'rawStock'
  | 'spareParts'
  | 'packaging'
  | 'assemblyHall'
  | 'rawWarehouse'
  | 'sensorKit'
  | 'forkliftEquip'
  | 'roadSegment'
  | 'secondGate'
  | 'standardWork'
  | 'visualMgmt'
  | 'crossTrain';

export const ITEM_KEY_MAP: Record<string, ShopItemKey> = {
  hire_operator: 'operator',
  hire_assembler: 'assembler',
  hire_mechanic: 'mechanic',
  hire_hopper: 'hopper',
  hire_forklift: 'forklift',
  mgr_foreman: 'foreman',
  mgr_shift_lead: 'shiftLead',
  mat_raw_stock: 'rawStock',
  mat_spare_parts: 'spareParts',
  mat_packaging: 'packaging',
  struct_assembly_hall: 'assemblyHall',
  struct_raw_warehouse: 'rawWarehouse',
  equip_sensor_kit: 'sensorKit',
  equip_forklift: 'forkliftEquip',
  infra_road_segment: 'roadSegment',
  infra_second_gate: 'secondGate',
  upg_standard_work: 'standardWork',
  upg_visual_mgmt: 'visualMgmt',
  upg_cross_train: 'crossTrain',
};
