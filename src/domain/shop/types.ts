export type ShopCategory =
  | 'personnel'
  | 'managers'
  | 'materials'
  | 'structures'
  | 'equipment'
  | 'infrastructure'
  | 'upgrades';

export interface ShopItemDef {
  id: string;
  category: ShopCategory;
  nameKey: string;
  descriptionKey: string;
  price: number;
  upkeep: number;
  prerequisites: string[];
  minMoney?: number;
  minTutorialStep?: number;
  roleId?: string;
  zoneId?: string;
  capacityBonus?: number;
  incomeBonus?: number;
  hireCount?: number;
}

export interface PurchasePreview {
  item: ShopItemDef;
  canBuy: boolean;
  blockReason: string | null;
  forecastUpkeep: number;
  forecastIncome: number;
}
