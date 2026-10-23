import { describe, expect, it } from 'vitest';
import { MOTIFS, MOTIF_ORDER, defaultMotif } from '../../src/motifs';
import type { Bar, MotifParams, Rect } from '../../src/motifs/types';

const B: Rect = { x: 0, y: 0, w: 1200, h: 800 };
const F = { progress: 1, time: 3.7 };
const EPS = 1e-6;

const run = (p: MotifParams, seed = 42, frame = F) => MOTIFS[p.type](p, frame, B, seed);
const within = (b: Bar) =>
  b.x >= B.x - EPS && b.y >= B.y - EPS && b.x + b.w <= B.x + B.w + EPS && b.y + b.h <= B.y + B.h + EPS;

const variants: MotifParams[] = [
  ...MOTIF_ORDER.map((t) => defaultMotif(t)),
  { ...defaultMotif('stack'), splits: 1 } as MotifParams,
  { ...defaultMotif('pull'), view: 'top' } as MotifParams,
  { ...defaultMotif('pull'), align: 'left', curve: 'exp' } as MotifParams,
  ...(['flat', 'alternate', 'arc'] as const).map((shape) => ({ ...defaultMotif('wave'), shape }) as MotifParams),
  { ...defaultMotif('wave'), orientation: 'horizontal' } as MotifParams,
  { ...defaultMotif('spread'), focus: { x: 0, y: 1 } } as MotifParams,
  { ...defaultMotif('portal'), axis: 'rows', splits: 4, flow: 'out' } as MotifParams,
  { ...defaultMotif('portal'), vanish: { x: 0.2, y: 0.5 } } as MotifParams,
];

describe.each(variants.map((p) => [`${p.type} ${JSON.stringify(p).slice(0, 60)}`, p] as const))('%s', (_, p) => {
  it('바를 하나 이상 만들고 모든 바가 bounds 안, w·h ≥ 0', () => {
    const bars = run(p);
    expect(bars.length).toBeGreaterThan(0);
    for (const b of bars) {
      expect(b.w).toBeGreaterThanOrEqual(0);
      expect(b.h).toBeGreaterThanOrEqual(0);
      expect(within(b)).toBe(true);
    }
  });

  it('같은 seed + 같은 설정 → 같은 결과', () => {
    expect(run(p, 7)).toEqual(run(p, 7));
  });

  it('Complexity가 높을수록 바가 같거나 많다', () => {
    const lo = run({ ...p, complexity: 0 }).length;
    const hi = run({ ...p, complexity: 100 }).length;
    expect(hi).toBeGreaterThanOrEqual(lo);
  });
});

describe('3.4 기준표', () => {
  it('Stack: 세로, 아래 blue, 기본 캡 없음, splits=2면 좌우 2열', () => {
    const bars = run(defaultMotif('stack'));
    for (const b of bars) {
      expect(b.gradient).toMatchObject({ axis: 'v', blueAt: 'end' });
      expect(b.cap).toBeUndefined();
    }
    const xs = new Set(bars.map((b) => b.x));
    expect(xs.size).toBe(2);
  });

  it('Stack은 화면 전체 너비를 채운다', () => {
    const bars = run({ ...defaultMotif('stack'), splits: 1 } as MotifParams);
    for (const b of bars) {
      expect(b.x).toBe(0);
      expect(b.w).toBe(B.w);
    }
  });

  it('Spread: 바깥이 blue (초점 왼쪽 셀은 blueAt start), 위 행은 위 캡', () => {
    const p = { ...defaultMotif('spread'), focus: { x: 0.5, y: 0.5 } } as MotifParams;
    const bars = run(p);
    const leftTop = bars.find((b) => b.x === 0 && b.y < 100)!;
    expect(leftTop.gradient.blueAt).toBe('start');
    expect(leftTop.cap?.side).toBe('top');
    const rightBottom = bars.reduce((a, b) => (b.x + b.y > a.x + a.y ? b : a));
    expect(rightBottom.gradient.blueAt).toBe('end');
    expect(rightBottom.cap?.side).toBe('bottom');
  });

  it('Portal: 소실점 쪽이 blue, 캡 없음, 바깥 끝 full-bleed', () => {
    const bars = run(defaultMotif('portal'));
    for (const b of bars) {
      expect(b.cap).toBeUndefined();
      const after = b.x + b.w / 2 > B.w / 2;
      expect(b.gradient.blueAt).toBe(after ? 'start' : 'end');
    }
    expect(Math.min(...bars.map((b) => b.x))).toBeCloseTo(0);
    expect(Math.max(...bars.map((b) => b.x + b.w))).toBeCloseTo(B.w);
  });

  it('Wave sine 세로: 내려간 구간은 반전되고 캡이 위로 간다', () => {
    const bars = run(defaultMotif('wave'));
    const sides = new Set(bars.map((b) => `${b.gradient.blueAt}/${b.cap?.side}`));
    expect(sides).toEqual(new Set(['start/bottom', 'end/top']));
  });

  it('Portal 흐름: time이 바뀌면 줄 배치가 바뀐다 (무한 줌)', () => {
    const p = defaultMotif('portal');
    expect(run(p, 1, { progress: 1, time: 0 })).not.toEqual(run(p, 1, { progress: 1, time: 1.3 }));
  });
});
