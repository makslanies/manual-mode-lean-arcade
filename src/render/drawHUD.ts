import type { GameSnapshot, RenderCamera } from '@/core/types';
import { DASH_SHORT, TRIP_STOCK } from '@/core/constants';
import { actLength } from '@/core/FSM';
import { clamp, fmtMoney, fmtTime } from '@/core/math';
import {
  gaugeFill,
  gaugeRaw,
  problemCount,
  zoneProblem,
} from '@/domain/production/flow';
import { PAL, gaugeColor } from '@/render/palette';
import { roundRect } from '@/render/iso';

/** Canvas money pill geometry — keep in sync with hit-testing. */
export const MONEY_PILL = { w: 260, h: 46, top: 12 } as const;

export function moneyPillRect(camW: number): { x: number; y: number; w: number; h: number } {
  return {
    x: camW / 2 - MONEY_PILL.w / 2,
    y: MONEY_PILL.top,
    w: MONEY_PILL.w,
    h: MONEY_PILL.h,
  };
}

export function shopIconRect(camW: number): { x: number; y: number; w: number; h: number } {
  const pill = moneyPillRect(camW);
  return { x: pill.x + 10, y: pill.y + 7, w: 32, h: 32 };
}

export function hitShopIcon(camW: number, sx: number, sy: number): boolean {
  const r = shopIconRect(camW);
  return sx >= r.x && sx <= r.x + r.w && sy >= r.y && sy <= r.y + r.h;
}

