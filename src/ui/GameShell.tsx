import type { RefObject } from 'react';
import type { GameMode, GameSnapshot } from '@/core/types';
import { HintPill } from './HintPill';
import {
  EndOverlay,
  RulesOverlay,
  SupplyOverlay,
  TitleOverlay,
} from './Overlays';
import './overlay.css';

const OVERLAY_MODES: ReadonlySet<GameMode> = new Set(['title', 'supply', 'rules', 'end']);

export interface GameShellProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  state: GameSnapshot;
  hintText: string;
  hintVisible: boolean;
  onStart: () => void;
  onToggleSensor: (zoneId: string) => void;
  onMount: () => void;
  onToggleRule: (ruleId: string) => void;
  onWire: () => void;
  onAgain: () => void;
}

export function GameShell({
  canvasRef,
  state,
  hintText,
  hintVisible,
  onStart,
  onToggleSensor,
  onMount,
  onToggleRule,
  onWire,
  onAgain,
}: GameShellProps) {
  const overlayOpen = OVERLAY_MODES.has(state.mode);

  return (
    <div className="game-shell">
      <canvas
        ref={canvasRef}
        className="game-shell__canvas"
        style={{ pointerEvents: overlayOpen ? 'none' : 'auto' }}
        aria-hidden={overlayOpen}
      />
      <HintPill text={hintText} visible={hintVisible} />
      {state.mode === 'title' && <TitleOverlay onStart={onStart} />}
      {state.mode === 'supply' && (
        <SupplyOverlay state={state} onToggleSensor={onToggleSensor} onMount={onMount} />
      )}
      {state.mode === 'rules' && (
        <RulesOverlay state={state} onToggleRule={onToggleRule} onWire={onWire} />
      )}
      {state.mode === 'end' && <EndOverlay state={state} onAgain={onAgain} />}
    </div>
  );
}
