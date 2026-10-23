import { mulberry32 } from '../engine/rng';
import { distribute, makeBar, resolveCount, uniform } from './rules';
import type { MotifFn } from './types';

// M3 Wave (ref 04). 바를 한 축으로 나열하고 오프셋이 파형을 따른다.
//  vertical: 세로 바, 위 blue → 아래 cyan, 캡 아래. sine에서 내려간 구간은 반전(캡 위) — 04d N자.
//  horizontal: 가로 바, 오른쪽으로 나간 바는 오른쪽 blue·캡 왼쪽, 왼쪽으로 나간 바는 반대 — 04e Z자.
// 위상 = phase + time × phaseSpeed. flat 외의 shape는 위상에 따라 숨 쉬듯 움직인다.
export const wave: MotifFn = (p, frame, b, seed) => {
  if (p.type !== 'wave') return [];
  const rng = mulberry32(seed);
  const n = resolveCount(p.count, p.complexity, 6, 40, rng);
  // seed 위상 흔들림은 ±0.3rad로 제한 — 프리셋이 레퍼런스의 파형 시작점을 유지하도록
  const phaseStart = (rng() - 0.5) * 0.6;
  const parity = rng() < 0.5 ? 0 : 1;
  const phase = p.phase + frame.time * p.phaseSpeed;
  const vertical = p.orientation === 'vertical';
  const along = vertical ? b.h : b.w;
  const A = p.amplitude * along;

  const offset = (i: number) => {
    const u = n > 1 ? (2 * i) / (n - 1) - 1 : 0;
    switch (p.shape) {
      case 'flat':
        return 0;
      case 'alternate':
        return ((i + parity) % 2 ? 1 : -1) * A * Math.cos(phase);
      case 'arc':
        return A * (1 - 2 * (1 - u * u)) * Math.cos(phase);
      case 'sine':
        return -A * Math.sin(2 * Math.PI * p.frequency * (i / n) + phase + phaseStart);
    }
  };

  const slots = distribute(uniform(n), vertical ? b.x : b.y, vertical ? b.w : b.h, p.gap, p.gap / 2);
  const len = Math.max(0, along - 2 * A - p.gap);
  const base = (vertical ? b.y : b.x) + p.gap / 2 + A;

  return slots.map(([s, size], i) => {
    const o = offset(i);
    if (vertical) {
      // y가 위로 간(음수 오프셋) 바가 정방향
      const flipped = p.shape === 'sine' && o > 0;
      return makeBar({ x: s, y: base + o, w: size, h: len }, p, 'v', flipped ? 'end' : 'start', flipped ? 'top' : 'bottom');
    }
    const right = o <= 0; // 가로: 음수 오프셋을 오른쪽 이동으로 쓴다 (sine 부호 일치)
    return makeBar({ x: base - o, y: s, w: len, h: size }, p, 'h', right ? 'end' : 'start', right ? 'left' : 'right');
  });
};
