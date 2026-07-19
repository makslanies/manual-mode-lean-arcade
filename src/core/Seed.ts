/** Mulberry32 seeded PRNG for deterministic simulation (AC-07). */
export class SeedRng {
  state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: T[]): T {
    return items[Math.floor(this.next() * items.length)]!;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  clone(): SeedRng {
    const r = new SeedRng(0);
    r.state = this.state;
    return r;
  }
}
