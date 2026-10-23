import { mulberry32 } from '../engine/rng';
import { distribute, makeBar, resolveCount, uniform } from './rules';
import type { Bar, MotifFn } from './types';

// M1 Stack (ref 02): 동일 크기 가로 바를 일정 간격으로 적층. splits만큼 좌우 열로 나눈다.
// 세로 그라데이션, 아래 blue → 위 cyan. 캡 기본 없음(켜면 위).
export const stack: MotifFn = (p, _frame, b, seed) => {
  if (p.type !== 'stack') return [];
  const rng = mulberry32(seed);
  const rows = resolveCount(p.count, p.complexity, 4, 20, rng);
  const pitch = b.h / rows;
  const gap = Math.min(p.gap, pitch * 0.6);
  const cols = distribute(uniform(Math.max(1, Math.round(p.splits))), b.x, b.w, gap, 0);

  const bars: Bar[] = [];
  for (let r = 0; r < rows; r++) {
    for (const [x, w] of cols) {
      bars.push(makeBar({ x, y: b.y + r * pitch + gap / 2, w, h: pitch - gap }, p, 'v', 'end', 'top'));
    }
  }
  return bars;
};
