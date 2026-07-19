import type { GameSnapshot, RenderCamera } from '@/core/types';
import { ZONES_ORDERED } from '@/domain/production/zones';
import { drawDashboard, drawHUD, drawParticles, drawQuip } from '@/render/drawHUD';
import { drawDirector, drawLogic, drawTrucks, drawZone } from '@/render/drawZones';
import { drawStaff } from '@/render/drawStaff';
import { drawFloor, fitCamera } from '@/render/iso';
import { PAL } from '@/render/palette';

export class GameRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private cam: RenderCamera;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.canvas = canvas;
    this.ctx = ctx;
    this.cam = { scale: 1, x: 0, y: 0, w: 0, h: 0, dpr: 1 };
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    const fit = fitCamera(w, h);
    this.cam = { ...fit, w, h, dpr };
  }

  getCamera(): RenderCamera {
    return this.cam;
  }

  render(state: GameSnapshot, dtReal: number): void {
    const { ctx, cam } = this;
    ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
    ctx.fillStyle = PAL.bg;
    ctx.fillRect(0, 0, cam.w, cam.h);

    if (state.shake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * state.shake,
        (Math.random() - 0.5) * state.shake,
      );
    }

    drawFloor(ctx, cam);
    drawLogic(ctx, cam, state);

    const dir = state.director;
    let dirDrawn = false;
    for (const def of ZONES_ORDERED) {
      const z = state.zoneMap[def.id];
      if (!z) continue;
      if (!dirDrawn && dir.gx + dir.gy < z.gx + z.gy) {
        drawDirector(ctx, cam, state);
        dirDrawn = true;
      }
      drawZone(ctx, cam, state, z);
    }
    if (!dirDrawn) drawDirector(ctx, cam, state);

    drawStaff(ctx, cam, state);
    drawTrucks(ctx, cam, state);

    if (state.powerOut) {
      ctx.fillStyle = `rgba(255,90,78,${0.05 + 0.04 * Math.sin(state.gameT * 8)})`;
      ctx.fillRect(0, 0, cam.w, cam.h);
    }

    drawParticles(ctx, cam, state);
    drawHUD(ctx, cam, state, dtReal);
    drawDashboard(ctx, cam, state);
    drawQuip(ctx, cam, state);
  }
}
