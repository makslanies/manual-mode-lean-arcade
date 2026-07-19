import { GRID, TH, TW } from '@/core/constants';
import type { RenderCamera } from '@/core/types';

export function isoPt(gx: number, gy: number): { x: number; y: number } {
  return { x: ((gx - gy) * TW) / 2, y: ((gx + gy) * TH) / 2 };
}

export function fitCamera(w: number, h: number): Pick<RenderCamera, 'scale' | 'x' | 'y'> {
  const scale = Math.max(0.45, Math.min(1.1, Math.min(w / 1400, (h - 70) / 900)));
  const c = isoPt(GRID / 2, GRID / 2);
  return { scale, x: w / 2 - c.x * scale, y: h * 0.52 - c.y * scale };
}

export function worldToScreen(cam: RenderCamera, gx: number, gy: number): { x: number; y: number } {
  const p = isoPt(gx, gy);
  return { x: cam.x + p.x * cam.scale, y: cam.y + p.y * cam.scale };
}

export function screenToGrid(cam: RenderCamera, sx: number, sy: number): { gx: number; gy: number } {
  const x = (sx - cam.x) / cam.scale;
  const y = (sy - cam.y) / cam.scale;
  return {
    gx: (x / (TW / 2) + y / (TH / 2)) / 2,
    gy: y / (TH / 2) - x / (TW / 2),
  };
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function diamond(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  w: number,
  h: number,
  fill: string,
): void {
  ctx.beginPath();
  ctx.moveTo(sx, sy - h / 2);
  ctx.lineTo(sx + w / 2, sy);
  ctx.lineTo(sx, sy + h / 2);
  ctx.lineTo(sx - w / 2, sy);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export function drawIsoBox(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  w: number,
  d: number,
  h: number,
  top: string,
  left: string,
  right: string,
  scale: number,
): void {
  const w2 = (w * scale) / 2;
  const d2 = (d * scale) / 2;
  const hh = h * scale;
  const wy = (w2 * TH) / TW;
  const dy = (d2 * TH) / TW;
  ctx.beginPath();
  ctx.moveTo(sx, sy - hh);
  ctx.lineTo(sx + w2, sy - hh + wy);
  ctx.lineTo(sx + w2 - d2, sy - hh + wy + dy);
  ctx.lineTo(sx - d2, sy - hh + dy);
  ctx.closePath();
  ctx.fillStyle = top;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sx - d2, sy - hh + dy);
  ctx.lineTo(sx + w2 - d2, sy - hh + wy + dy);
  ctx.lineTo(sx + w2 - d2, sy + wy + dy);
  ctx.lineTo(sx - d2, sy + dy);
  ctx.closePath();
  ctx.fillStyle = left;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sx + w2 - d2, sy - hh + wy + dy);
  ctx.lineTo(sx + w2, sy - hh + wy);
  ctx.lineTo(sx + w2, sy + wy);
  ctx.lineTo(sx + w2 - d2, sy + wy + dy);
  ctx.closePath();
  ctx.fillStyle = right;
  ctx.fill();
}

function isRoadTile(gx: number, gy: number): boolean {
  return (
    (gx >= 14 && gx <= 16 && gy >= 1 && gy <= 16) ||
    (gy >= 8 && gy <= 9 && gx >= 12 && gx <= 16)
  );
}

export function drawFloor(ctx: CanvasRenderingContext2D, cam: RenderCamera): void {
  for (let gx = 0; gx < GRID; gx++) {
    for (let gy = 0; gy < GRID; gy++) {
      const s = worldToScreen(cam, gx + 0.5, gy + 0.5);
      const road = isRoadTile(gx, gy);
      diamond(ctx, s.x, s.y, TW * cam.scale, TH * cam.scale, road ? '#0d1220' : (gx + gy) % 2 ? '#15223c' : '#131e35');
      if (road && gx === 15 && gy % 2 === 0) {
        diamond(ctx, s.x, s.y, 10 * cam.scale, 5 * cam.scale, '#31405f');
      }
    }
  }
  const g = worldToScreen(cam, 15.5, 1.6);
  drawIsoBox(ctx, g.x - 26 * cam.scale, g.y, 10, 10, 34, '#33456e', '#243356', '#1c2947', cam.scale);
  drawIsoBox(ctx, g.x + 26 * cam.scale, g.y, 10, 10, 34, '#33456e', '#243356', '#1c2947', cam.scale);
  ctx.fillStyle = '#2f7bf6';
  ctx.fillRect(g.x - 30 * cam.scale, g.y - 40 * cam.scale, 60 * cam.scale, 5 * cam.scale);
}
