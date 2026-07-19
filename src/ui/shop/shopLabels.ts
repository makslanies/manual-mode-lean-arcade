import { ITEM_KEY_MAP } from '@/content/shopContent';
import { shopRu } from '@/content/shopRu';
import type { ShopItemDef } from '@/domain/shop/types';

export function itemLabel(item: ShopItemDef): { name: string; desc: string } {
  const key = ITEM_KEY_MAP[item.id];
  const entry = key ? shopRu.items[key] : undefined;
  return entry ?? { name: item.id, desc: '' };
}
