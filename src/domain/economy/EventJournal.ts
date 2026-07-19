import type { GameSnapshot } from '@/core/types';
import type { GameEvent } from '@/domain/org/types';

let eventCounter = 0;

function parseEventSeq(id: string): number {
  const m = /^evt_(\d+)$/.exec(id);
  return m ? Number(m[1]) : 0;
}

/** Keep the module counter ahead of any restored / in-memory event ids. */
export function syncEventCounter(events: readonly GameEvent[]): void {
  let max = eventCounter;
  for (const e of events) {
    const n = parseEventSeq(e.id);
    if (n > max) max = n;
  }
  eventCounter = max;
}

export function logEvent(
  state: GameSnapshot,
  type: string,
  message: string,
  payload?: Record<string, unknown>,
): GameEvent {
  syncEventCounter(state.events);
  const evt: GameEvent = {
    id: `evt_${++eventCounter}`,
    gameTime: state.gameT,
    type,
    message,
    payload,
  };
  state.events.push(evt);
  if (state.events.length > 200) {
    state.events.splice(0, state.events.length - 200);
  }
  return evt;
}

export function resetEventCounter(n = 0): void {
  eventCounter = n;
}

export function recentEvents(state: GameSnapshot, limit = 20): GameEvent[] {
  return state.events.slice(-limit);
}