function drawShopBagIcon(ctx: CanvasRenderingContext2D, camW: number, badge: number): void {
  const r = shopIconRect(camW);
  const g = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
  g.addColorStop(0, '#2f7bf6');
  g.addColorStop(1, '#1b4fd8');
  ctx.fillStyle = g;
  roundRect(ctx, r.x, r.y, r.w, r.h, 10);
  ctx.fill();

  // Simple bag silhouette
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2 + 1;
  ctx.moveTo(cx - 7, cy - 2);
  ctx.lineTo(cx - 8, cy + 8);
  ctx.lineTo(cx + 8, cy + 8);
  ctx.lineTo(cx + 7, cy - 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(cx, cy - 4, 4.5, Math.PI, 0);
  ctx.stroke();

  if (badge > 0) {
    ctx.fillStyle = PAL.amber;
    ctx.beginPath();
    ctx.arc(r.x + r.w - 2, r.y + 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1200';
    ctx.font = '800 10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(String(Math.min(badge, 9)), r.x + r.w - 2, r.y + 5);
  }
}

export function drawHUD(
  ctx: CanvasRenderingContext2D,
  cam: RenderCamera,
  state: GameSnapshot,
  dtReal: number,
): void {
  const pc = problemCount(state);
  state.moneyPulse = Math.max(0, state.moneyPulse - dtReal * 3);
  const msz = 26 + state.moneyPulse * 6;
  const { w: W, h: H } = cam;
  const shopOn = state.growth.unlocked && !state.growth.ui.shopOpen;
  const moneyPadL = shopOn ? 36 : 0;
  const pill = moneyPillRect(W);

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(10,16,30,.8)';
  roundRect(ctx, pill.x, pill.y, pill.w, pill.h, 14);
  ctx.fill();
  if (shopOn) {
    drawShopBagIcon(ctx, W, state.org.escalations.length);
  }
  ctx.fillStyle = state.comboMult > 1 ? PAL.gold : PAL.ice;
  ctx.font = `800 ${msz}px system-ui`;
  ctx.textAlign = 'center';
  ctx.fillText(fmtMoney(state.money), W / 2 + moneyPadL / 2, 45);
  if (state.comboMult > 1) {
    ctx.fillStyle = PAL.gold;
    ctx.font = '800 13px system-ui';
    ctx.fillText(`СЕРИЯ ×${state.comboMult.toFixed(1)}`, W / 2, 70);
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(10,16,30,.8)';
  roundRect(ctx, 16, 12, 210, 40, 12);
  ctx.fill();
  ctx.fillStyle = PAL.muted;
  ctx.font = '700 12px system-ui';
  const phaseName =
    state.mode === 'play3'
      ? 'СМЕНА · С ЛОГИКОЙ'
      : state.mode === 'play2'
        ? 'СМЕНА · С ДАТЧИКАМИ'
        : 'СМЕНА · ВРУЧНУЮ';
  ctx.fillText(phaseName, 28, 28);
  ctx.fillStyle = PAL.ice;
  ctx.font = '800 17px system-ui';
  ctx.fillText(fmtTime(actLength(state.mode) - state.phaseT), 28, 46);

  ctx.textAlign = 'right';
  const rw = Math.min(270, W * 0.34);
  ctx.fillStyle = 'rgba(10,16,30,.8)';
  roundRect(ctx, W - 16 - rw, 12, rw, 40, 12);
  ctx.fill();
  ctx.fillStyle = PAL.muted;
  ctx.font = '700 12px system-ui';
  ctx.fillText('АВАРИЙ · РЕЙСОВ ВОВРЕМЯ', W - 28, 28);
  ctx.fillStyle = state.accidents ? PAL.red : PAL.good;
  ctx.font = '800 17px system-ui';
  ctx.fillText(
    `${state.accidents}  ·  ${state.tripsOnTime}/${state.tripsOnTime + state.tripsLate}`,
    W - 28,
    46,
  );

  const jit = pc ? Math.sin(state.gameT * 40) * pc * 1.4 : 0;
  ctx.save();
  ctx.translate(40, H - 56);
  ctx.rotate(jit * 0.03);
  ctx.fillStyle = '#1a2745';
  roundRect(ctx, -14, -24, 28, 48, 8);
  ctx.fill();
  ctx.fillStyle = pc ? PAL.red : '#2c3d61';
  roundRect(ctx, -10, -19, 20, 32, 4);
  ctx.fill();
  ctx.restore();
  if (pc) {
    ctx.fillStyle = PAL.red;
    ctx.beginPath();
    ctx.arc(58, H - 76, 10, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '800 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(String(pc), 58, H - 72);
  }
}

export function drawDashboard(
  ctx: CanvasRenderingContext2D,
  _cam: RenderCamera,
  state: GameSnapshot,
): void {
  const rows = state.zones.filter((z) => z.on);
  if (!rows.length) return;

  const x = 16;
  const y = 64;
  const w = 216;
  const rh = 19;
  const h = 38 + (rows.length + 2) * rh;

  ctx.fillStyle = 'rgba(10,16,30,.72)';
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(220,235,255,.07)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = PAL.muted;
  ctx.font = '800 10px system-ui';
  ctx.fillText('ДИСПЕТЧЕРСКАЯ', x + 12, y + 18);

  const blind = !state.zones.some((z) => z.sensor);
  if (blind && Math.sin(state.gameT * 3) > 0) {
    ctx.fillStyle = PAL.red;
    ctx.textAlign = 'right';
    ctx.fillText('СЛЕПАЯ ЗОНА', x + w - 12, y + 18);
    ctx.textAlign = 'left';
  }

  let ry = y + 28;
  for (const z of rows) {
    ctx.fillStyle = PAL.muted;
    ctx.font = '700 10px system-ui';
    ctx.fillText(DASH_SHORT[z.id] || z.id, x + 12, ry + 12);
    if (z.sensor) {
      const prob = zoneProblem(state, z);
      const v = gaugeRaw(state, z);
      const fill = gaugeFill(state, z);
      ctx.fillStyle = '#0a101e';
      roundRect(ctx, x + 72, ry + 3, 64, 8, 4);
      ctx.fill();
      ctx.fillStyle = prob ? PAL.red : gaugeColor(v);
      roundRect(ctx, x + 72, ry + 3, 64 * clamp(fill, 0.03, 1), 8, 4);
      ctx.fill();
      const rule = state.rules.find((r) => r.zone === z.id && r.active);
      if (rule && state.mode === 'play3') {
        const flash = state.gameT - (rule.lastFire || -9) < 0.6;
        ctx.fillStyle = flash ? PAL.ice : PAL.cyan;
        ctx.font = '800 8.5px system-ui';
        ctx.fillText('АВТО', x + 144, ry + 11);
      }
      if (prob) {
        ctx.fillStyle = PAL.red;
        ctx.font = '800 10px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText('!', x + w - 12, ry + 12);
        ctx.textAlign = 'left';
      }
    } else {
      ctx.fillStyle = 'rgba(126,141,176,.5)';
      ctx.font = '700 9px system-ui';
      ctx.fillText('НЕТ ДАННЫХ', x + 72, ry + 12);
    }
    ry += rh;
  }

  ctx.fillStyle = PAL.muted;
  ctx.font = '700 10px system-ui';
  ctx.fillText('ГРУЗ', x + 12, ry + 12);
  ctx.fillStyle = state.stock >= TRIP_STOCK ? PAL.good : PAL.amber;
  ctx.font = '800 10px system-ui';
  ctx.fillText(`${Math.floor(state.stock)} / ${TRIP_STOCK}`, x + 72, ry + 12);
  ry += rh;

  ctx.fillStyle = PAL.muted;
  ctx.font = '700 10px system-ui';
  ctx.fillText('РЕЙСЫ', x + 12, ry + 12);
  ctx.fillStyle = PAL.ice;
  ctx.font = '800 10px system-ui';
  ctx.fillText(
    `${state.tripsOnTime} / ${state.tripsOnTime + state.tripsLate}`,
    x + 72,
    ry + 12,
  );
}

export function drawQuip(
  ctx: CanvasRenderingContext2D,
  cam: RenderCamera,
  state: GameSnapshot,
): void {
  if (!state.quipCur) return;
  const a = clamp(Math.min(state.quipCur.t * 4, (3.2 - state.quipCur.t) * 3), 0, 1);
  const { w: W, h: H } = cam;
  ctx.globalAlpha = a;
  ctx.font = '700 13px system-ui';
  ctx.textAlign = 'left';
  const tw = Math.max(ctx.measureText(state.quipCur.txt).width, 90) + 28;
  const bx = 26;
  const bh = 52;
  const by = H - 148;
  const bw = Math.min(tw, W * 0.6);
  ctx.fillStyle = 'rgba(20,31,54,.95)';
  roundRect(ctx, bx, by, bw, bh, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(53,214,232,.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx + 18, by + bh);
  ctx.lineTo(bx + 32, by + bh);
  ctx.lineTo(bx + 16, by + bh + 13);
  ctx.closePath();
  ctx.fillStyle = 'rgba(20,31,54,.95)';
  ctx.fill();
  ctx.fillStyle = PAL.cyan;
  ctx.font = '800 10px system-ui';
  ctx.fillText(state.quipCur.who, bx + 14, by + 18);
  ctx.fillStyle = PAL.ice;
  ctx.font = '700 13px system-ui';
  ctx.fillText(state.quipCur.txt, bx + 14, by + 38);
  ctx.globalAlpha = 1;
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  _cam: RenderCamera,
  state: GameSnapshot,
): void {
  if (state.parts.length > 800) state.parts.splice(0, state.parts.length - 800);
  for (const p of state.parts) {
    if (p.t === 'coin') {
      if ((p.p ?? 0) < 0) continue;
      ctx.fillStyle = PAL.gold;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, 7);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.beginPath();
      ctx.arc(p.x - 1.5, p.y - 1.5, 1.6, 0, 7);
      ctx.fill();
      continue;
    }
    ctx.globalAlpha = clamp(p.life, 0, 1);
    if (p.t === 'zzz') {
      ctx.fillStyle = p.color;
      ctx.font = `800 ${p.size}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText('z', p.x, p.y);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  for (const f of state.floats) {
    ctx.globalAlpha = clamp(f.life, 0, 1);
    ctx.fillStyle = f.color;
    ctx.font = `800 ${f.size}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText(f.txt, f.x, f.y);
    ctx.globalAlpha = 1;
  }
}
