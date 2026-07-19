import type { GameSnapshot } from '@/core/types';
import { RULE_BUDGET, SENSOR_BUDGET } from '@/core/constants';
import { createInitialState, resetRun } from '@/domain/GameState';
import { mountSensors, wireRules } from '@/domain/phases';
import { simulateGameplay } from '@/domain/simulation';
import { truckPos } from '@/domain/production/trucks';
import { AudioEngine } from '@/audio/AudioEngine';
import { InputManager } from '@/core/Input';
import { GameRenderer } from '@/render/GameRenderer';
import { worldToScreen } from '@/render/iso';
import { hitShopIcon } from '@/render/drawHUD';
import { saveRunResult } from '@/persistence/db';
import { saveGrowthState, loadGrowthState } from '@/persistence/orgDb';
import { purchaseItem } from '@/domain/shop/ShopController';
import { assignEmployee, unlockGrowth } from '@/domain/org/OrgController';
import { installRR } from '@/__RR';

export class GameController {
  readonly state: GameSnapshot;
  readonly audio = new AudioEngine();
  readonly input = new InputManager();
  private renderer: GameRenderer | null = null;
  private last = performance.now();
  private raf = 0;
  private watchdog = 0;
  private idleFrames = 0;
  hintText = '';
  hintVisible = false;
  private hintTimer = 0;
  private onChange?: () => void;

  constructor(seed?: number) {
    this.state = createInitialState(seed);
    this.input.onMute = () => this.audio.toggleMute();
    void loadGrowthState(this.state).then(() => this.emit());
  }

  bindCanvas(canvas: HTMLCanvasElement, onChange: () => void): () => void {
    this.onChange = onChange;
    this.renderer = new GameRenderer(canvas);
    this.renderer.resize();
    if (import.meta.env.VITE_ENABLE_DEMO_HOOKS !== 'false') {
      installRR(this);
    }

    const resize = () => this.renderer?.resize();
    window.addEventListener('resize', resize);

    const pointerDown = (e: PointerEvent) => this.handlePointer(e);
    canvas.addEventListener('pointerdown', pointerDown);

    const detachInput = this.input.attach();
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.frame(t));
    this.watchdog = window.setInterval(() => {
      const now = performance.now();
      if (now - this.last > 300) this.tick(now);
    }, 250);

