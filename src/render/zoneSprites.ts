import type { GameSnapshot, RenderCamera, ZoneState } from '@/core/types';
import { TRIP_STOCK } from '@/core/constants';
import { clamp } from '@/core/math';
import { zoneProducing } from '@/domain/production/flow';
import { PAL } from '@/render/palette';
import { drawIsoBox, roundRect } from '@/render/iso';

export function paintZoneKind(
  ctx: CanvasRenderingContext2D,
  cam: RenderCamera,
  state: GameSnapshot,
  z: ZoneState,
  s: { x: number; y: number },
  sc: number,
  F: string | null,
  vis: boolean,
): void {
  switch (z.kind) {
    case 'machine':
      drawIsoBox(ctx, s.x, s.y, 74, 60, 46, F || '#41598a', F ? PAL.fogDark : '#2c3f68', F ? '#242b3e' : '#1f2f52', sc);
      drawIsoBox(ctx, s.x + 16 * sc, s.y - 30 * sc, 16, 16, 26, F || '#55719f', F ? PAL.fogDark : '#3b4f78', F ? '#242b3e' : '#2c3d61', sc);
      if (vis && !z.failed) {
        const g = 0.15 + z.value * 0.85;
        ctx.fillStyle = `rgba(255,${Math.round(176 - 120 * z.value)},60,${0.25 + 0.55 * g})`;
        ctx.beginPath();
        ctx.arc(s.x - 8 * sc, s.y - 24 * sc, 7 * sc, 0, 7);
        ctx.fill();
      }
      break;
    case 'press':
      drawIsoBox(ctx, s.x, s.y, 60, 54, 30, F || '#3f568c', F ? PAL.fogDark : '#2b3d66', F ? '#242b3e' : '#20304f', sc);
      drawIsoBox(
        ctx, s.x, s.y - 30 * sc, 26, 26,
        26 + Math.sin(state.gameT * 4) * (zoneProducing(state, z) ? 5 : 0),
        F || '#5a76a8', F ? PAL.fogDark : '#41577f', F ? '#242b3e' : '#324565', sc,
      );
      break;
    case 'hopper':
      drawIsoBox(ctx, s.x, s.y, 54, 54, 66, F || '#3d5484', F ? PAL.fogDark : '#293c63', F ? '#242b3e' : '#1e2e50', sc);
      if (vis) {
        const lvl = 1 - z.value;
        ctx.fillStyle = PAL.cyan;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(s.x - 12 * sc, s.y - (18 + 34 * lvl) * sc, 6 * sc, 34 * lvl * sc);
        ctx.globalAlpha = 1;
      }
      break;
    case 'worker':
      drawIsoBox(ctx, s.x, s.y, 66, 40, 22, F || '#3a4f7d', F ? PAL.fogDark : '#27395e', F ? '#242b3e' : '#1d2c4c', sc);
      ctx.fillStyle = F || '#e8c9a0';
      ctx.beginPath();
      ctx.arc(s.x - 6 * sc, s.y - 34 * sc, 7 * sc, 0, 7);
      ctx.fill();
      ctx.fillStyle = F || PAL.azure;
      roundRect(ctx, s.x - 13 * sc, s.y - 28 * sc, 14 * sc, 14 * sc, 4 * sc);
      ctx.fill();
      break;
    case 'fridge':
      drawIsoBox(ctx, s.x, s.y, 78, 62, 52, F || '#9fb6d8', F ? PAL.fogDark : '#6d84ab', F ? '#242b3e' : '#54688c', sc);
      if (vis) {
        const spoil = clamp((z.value - 0.55) / 0.45, 0, 1);
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = `rgb(${Math.round(80 + 140 * spoil)},${Math.round(200 - 120 * spoil)},${Math.round(110 - 60 * spoil)})`;
          roundRect(ctx, s.x - 20 * sc + i * 14 * sc, s.y - 12 * sc + i * 4 * sc, 11 * sc, 9 * sc, 2 * sc);
          ctx.fill();
        }
      }
      break;
    case 'power':
      drawIsoBox(ctx, s.x, s.y, 50, 44, 58, F || (state.powerOut ? '#5a3440' : '#44598e'), F ? PAL.fogDark : '#2e4069', F ? '#242b3e' : '#223252', sc);
      ctx.fillStyle = state.powerOut ? PAL.red : F ? PAL.fog : PAL.gold;
      ctx.beginPath();
      ctx.moveTo(s.x - 2 * sc, s.y - 52 * sc);
      ctx.lineTo(s.x + 8 * sc, s.y - 52 * sc);
      ctx.lineTo(s.x + 1 * sc, s.y - 38 * sc);
      ctx.lineTo(s.x + 7 * sc, s.y - 38 * sc);
      ctx.lineTo(s.x - 6 * sc, s.y - 20 * sc);
      ctx.lineTo(s.x - 1 * sc, s.y - 34 * sc);
      ctx.lineTo(s.x - 7 * sc, s.y - 34 * sc);
      ctx.closePath();
      ctx.fill();
      break;
    case 'dock':
      drawIsoBox(ctx, s.x, s.y, 88, 56, 18, F || '#3c527f', F ? PAL.fogDark : '#293a5e', F ? '#242b3e' : '#1f2e4d', sc);
      for (let i = 0; i < Math.min(4, Math.floor(state.stock / TRIP_STOCK) + 1); i++) {
        drawIsoBox(ctx, s.x - 22 * sc + i * 13 * sc, s.y - 18 * sc + (i % 2) * 5 * sc, 11, 11, 10, F || '#c9a15e', F ? PAL.fogDark : '#8f7241', F ? '#242b3e' : '#6e5730', sc);
      }
      if (vis) {
        ctx.fillStyle = 'rgba(10,16,30,.85)';
        roundRect(ctx, s.x - 40 * cam.scale, s.y + 6 * cam.scale, 80 * cam.scale, 16 * cam.scale, 6);
        ctx.fill();
        ctx.fillStyle = state.stock >= TRIP_STOCK ? PAL.good : PAL.amber;
        ctx.font = `800 ${10 * cam.scale}px system-ui`;
        ctx.textAlign = 'center';
        ctx.fillText(`ГРУЗ: ${Math.floor(state.stock)}/${TRIP_STOCK}`, s.x, s.y + 17 * cam.scale);
      }
      break;
  }
}
