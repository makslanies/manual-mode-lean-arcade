import type { GameSnapshot, RenderCamera, ZoneState } from '@/core/types';
import { HUB, TH, TW } from '@/core/constants';
import { clamp } from '@/core/math';
import {
  dockDeadlineLeft,
  gaugeFill,
  gaugeRaw,
  zoneProblem,
  zoneVisible,
} from '@/domain/production/flow';
import { truckPos } from '@/domain/production/trucks';
import { PAL, gaugeColor } from '@/render/palette';
import { diamond, drawIsoBox, roundRect, worldToScreen } from '@/render/iso';
import { paintZoneKind } from '@/render/zoneSprites';

function cablePts(cam: RenderCamera, state: GameSnapshot, zoneId: string) {
  const z = state.zoneMap[zoneId]!;
  const a = worldToScreen(cam, z.gx + 0.5, z.gy + 0.5);
  const b = worldToScreen(cam, HUB.gx, HUB.gy);
  const mx = (a.x + b.x) / 2;
  const my = Math.min(a.y, b.y) - 60 * cam.scale;
  return { a, b, mx, my };
}

function qPoint(
  a: { x: number; y: number },
  cx: number,
  cy: number,
  b: { x: number; y: number },
  t: number,
) {
  const mt = 1 - t;
  return {
    x: mt * mt * a.x + 2 * mt * t * cx + t * t * b.x,
    y: mt * mt * a.y + 2 * mt * t * cy + t * t * b.y,
  };
}

export function drawGauge(
  ctx: CanvasRenderingContext2D,
  cam: RenderCamera,
  state: GameSnapshot,
  z: ZoneState,
  s: { x: number; y: number },
): void {
  const v = gaugeRaw(state, z);
  const show = gaugeFill(state, z);
  const bw = 66 * cam.scale;
  const bh = 9 * cam.scale;
  const x = s.x - bw / 2;
  const y = s.y - 86 * cam.scale;
  ctx.fillStyle = 'rgba(10,16,30,.85)';
  roundRect(ctx, x - 5, y - 19 * cam.scale, bw + 10, bh + 25 * cam.scale, 7);
  ctx.fill();
  ctx.fillStyle = PAL.muted;
  ctx.font = `700 ${10 * cam.scale}px system-ui`;
  ctx.textAlign = 'center';
  ctx.fillText(z.gauge, s.x, y - 6 * cam.scale);
  ctx.fillStyle = '#0a101e';
  roundRect(ctx, x, y, bw, bh, 4);
  ctx.fill();
  ctx.fillStyle = gaugeColor(v);
  roundRect(ctx, x, y, bw * clamp(show, 0, 1), bh, 4);
  ctx.fill();
  if (z.sensor) {
    ctx.fillStyle = PAL.cyan;
    ctx.font = `800 ${8.5 * cam.scale}px system-ui`;
    ctx.fillText('СЕНСОР', s.x, y + bh + 10 * cam.scale);
  }
}

