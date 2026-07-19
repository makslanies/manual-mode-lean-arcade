import type { GameSnapshot, RenderCamera } from '@/core/types';
import type { Employee } from '@/domain/org/types';
import { FIXING_BUBBLE, SLEEP_BUBBLE, YELL_BUBBLE } from '@/domain/org/staffWork';
import { isManagerRole } from '@/domain/org/Employee';
import { clamp } from '@/core/math';
import { PAL } from '@/render/palette';
import { roundRect, worldToScreen } from '@/render/iso';

const SLOT_OFFSETS = [
  { gx: 1.75, gy: 0.35 },
  { gx: 0.25, gy: 1.85 },
  { gx: 1.95, gy: 1.55 },
  { gx: 0.55, gy: 0.15 },
  { gx: 2.15, gy: 0.95 },
] as const;

const ROLE_COLOR: Record<string, string> = {
  operator: '#3d8bfd',
  assembler: '#39d98a',
  mechanic: '#ffb020',
  material_handler: '#a3e635',
  forklift_driver: '#35d6e8',
  foreman: '#c084fc',
  shift_lead: '#f472b6',
};

function roleShort(roleId: string): string {
  switch (roleId) {
    case 'operator':
      return 'ОП';
    case 'assembler':
      return 'СБ';
    case 'mechanic':
      return 'МЕХ';
    case 'material_handler':
      return 'СНБ';
    case 'forklift_driver':
      return 'ПГР';
    case 'foreman':
      return 'БРИГ';
    case 'shift_lead':
      return 'МАСТ';
    default:
      return 'РАБ';
  }
}

function slotsForZone(state: GameSnapshot, zoneId: string): Employee[] {
  return state.org.employees.filter((e) => e.zoneId === zoneId);
}

export function drawStaff(
  ctx: CanvasRenderingContext2D,
  cam: RenderCamera,
  state: GameSnapshot,
): void {
  if (!state.growth.unlocked || !state.org.employees.length) return;

  for (const z of state.zones) {
    if (!z.on) continue;
    const crew = slotsForZone(state, z.id);
    if (!crew.length) continue;

    crew.forEach((emp, i) => {
      const off = SLOT_OFFSETS[i % SLOT_OFFSETS.length]!;
      drawWorker(ctx, cam, state, emp, z.gx + off.gx, z.gy + off.gy, i);
    });
  }

  const idle = state.org.employees.filter((e) => !e.zoneId);
  idle.forEach((emp, i) => {
    const gx = 10.2 + (i % 3) * 0.55;
    const gy = 10.5 + Math.floor(i / 3) * 0.55;
    drawWorker(ctx, cam, state, emp, gx, gy, i, true);
  });
}

