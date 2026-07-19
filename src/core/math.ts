export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function fmtMoney(v: number): string {
  return `${Math.round(v).toLocaleString('ru-RU')} ₽`;
}

export function fmtTime(s: number): string {
  const sec = Math.max(0, Math.ceil(s));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export function lossPct(stat: { earned: number; lost: number }): number {
  return Math.round((100 * stat.lost) / Math.max(1, stat.lost + stat.earned));
}
