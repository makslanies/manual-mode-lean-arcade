import type { OverlayContent } from './ru';

/** English stub dictionary — chapter 0 ships with RU as default locale. */
export const en: OverlayContent = {
  title: {
    tag: 'Arcade for people who run production',
    heading: 'MANUAL MODE',
    description:
      'You are the plant director. Machines overheat, presses wait for parts, raw stock runs low, ' +
      'workers tire, cold storage drifts, power spikes, and trips miss deadlines. Click zones and keep up. ' +
      'Spoiler: you will not — and that is the point.',
    startBtn: 'START SHIFT',
  },
  supply: {
    tag: 'Supply pause',
    heading: 'Budget covers 3 sensors',
    description:
      'A sensor does not fix problems for you — it clears fog and warns early. Pick where it hurt most.',
    zoneLabel: 'Zone:',
    mountBtn: (selected, budget) => `MOUNT (${selected}/${budget})`,
    autoMount: (seconds) => `Auto-mount in ${seconds}s`,
  },
  rules: {
    tag: 'Engineering pause',
    heading: 'Wire sensors to actions',
    description:
      'Click a row to run an IF→THEN cable through the logic panel. Rules fire on their own — no director. ' +
      'Only zones with sensors are available.',
    ifPrefix: 'IF',
    thenPrefix: 'THEN',
    wireBtn: (selected) => `START LOGIC (${selected})`,
    noSensors: 'No sensors mounted — logic needs data to build on.',
    autoStart: (seconds) => `Auto-start in ${seconds}s`,
  },
  end: {
    tag: 'Shift complete',
    titleWin: 'Logic paid off',
    titleFallback: 'Chaos is strong — try again',
    act1Label: 'Act 1 · manual — losses',
    act2Label: 'Act 2 · with sensors — losses',
    act3Label: 'Act 3 · with logic — losses',
    tripsLabel: 'On-time trips / total',
    preventedLabel: 'Prevented · automated',
    cashLabel: 'Shift cash',
    footer:
      'That is the ladder: observability → automation. The real platform does the same on a real factory.',
    againBtn: 'PLAY AGAIN',
  },
};
