const normKey = (k: string) => (k.length === 1 ? k.toLowerCase() : k);

export class InputManager {
  readonly keys: Record<string, boolean> = {};

  attach(): () => void {
    const down = (e: KeyboardEvent) => {
      this.keys[normKey(e.key)] = true;
      if (e.key === 'm' || e.key === 'M') {
        this.onMute?.();
      }
    };
    const up = (e: KeyboardEvent) => {
      this.keys[normKey(e.key)] = false;
    };
    const clear = () => {
      for (const k in this.keys) this.keys[k] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', clear);
    };
  }

  onMute?: () => void;
}