    return () => {
      cancelAnimationFrame(this.raf);
      clearInterval(this.watchdog);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', pointerDown);
      detachInput();
    };
  }

  private emit(): void {
    this.onChange?.();
  }

  showHint(txt: string, dur = 3200): void {
    this.hintText = txt;
    this.hintVisible = true;
    window.clearTimeout(this.hintTimer);
    this.hintTimer = window.setTimeout(() => {
      this.hintVisible = false;
      this.emit();
    }, dur);
    this.emit();
  }

  startShift(): void {
    this.audio.init();
    resetRun(this.state);
    this.state.mode = 'play';
    this.idleFrames = 0;
    this.renderer?.resize();
    this.showHint('Кликай по зонам — успевай везде!');
    this.emit();
  }

  playAgain(): void {
    resetRun(this.state);
    this.state.mode = 'play';
    this.idleFrames = 0;
    this.renderer?.resize();
    this.emit();
  }

  toggleSensor(zoneId: string): void {
    const sel = this.state.selSensors;
    if (sel.has(zoneId)) sel.delete(zoneId);
    else if (sel.size < SENSOR_BUDGET) sel.add(zoneId);
    this.audio.card();
    this.emit();
  }

  mountSelected(): void {
    mountSensors(this.state);
    this.showHint('Смотри: беды теперь видны заранее!');
    this.audio.unlock();
    this.emit();
  }

  toggleRule(ruleId: string): void {
    const sel = this.state.selRules;
    if (sel.has(ruleId)) sel.delete(ruleId);
    else if (sel.size < RULE_BUDGET) sel.add(ruleId);
    this.audio.wire();
    this.emit();
  }

  wireSelected(): void {
    wireRules(this.state);
    this.showHint('Завод играет сам — смотри!');
    this.audio.unlock();
    this.emit();
  }

  private handlePointer(e: PointerEvent): void {
    if (this.state.growth.ui.shopOpen) return;
    const cam = this.renderer!.getCamera();
    const sx = e.clientX;
    const sy = e.clientY;
    if (
      this.state.growth.unlocked &&
      hitShopIcon(cam.w, sx, sy)
    ) {
      this.openShop();
      return;
    }
    const mode = this.state.mode;
    if (mode !== 'play' && mode !== 'play2' && mode !== 'play3') return;
    this.audio.init();
    let picked = null;
    let best = 1e9;
    for (const z of this.state.zones) {
      if (!z.on) continue;
      const s = worldToScreen(cam, z.gx, z.gy);
      const dd = Math.hypot(sx - s.x, sy - (s.y - 34 * cam.scale));
      if (dd < 80 * cam.scale && dd < best) {
        best = dd;
        picked = z;
      }
    }
    if (!picked && this.state.zoneMap.dock!.on) {
      for (const tr of this.state.trucks) {
        const tp = truckPos(tr);
        const ts = worldToScreen(cam, tp.gx, tp.gy);
        if (Math.hypot(sx - ts.x, sy - ts.y) < 46 * cam.scale) {
          picked = this.state.zoneMap.dock!;
          break;
        }
      }
    }
    const dir = this.state.director;
    if (picked && dir.fixing?.zone === picked) return;
    dir.fixing = null;
    if (picked) {
      dir.targetZone = picked;
      dir.tx = picked.gx + 1.35;
      dir.ty = picked.gy + 1.35;
    } else {
      dir.targetZone = null;
    }
    this.state.commandJournal.push(`click:${picked?.id ?? 'floor'}@${this.state.gameT.toFixed(2)}`);
  }

  private frame(now: number): void {
    this.raf = requestAnimationFrame((t) => this.frame(t));
    this.tick(now);
  }

  private tick(now: number): void {
    let dtReal = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    const mode = this.state.mode;

    if (mode === 'title') {
      if (this.idleFrames++ <= 4) this.renderer?.render(this.state, dtReal);
      return;
    }

    // Keep top HUD (money + shop bag) live under the hud-gap overlays.
    if (mode === 'end') {
      this.renderer?.render(this.state, dtReal);
      this.emit();
      return;
    }

    if (mode === 'supply') {
      this.state.supplyLeft -= dtReal;
      if (this.state.supplyLeft <= 0) this.mountSelected();
      this.renderer?.render(this.state, dtReal);
      this.emit();
      return;
    }

    if (mode === 'rules') {
      this.state.rulesLeft -= dtReal;
      if (this.state.rulesLeft <= 0) this.wireSelected();
      this.renderer?.render(this.state, dtReal);
      this.emit();
      return;
    }

    this.idleFrames = 0;
    let dt = dtReal;
    if (this.state.hitstop > 0) {
      this.state.hitstop -= dtReal;
      dt = dtReal * 0.12;
    }

    const cam = this.renderer!.getCamera();
    simulateGameplay(this.state, dt, {
      keys: this.input.keys,
      screenPos: (gx, gy) => worldToScreen(cam, gx, gy),
      scale: cam.scale,
      hudCenter: { x: cam.w / 2, y: 34 },
      onHint: (t) => this.showHint(t),
      audio: this.audio,
    });

    if (mode !== this.state.mode) {
      if (this.state.mode === 'supply' && this.state.growth.unlocked) {
        this.showHint('Магазин открыт — синяя иконка сумки в поле кассы');
      }
      if (this.state.mode === 'end') {
        void saveRunResult(this.state);
        void saveGrowthState(this.state);
      }
    }

    this.renderer?.render(this.state, dtReal);
    this.emit();
  }

  /** Demo / UI helper: unlock growth layer and refresh React. */
  unlockShop(): void {
    unlockGrowth(this.state);
    void saveGrowthState(this.state);
    this.emit();
  }

  openShop(): void {
    if (!this.state.growth.unlocked) {
      this.unlockShop();
    }
    this.state.growth.ui.shopOpen = true;
    this.state.growth.ui.panel = this.state.growth.ui.panel ?? null;
    this.emit();
  }

  closeShop(): void {
    this.state.growth.ui.shopOpen = false;
    this.state.growth.ui.panel = null;
    this.state.growth.ui.hireItemId = null;
    void saveGrowthState(this.state);
    this.emit();
  }

  purchaseShopItem(itemId: string): void {
    const result = purchaseItem(this.state, itemId);
    if (!result.ok) {
      this.showHint(`Покупка недоступна: ${result.error ?? 'error'}`);
    }
    this.emit();
  }

  assignHire(employeeId: string, zoneId: string): void {
    assignEmployee(this.state, employeeId, zoneId);
    this.state.growth.ui.panel = null;
    this.state.growth.ui.hireItemId = null;
    void saveGrowthState(this.state);
    this.emit();
  }

  setShopPanel(panel: 'shop' | 'hire' | 'org' | null): void {
    this.state.growth.ui.panel = panel;
    this.emit();
  }
}
