export const PAL = {
  bg: '#0e1526',
  tileA: '#15223c',
  tileB: '#131e35',
  road: '#0d1220',
  roadLine: '#31405f',
  azure: '#2f7bf6',
  deep: '#1b4fd8',
  ice: '#dcebff',
  cyan: '#35d6e8',
  red: '#ff5a4e',
  amber: '#ffb020',
  good: '#39d98a',
  muted: '#7e8db0',
  fog: '#3a445c',
  fogDark: '#2b3348',
  gold: '#ffd24a',
};

export function gaugeColor(v: number): string {
  if (v < 0.5) return PAL.good;
  if (v < 0.75) return PAL.amber;
  return PAL.red;
}
