import { useCallback, useEffect, useState, type RefObject } from 'react';
import type { GameMode, GameSnapshot } from '@/core/types';
import { HintPill } from './HintPill';
import { HelpButton, HelpOverlay } from './HelpOverlay';
import { ShopOverlay } from './shop/ShopOverlay';
import {
  EndOverlay,
  RulesOverlay,
  SupplyOverlay,
  TitleOverlay,
} from './Overlays';
import './overlay.css';
import './shop/shop.css';

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
  onOpenShop?: () => void;
  onCloseShop?: () => void;
  onPurchase?: (itemId: string) => void;
  onAssignHire?: (employeeId: string, zoneId: string) => void;
  onShopPanel?: (panel: 'shop' | 'hire' | 'org' | null) => void;
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
  onOpenShop,
  onCloseShop,
  onPurchase,
  onAssignHire,
  onShopPanel,
}: GameShellProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const closeHelp = useCallback(() => setHelpOpen(false), []);
  const openHelp = useCallback(() => setHelpOpen(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '?' && e.key !== '/') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      setHelpOpen((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const overlayOpen = OVERLAY_MODES.has(state.mode);
  const shopOpen = state.growth.ui.shopOpen;
  const blockCanvas = shopOpen || helpOpen || state.mode === 'title';

  return (
    <div className="game-shell">
      <canvas
        ref={canvasRef}
        className="game-shell__canvas"
        style={{ pointerEvents: blockCanvas ? 'none' : 'auto' }}
        aria-hidden={overlayOpen || shopOpen || helpOpen}
      />
      <HintPill text={hintText} visible={hintVisible && !helpOpen} />
      <HelpButton onClick={openHelp} />
      {state.mode === 'title' && <TitleOverlay onStart={onStart} />}
      {state.mode === 'supply' && (
        <SupplyOverlay state={state} onToggleSensor={onToggleSensor} onMount={onMount} />
      )}
      {state.mode === 'rules' && (
        <RulesOverlay state={state} onToggleRule={onToggleRule} onWire={onWire} />
      )}
      {state.mode === 'end' && (
        <EndOverlay state={state} onAgain={onAgain} onOpenShop={onOpenShop} />
      )}
      {shopOpen && onCloseShop && onPurchase && onAssignHire && onShopPanel && (
        <ShopOverlay
          state={state}
          onClose={onCloseShop}
          onPurchase={onPurchase}
          onAssign={onAssignHire}
          onPanel={onShopPanel}
        />
      )}
      <HelpOverlay open={helpOpen} onClose={closeHelp} />
    </div>
  );
}
