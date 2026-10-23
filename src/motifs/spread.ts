import { mulberry32 } from '../engine/rng';
import { distribute, makeBar, perspectiveWeights, resolveCount } from './rules';
import type { Bar, MotifFn } from './types';

// M4 Spread (ref 05, 06). 두 축 모두 초점에 가까울수록 좁아지는 원근 격자.
// 셀은 가로 그라데이션, 바깥이 blue · 초점 쪽이 cyan. 캡은 초점보다 위 행은 위, 아래 행은 아래.
export const spread: MotifFn = (p, _frame, b, seed) => {
  if (p.type !== 'spread') return [];
  const rng = mulberry32(seed);
  const cols = resolveCount(p.cols, p.complexity, 4, 20, rng);
  const rows = p.rows ?? Math.max(2, Math.round((cols * b.h) / Math.max(1, b.w)));
  // seed 흔들림: 초점 ±5%, 압축 ±10% (명세 7.5)
  const fx = Math.min(1, Math.max(0, p.focus.x + (rng() - 0.5) * 0.1));
  const fy = Math.min(1, Math.max(0, p.focus.y + (rng() - 0.5) * 0.1));
  const comp = p.compression * (0.9 + rng() * 0.2);

  const xs = distribute(perspectiveWeights(cols, fx, comp), b.x, b.w, p.gap, 0);
  const ys = distribute(perspectiveWeights(rows, fy, comp), b.y, b.h, p.gap, p.gap / 2);
  const focusX = b.x + fx * b.w;
  const focusY = b.y + fy * b.h;

  const bars: Bar[] = [];
  for (const [y, h] of ys) {
    const above = y + h / 2 < focusY;
    for (const [x, w] of xs) {
      const left = x + w / 2 < focusX;
      bars.push(makeBar({ x, y, w, h }, p, 'h', left ? 'start' : 'end', above ? 'top' : 'bottom'));
    }
  }
  return bars;
};
