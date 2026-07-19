import { useMemo, useState } from 'react';
import type { GameSnapshot } from '@/core/types';
import { shopRu } from '@/content/shopRu';
import { SHOP_CATEGORIES } from '@/domain/shop/CatalogItems';
import { filterPurchasable, getBlockLabel } from '@/domain/shop/ShopController';
import type { ShopItemDef } from '@/domain/shop/types';
import { HireAssignPanel } from './HireAssignPanel';
import { itemLabel } from './shopLabels';
import { OrgChartPanel } from './OrgChartPanel';
import './shop.css';

export interface ShopOverlayProps {
  state: GameSnapshot;
  onClose: () => void;
  onPurchase: (itemId: string) => void;
  onAssign: (employeeId: string, zoneId: string) => void;
  onPanel: (panel: 'shop' | 'hire' | 'org' | null) => void;
}

export function ShopOverlay({ state, onClose, onPurchase, onAssign, onPanel }: ShopOverlayProps) {
  const copy = shopRu;
  const [category, setCategory] = useState<ShopItemDef['category']>(
    (state.growth.ui.selectedCategory as ShopItemDef['category']) ?? 'personnel',
  );
  const panel = state.growth.ui.panel;
  const pendingId = panel === 'hire' ? state.org.employees[state.org.employees.length - 1]?.id : null;
  const items = useMemo(() => filterPurchasable(state, category), [state, category]);

  return (
    <div className="shop-overlay" role="dialog" aria-label={copy.title} onPointerDown={(e) => e.stopPropagation()}>
      <div className="shop-panel">
        <header className="shop-panel__header">
          <h2 className="shop-panel__title">{copy.title}</h2>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {copy.closeBtn}
          </button>
        </header>

        <div className="shop-stats">
          <div>
            <span>{copy.cash}</span>
            <strong>{Math.round(state.money)} ₽</strong>
          </div>
          <div>
            <span>{copy.upkeep}</span>
            <strong>{state.growth.totalUpkeep.toFixed(0)} ₽</strong>
          </div>
          <div>
            <span>{copy.bonus}</span>
            <strong>{state.growth.bonusIncomeRate.toFixed(2)}</strong>
          </div>
          <div>
            <span>{copy.efficiency}</span>
            <strong>{Math.round(state.org.efficiencyMult * 100)}%</strong>
          </div>
        </div>

        {state.growth.tutorialStep > 0 && state.growth.tutorialStep < copy.tutorial.length && (
          <p className="shop-tutorial">{copy.tutorial[state.growth.tutorialStep]}</p>
        )}

        <div className="shop-subnav">
          <button type="button" className={`shop-tab ${panel !== 'org' && panel !== 'hire' ? 'shop-tab--active' : ''}`} onClick={() => onPanel(null)}>
            Каталог
          </button>
          <button type="button" className={`shop-tab ${panel === 'org' ? 'shop-tab--active' : ''}`} onClick={() => onPanel('org')}>
            {copy.orgTitle}
          </button>
        </div>

        {panel === 'hire' && pendingId ? (
          <HireAssignPanel
            state={state}
            employeeId={pendingId}
            onAssign={(zoneId) => onAssign(pendingId, zoneId)}
            onCancel={() => onPanel(null)}
          />
        ) : panel === 'org' ? (
          <OrgChartPanel state={state} />
        ) : (
          <>
            <div className="shop-tabs">
              {SHOP_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`shop-tab ${category === cat ? 'shop-tab--active' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  {copy.categories[cat]}
                </button>
              ))}
            </div>
            <div className="shop-list">
              {items.map(({ item, canBuy, blockReason, forecastUpkeep, forecastIncome }) => {
                const labels = itemLabel(item);
                return (
                  <article key={item.id} className={`shop-card ${canBuy ? '' : 'shop-card--disabled'}`}>
                    <div className="shop-card__row">
                      <div>
                        <h3>{labels.name}</h3>
                        <p>{labels.desc}</p>
                      </div>
                      <strong>{item.price} ₽</strong>
                    </div>
                    <div className="shop-card__meta">
                      Upkeep {item.upkeep} ₽/min · forecast upkeep {forecastUpkeep.toFixed(0)} · income +{forecastIncome.toFixed(2)}/s
                    </div>
                    {!canBuy && blockReason && (
                      <div className="shop-card__block">{getBlockLabel(blockReason, copy.block)}</div>
                    )}
                    <button
                      type="button"
                      className="btn shop-card__btn"
                      disabled={!canBuy}
                      onClick={() => onPurchase(item.id)}
                    >
                      {copy.buyBtn}
                    </button>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