function drawWorker(
  ctx: CanvasRenderingContext2D,
  cam: RenderCamera,
  state: GameSnapshot,
  emp: Employee,
  gx: number,
  gy: number,
  idx: number,
  waiting = false,
): void {
  const s = worldToScreen(cam, gx, gy);
  const sc = cam.scale;
  const acting = emp.actionT > 0;
  const sleeping = emp.status === 'sleeping';
  const bob = sleeping
    ? Math.abs(Math.sin(state.gameT * 1.6 + idx)) * 0.8 * sc
    : Math.abs(Math.sin(state.gameT * (acting ? 9 : emp.status === 'working' ? 7 : 3) + idx)) *
      (acting ? 4 : emp.status === 'working' ? 3.2 : 1.4) *
      sc;
  const body = sleeping ? '#5a6578' : (ROLE_COLOR[emp.roleId] ?? '#7e8db0');
  const manager = isManagerRole(emp.roleId);

  ctx.fillStyle = 'rgba(0,0,0,.32)';
  ctx.beginPath();
  ctx.ellipse(s.x, s.y + 3 * sc, 9 * sc, 3.5 * sc, 0, 0, 7);
  ctx.fill();

  ctx.fillStyle = body;
  roundRect(ctx, s.x - 5 * sc, s.y - 18 * sc - bob, 10 * sc, 14 * sc, 3.5 * sc);
  ctx.fill();

  ctx.fillStyle = '#e8c9a0';
  ctx.beginPath();
  ctx.arc(s.x, s.y - 22 * sc - bob, 4.5 * sc, 0, 7);
  ctx.fill();

  if (manager) {
    ctx.fillStyle = PAL.gold;
    ctx.beginPath();
    ctx.moveTo(s.x - 6 * sc, s.y - 25 * sc - bob);
    ctx.lineTo(s.x + 6 * sc, s.y - 25 * sc - bob);
    ctx.lineTo(s.x + 4 * sc, s.y - 28 * sc - bob);
    ctx.lineTo(s.x - 4 * sc, s.y - 28 * sc - bob);
    ctx.closePath();
    ctx.fill();
  }

  const label = waiting
    ? `${roleShort(emp.roleId)} · ждёт`
    : sleeping
      ? `${roleShort(emp.roleId)} · спит`
      : roleShort(emp.roleId);
  ctx.fillStyle = 'rgba(10,16,30,.78)';
  const tw = Math.max(28, label.length * 6.2) * sc;
  roundRect(ctx, s.x - tw / 2, s.y - 42 * sc - bob, tw, 12 * sc, 4 * sc);
  ctx.fill();
  ctx.fillStyle = PAL.ice;
  ctx.font = `800 ${9 * sc}px system-ui`;
  ctx.textAlign = 'center';
  ctx.fillText(label, s.x, s.y - 33 * sc - bob);

  if (acting && emp.actionDur > 0 && !sleeping) {
    const p = clamp(emp.actionT / emp.actionDur, 0, 1);
    ctx.strokeStyle = 'rgba(220,235,255,.22)';
    ctx.lineWidth = 3.5 * sc;
    ctx.beginPath();
    ctx.arc(s.x, s.y - 56 * sc - bob, 11 * sc, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = PAL.amber;
    ctx.beginPath();
    ctx.arc(s.x, s.y - 56 * sc - bob, 11 * sc, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
    ctx.stroke();
  }

  const showBubble =
    emp.bubble &&
    (emp.bubbleUntil === Number.POSITIVE_INFINITY || state.gameT < emp.bubbleUntil);
  if (showBubble && emp.bubble && !waiting) {
    const kind =
      emp.bubble === SLEEP_BUBBLE
        ? 'sleep'
        : emp.bubble === YELL_BUBBLE
          ? 'yell'
          : emp.bubble === FIXING_BUBBLE
            ? 'fix'
            : 'ok';
    drawSpeechBubble(
      ctx,
      s.x,
      s.y - (acting || sleeping || emp.bubble === YELL_BUBBLE ? 72 : 58) * sc - bob,
      emp.bubble,
      sc,
      kind,
    );
  }
}

function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  sc: number,
  kind: 'fix' | 'ok' | 'sleep' | 'yell',
): void {
  ctx.font = `800 ${11 * sc}px system-ui`;
  const padX = 8 * sc;
  const padY = 5 * sc;
  const tw = ctx.measureText(text).width;
  const bw = tw + padX * 2;
  const bh = 16 * sc + padY;
  const bx = x - bw / 2;
  const by = y - bh;

  const fill =
    kind === 'fix'
      ? 'rgba(255,176,32,.95)'
      : kind === 'sleep'
        ? 'rgba(126,141,176,.95)'
        : kind === 'yell'
          ? 'rgba(255,90,78,.95)'
          : 'rgba(57,217,138,.95)';
  const ink =
    kind === 'fix' || kind === 'yell' ? '#1a1200' : kind === 'sleep' ? '#0e1526' : '#062016';

  ctx.fillStyle = fill;
  roundRect(ctx, bx, by, bw, bh, 6 * sc);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x - 4 * sc, by + bh);
  ctx.lineTo(x + 4 * sc, by + bh);
  ctx.lineTo(x, by + bh + 6 * sc);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, by + bh - 6 * sc);
}
