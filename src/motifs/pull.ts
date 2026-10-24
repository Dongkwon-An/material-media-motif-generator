import { clamp01, easeOutCubic } from '../engine/easing';
import { mulberry32 } from '../engine/rng';
import { distribute, makeBar, resolveCount, uniform } from './rules';
import type { Bar, MotifFn, MotifParams, Rect } from './types';

// M2 Pull (ref 03). 아래로 갈수록 커지는 서랍.
//  - top (03a): 바 높이가 커지고 위 캡도 두꺼워진다. 세로 그라데이션, 아래 blue → 위 cyan.
//  - side (03b): 바 너비가 늘어나는 계단형. 가로 그라데이션, 정렬 반대쪽(안쪽)이 blue. 위 캡.
export const pull: MotifFn = (p, _frame, b, seed) => {
  if (p.type !== 'pull') return [];
  const rng = mulberry32(seed);
  const n = resolveCount(p.count, p.complexity, 4, 16, rng);
  const grow = (i: number) => (p.curve === 'exp' ? Math.pow(1 + p.growth, i) : 1 + p.growth * i);
  const last = grow(n - 1);

  if (p.view === 'top') {
    const rows = distribute(Array.from({ length: n }, (_, i) => grow(i)), b.y, b.h, p.gap, p.gap / 2);
    return rows.map(([y, h], i) =>
      makeBar({ x: b.x, y, w: b.w, h }, p, 'v', 'end', 'top', 0.6 + 0.8 * (i / Math.max(1, n - 1))),
    );
  }

  const rows = distribute(uniform(n), b.y, b.h, p.gap, p.gap / 2);
  const minFrac = 0.3; // ref 03b: 가장 짧은 바 ≈ 전체 너비의 30%
  return rows.map(([y, h], i) => {
    const w = b.w * (minFrac + (1 - minFrac) * ((grow(i) - 1) / Math.max(1e-6, last - 1)));
    const x = p.align === 'right' ? b.x + b.w - w : b.x;
    return makeBar({ x, y, w, h }, p, 'h', p.align === 'right' ? 'start' : 'end', 'top');
  });
};

/** Top 스트림: 화면 높이만큼 스크롤하면 정적 Top 레이아웃(n개)이 꼭 채워진다 */
const STREAM_FILL = 1;

/**
 * Explore · Pull · top: 위에서 내려다본 서랍이 스크롤에 따라 위에서부터 하나씩 열리며 내려온다.
 * 스크롤 0 이하면 빈 화면. 새 서랍은 맨 위에서 높이 0부터 열리며 기존 서랍들을 아래로 밀고,
 * 밀려 내려간 서랍은 나이(태어난 뒤 지난 서랍 수)에 따라 growth 규칙대로 커진다.
 * 스크롤이 화면 높이와 같아지면 정적 top 레이아웃과 같고, 더 내리면 계속 커지며 아래로 빠져나간다.
 */
export function pullTopStream(p: Extract<MotifParams, { type: 'pull' }>, b: Rect, seed: number, scrollY: number): Bar[] {
  const rng = mulberry32(seed);
  const n = resolveCount(p.count, p.complexity, 4, 16, rng);
  const grow = (x: number) => (p.curve === 'exp' ? Math.pow(1 + p.growth, x) : 1 + p.growth * x);
  const edge = p.gap / 2;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += grow(i);
  const base = Math.max(0, b.h - 2 * edge - p.gap * (n - 1)) / sum;

  /** 지금까지 태어난 서랍 수 (연속값) */
  const born = (scrollY / (b.h * STREAM_FILL)) * n;
  if (born <= 0 || base <= 0) return [];

  const bars: Bar[] = [];
  let y = b.y + edge;
  // 맨 위가 가장 어린 서랍. 화면 아래로 빠져나가면 멈춘다
  for (let k = Math.floor(born); k >= 0 && y < b.y + b.h; k--) {
    const age = born - k;
    const h = age < 1 ? base * grow(0) * easeOutCubic(age) : base * grow(age - 1);
    if (h > 0) {
      const capScale = 0.6 + 0.8 * clamp01((age - 1) / Math.max(1, n - 1));
      bars.push(makeBar({ x: b.x, y, w: b.w, h }, p, 'v', 'end', 'top', capScale));
    }
    y += h + p.gap * Math.min(1, age);
  }
  return bars;
}
