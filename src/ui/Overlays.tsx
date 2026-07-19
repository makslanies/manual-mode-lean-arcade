import { SENSOR_BUDGET } from '@/core/constants';
import { fmtMoney, lossPct } from '@/core/math';
import type { GameSnapshot } from '@/core/types';
import { ru } from '@/content/ru';

const t = ru;

export interface TitleOverlayProps {
  onStart: () => void;
}

export function TitleOverlay({ onStart }: TitleOverlayProps) {
  return (
    <div className="overlay" role="dialog" aria-labelledby="title-heading">
      <div className="tag">{t.title.tag}</div>
      <h1 id="title-heading">{t.title.heading}</h1>
      <div className="small">{t.title.description}</div>
      <div className="small">Подсказка: кнопка «?» справа или клавиша ?</div>
      <button type="button" className="btn" onClick={onStart}>
        {t.title.startBtn}
      </button>
    </div>
  );
}

export interface SupplyOverlayProps {
  state: GameSnapshot;
  onToggleSensor: (zoneId: string) => void;
  onMount: () => void;
}

export function SupplyOverlay({ state, onToggleSensor, onMount }: SupplyOverlayProps) {
  const selected = state.selSensors.size;
  const sensorZones = state.zones.filter((z) => z.sensorName);
  const timerSec = Math.max(0, Math.ceil(state.supplyLeft));

  return (
    <div className="overlay overlay--hud-gap" role="dialog" aria-labelledby="supply-heading">
      <div className="tag">{t.supply.tag}</div>
      <h1 id="supply-heading" className="overlay__heading--sm">
        {t.supply.heading}
      </h1>
      <div className="small">{t.supply.description}</div>
      <div className="cards">
        {sensorZones.map((z) => {
          const sel = state.selSensors.has(z.id);
          return (
            <button
              key={z.id}
              type="button"
              className={`card${sel ? ' sel' : ''}`}
              aria-pressed={sel}
              onClick={() => onToggleSensor(z.id)}
            >
              <div className="cn">{z.sensorName}</div>
              <div className="cd">{z.sensorDesc}</div>
              <div className="cz">
                {t.supply.zoneLabel} {z.name}
              </div>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="btn"
        disabled={selected !== SENSOR_BUDGET}
        onClick={onMount}
      >
        {t.supply.mountBtn(selected, SENSOR_BUDGET)}
      </button>
      <div className="otimer">{t.supply.autoMount(timerSec)}</div>
    </div>
  );
}

export interface RulesOverlayProps {
  state: GameSnapshot;
  onToggleRule: (ruleId: string) => void;
  onWire: () => void;
}

export function RulesOverlay({ state, onToggleRule, onWire }: RulesOverlayProps) {
  const selected = state.selRules.size;
  const available = state.rules.filter((r) => state.zoneMap[r.zone]?.sensor);
  const timerSec = Math.max(0, Math.ceil(state.rulesLeft));

  return (
    <div className="overlay overlay--hud-gap" role="dialog" aria-labelledby="rules-heading">
      <div className="tag">{t.rules.tag}</div>
      <h1 id="rules-heading" className="overlay__heading--sm">
        {t.rules.heading}
      </h1>
      <div className="small">{t.rules.description}</div>
      <div className="rules-list">
        {available.length === 0 ? (
          <div className="small">{t.rules.noSensors}</div>
        ) : (
          available.map((r) => {
            const sel = state.selRules.has(r.id);
            return (
              <button
                key={r.id}
                type="button"
                className={`rrow${sel ? ' sel' : ''}`}
                aria-pressed={sel}
                onClick={() => onToggleRule(r.id)}
              >
                <div className="rif">
                  {t.rules.ifPrefix} {r.ifTxt}
                </div>
                <div className="rwire" aria-hidden />
                <div className="rthen">
                  {t.rules.thenPrefix} {r.thenTxt}
                </div>
              </button>
            );
          })
        )}
      </div>
      <button type="button" className="btn" onClick={onWire}>
        {t.rules.wireBtn(selected)}
      </button>
      <div className="otimer">{t.rules.autoStart(timerSec)}</div>
    </div>
  );
}

export interface EndOverlayProps {
  state: GameSnapshot;
  onAgain: () => void;
  onOpenShop?: () => void;
}

export function EndOverlay({ state, onAgain, onOpenShop }: EndOverlayProps) {
  const p1 = lossPct(state.stat[1]);
  const p2 = lossPct(state.stat[2]);
  const p3 = lossPct(state.stat[3]);
  const totalTrips = state.tripsOnTime + state.tripsLate;
  const title = p3 < p1 ? t.end.titleWin : t.end.titleFallback;
  const shopReady = state.growth.unlocked;

  return (
    <div className="overlay overlay--hud-gap" role="dialog" aria-labelledby="end-heading">
      <div className="tag">{t.end.tag}</div>
      <h1 id="end-heading" className="overlay__heading--md">
        {title}
      </h1>
      <div className="stats">
        <div className="srow">
          <span>{t.end.act1Label}</span>
          <b className="lose">
            {fmtMoney(state.stat[1].lost)} · {p1}%
          </b>
        </div>
        <div className="srow">
          <span>{t.end.act2Label}</span>
          <b>
            {fmtMoney(state.stat[2].lost)} · {p2}%
          </b>
        </div>
        <div className="srow">
          <span>{t.end.act3Label}</span>
          <b className="win">
            {fmtMoney(state.stat[3].lost)} · {p3}%
          </b>
        </div>
        <div className="srow">
          <span>{t.end.tripsLabel}</span>
          <b>
            {state.tripsOnTime} / {totalTrips}
          </b>
        </div>
        <div className="srow">
          <span>{t.end.preventedLabel}</span>
          <b className="win">
            {state.prevented} · {state.autoActs}
          </b>
        </div>
        <div className="srow">
          <span>{t.end.cashLabel}</span>
          <b>{fmtMoney(state.money)}</b>
        </div>
      </div>
      <div className="small">{t.end.footer}</div>
      <div className="overlay__actions">
        {shopReady && onOpenShop && (
          <button type="button" className="btn" onClick={onOpenShop}>
            {t.end.shopBtn}
          </button>
        )}
        <button type="button" className="btn btn--ghost" onClick={onAgain}>
          {t.end.againBtn}
        </button>
      </div>
    </div>
  );
}

/** Re-export budget for callers wiring sensor selection limits. */
export { SENSOR_BUDGET };
