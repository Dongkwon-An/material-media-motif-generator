import { mulberry32 } from '../engine/rng';
import { distribute, makeBar, resolveCount, uniform } from './rules';
import type { MotifFn } from './types';

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