export function drawZone(
  ctx: CanvasRenderingContext2D,
  cam: RenderCamera,
  state: GameSnapshot,
  z: ZoneState,
): void {
  if (!z.on) return;
  const s = worldToScreen(cam, z.gx + 0.5, z.gy + 0.5);
  const born = z.unlockAt == null ? 1 : clamp((state.gameT - z.unlockAt) / 0.6, 0, 1);
  const pop = born < 1 ? 1 + Math.sin(born * Math.PI) * 0.18 : 1;
  const vis = zoneVisible(state, z);
  const prob = zoneProblem(state, z);
  const sc = cam.scale * pop;

  diamond(
    ctx,
    s.x,
    s.y,
    TW * 2.2 * sc,
    TH * 2.2 * sc,
    vis ? 'rgba(47,123,246,.10)' : 'rgba(122,134,160,.07)',
  );

  const left = dockDeadlineLeft(state);
  const warn = z.sensor && !prob && (z.kind === 'dock' ? left < 8 && left >= 0 : z.value >= 0.7);
  const showProb = prob && (vis || z.kind !== 'fridge');
  if (showProb || warn) {
    const pulse = 0.5 + 0.5 * Math.sin(state.gameT * 6);
    ctx.globalAlpha = 0.25 + 0.3 * pulse;
    diamond(ctx, s.x, s.y, TW * 2.6 * sc, TH * 2.6 * sc, showProb ? PAL.red : PAL.amber);
    ctx.globalAlpha = 1;
  }

  const F = vis ? null : PAL.fog;
  paintZoneKind(ctx, cam, state, z, s, sc, F, vis);

  if (!vis) {
    ctx.fillStyle = 'rgba(160,170,195,.10)';
    for (let i = 0; i < 5; i++) {
      const nx = (((z.gx * 17 + i * 7) % 10) / 10 - 0.5) * 90 * sc;
      const ny = (((z.gy * 13 + i * 11) % 10) / 10 - 0.5) * 60 * sc;
      ctx.fillRect(s.x + nx, s.y - 20 * sc + ny, 2.5, 2.5);
    }
    ctx.fillStyle = PAL.muted;
    ctx.font = `800 ${22 * cam.scale}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('?', s.x, s.y - 66 * cam.scale + Math.sin(state.gameT * 2 + z.gx) * 3);
  } else {
    drawGauge(ctx, cam, state, z, s);
  }

  if (showProb && prob) {
    const by = s.y - 112 * cam.scale + Math.sin(state.gameT * 7) * 3;
    ctx.fillStyle = PAL.red;
    const bw = (44 + prob.length * 5) * cam.scale;
    roundRect(ctx, s.x - bw / 2, by - 14 * cam.scale, bw, 20 * cam.scale, 10 * cam.scale);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `800 ${11 * cam.scale}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText(`! ${prob}`, s.x, by);
  }

  ctx.fillStyle = 'rgba(220,235,255,.55)';
  ctx.font = `700 ${10.5 * cam.scale}px system-ui`;
  ctx.textAlign = 'center';
  ctx.fillText(z.name, s.x, s.y + 34 * cam.scale);
}

