import { useEffect, useRef, useState } from 'react';
import { createInitialState } from '@/domain/GameState';
import { GameController } from '@/game/GameController';
import { GameShell } from '@/ui/GameShell';
import '@/ui/overlay.css';

/** Boot snapshot so the shell (and canvas node) never remounts when the controller attaches. */
const BOOT_STATE = createInitialState();

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctrl, setCtrl] = useState<GameController | null>(null);
  const [, bump] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new GameController();
    const detach = game.bindCanvas(canvas, () => bump((n) => n + 1));
    setCtrl(game);
    return () => {
      detach();
      setCtrl(null);
    };
  }, []);

  const state = ctrl?.state ?? BOOT_STATE;

  return (
    <GameShell
      canvasRef={canvasRef}
      state={state}
      hintText={ctrl?.hintText ?? ''}
      hintVisible={ctrl?.hintVisible ?? false}
      onStart={() => ctrl?.startShift()}
      onToggleSensor={(id) => ctrl?.toggleSensor(id)}
      onMount={() => ctrl?.mountSelected()}
      onToggleRule={(id) => ctrl?.toggleRule(id)}
      onWire={() => ctrl?.wireSelected()}
      onAgain={() => ctrl?.playAgain()}
    />
  );
}