export function drawTrucks(
  ctx: CanvasRenderingContext2D,
  cam: RenderCamera,
  state: GameSnapshot,
): void {
  const dock = state.zoneMap.dock!;
  if (!dock.on) return;
  for (const tr of state.trucks) {
    const p = truckPos(tr);
    const s = worldToScreen(cam, p.gx, p.gy);
    drawIsoBox(ctx, s.x, s.y, 30, 16, 14, '#c6d6ef', '#93a7c8', '#7488a8', cam.scale);
    drawIsoBox(ctx, s.x + 12 * cam.scale, s.y + 3 * cam.scale, 12, 14, 10, PAL.azure, '#2456b8', '#1c449a', cam.scale);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + 7 * cam.scale, 20 * cam.scale, 6 * cam.scale, 0, 0, 7);
    ctx.fill();
    if (tr.phase === 'ready') {
      const left = tr.deadline - state.gameT;
      const c = left < 6 ? PAL.red : left < 10 ? PAL.amber : PAL.good;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(s.x, s.y - 24 * cam.scale + Math.sin(state.gameT * 6) * 2, 5 * cam.scale, 0, 7);
      ctx.fill();
      if (dock.sensor || zoneVisible(state, dock)) {
        ctx.fillStyle = 'rgba(10,16,30,.85)';
        roundRect(ctx, s.x - 24 * cam.scale, s.y - 62 * cam.scale, 48 * cam.scale, 15 * cam.scale, 6);
        ctx.fill();
        ctx.fillStyle = c;
        ctx.font = `800 ${10 * cam.scale}px system-ui`;
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.max(0, Math.ceil(left))} с`, s.x, s.y - 51 * cam.scale);
      }
    }
  }
}

export function drawLogic(
  ctx: CanvasRenderingContext2D,
  cam: RenderCamera,
  state: GameSnapshot,
): void {
  if (state.mode !== 'play3') return;
  const h = worldToScreen(cam, HUB.gx, HUB.gy);
  drawIsoBox(ctx, h.x, h.y, 40, 34, 40, '#1e3c6e', '#16294d', '#122241', cam.scale);
  ctx.strokeStyle = PAL.cyan;
  ctx.lineWidth = 2 * cam.scale;
  ctx.strokeRect(h.x - 9 * cam.scale, h.y - 34 * cam.scale, 18 * cam.scale, 14 * cam.scale);
  ctx.fillStyle = PAL.cyan;
  ctx.font = `800 ${9.5 * cam.scale}px system-ui`;
  ctx.textAlign = 'center';
  ctx.fillText('ЩИТ ЛОГИКИ', h.x, h.y + 30 * cam.scale);
  const pulseG = 0.5 + 0.5 * Math.sin(state.gameT * 3);
  ctx.globalAlpha = 0.2 + 0.25 * pulseG;
  diamond(ctx, h.x, h.y, TW * 1.8 * cam.scale, TH * 1.8 * cam.scale, PAL.cyan);
  ctx.globalAlpha = 1;

  for (const r of state.rules) {
    if (!r.active || !state.zoneMap[r.zone]?.on) continue;
    const { a, b, mx, my } = cablePts(cam, state, r.zone);
    ctx.strokeStyle = 'rgba(53,214,232,.5)';
    ctx.lineWidth = 2.4 * cam.scale;
    ctx.setLineDash([8, 7]);
    ctx.lineDashOffset = -state.gameT * 30;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y - 20 * cam.scale);
    ctx.quadraticCurveTo(mx, my, b.x, b.y - 20 * cam.scale);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const pl of state.pulses) {
    const { a, b, mx, my } = cablePts(cam, state, pl.zone);
    const q = qPoint(
      { x: b.x, y: b.y - 20 * cam.scale },
      mx,
      my,
      { x: a.x, y: a.y - 20 * cam.scale },
      clamp(pl.t, 0, 1),
    );
    ctx.fillStyle = PAL.cyan;
    ctx.beginPath();
    ctx.arc(q.x, q.y, 6 * cam.scale, 0, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(53,214,232,.35)';
    ctx.beginPath();
    ctx.arc(q.x, q.y, 11 * cam.scale, 0, 7);
    ctx.fill();
  }
}

export function drawDirector(
  ctx: CanvasRenderingContext2D,
  cam: RenderCamera,
  state: GameSnapshot,
): void {
  const dir = state.director;
  const s = worldToScreen(cam, dir.gx, dir.gy);
  const bob = Math.abs(Math.sin(dir.step)) * (dir.fixing ? 2 : 4) * cam.scale;
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(s.x, s.y + 4 * cam.scale, 13 * cam.scale, 5 * cam.scale, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#22335c';
  roundRect(ctx, s.x - 7 * cam.scale, s.y - 26 * cam.scale - bob, 14 * cam.scale, 20 * cam.scale, 5 * cam.scale);
  ctx.fill();
  ctx.fillStyle = '#e8c9a0';
  ctx.beginPath();
  ctx.arc(s.x, s.y - 32 * cam.scale - bob, 7 * cam.scale, 0, 7);
  ctx.fill();
  ctx.fillStyle = PAL.gold;
  ctx.beginPath();
  ctx.arc(s.x, s.y - 36 * cam.scale - bob, 7.4 * cam.scale, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(s.x - 9 * cam.scale, s.y - 37 * cam.scale - bob, 18 * cam.scale, 2.5 * cam.scale);
  if (dir.fixing) {
    const f = dir.fixing;
    const p = clamp(f.t / f.act.dur, 0, 1);
    ctx.strokeStyle = 'rgba(220,235,255,.25)';
    ctx.lineWidth = 5 * cam.scale;
    ctx.beginPath();
    ctx.arc(s.x, s.y - 58 * cam.scale, 16 * cam.scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = PAL.cyan;
    ctx.beginPath();
    ctx.arc(s.x, s.y - 58 * cam.scale, 16 * cam.scale, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PAL.ice;
    ctx.font = `800 ${11 * cam.scale}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText(f.act.label, s.x, s.y - 84 * cam.scale);
  }
}
