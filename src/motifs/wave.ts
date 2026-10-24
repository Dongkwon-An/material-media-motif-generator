import { mod } from '../engine/easing';
import { mulberry32 } from '../engine/rng';
import { distribute, makeBar, resolveCount, uniform } from './rules';
import type { Bar, Frame, MotifFn, MotifParams, Rect } from './types';

// M3 Wave (ref 04). 바를 한 축으로 나열하고 오프셋이 파형을 따른다.
//  vertical: 세로 바, 위 blue → 아래 cyan, 캡 아래. sine에서 내려간 구간은 반전(캡 위) — 04d N자.
//  horizontal: 가로 바, 오른쪽으로 나간 바는 오른쪽 blue·캡 왼쪽, 왼쪽으로 나간 바는 반대 — 04e Z자.
// 위상 = phase + time × phaseSpeed. flat 외의 shape는 위상에 따라 숨 쉬듯 움직인다.
export const wave: MotifFn = (p, frame, b, seed) => waveBars(p, frame, b, seed);

/**
 * @param panX vertical일 때 좌우 스크롤(px). 바를 끝없는 한 줄로 보고 화면을 옆으로 옮긴다.
 *  파형은 줄 전체에서의 바 번호로 계산하므로 frequency가 정수가 아니어도 끊기지 않는다.
 */
export function waveBars(p: MotifParams, frame: Frame, b: Rect, seed: number, panX = 0): Bar[] {
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
    // arc는 화면 폭(n개)마다 같은 호를 반복
    const u = n > 1 ? (2 * mod(i, n)) / (n - 1) - 1 : 0;
    switch (p.shape) {
      case 'flat':
        return 0;
      case 'alternate':
        return (mod(i + parity, 2) ? 1 : -1) * A * Math.cos(phase);
      case 'arc':
        return A * (1 - 2 * (1 - u * u)) * Math.cos(phase);
      case 'sine':
        return -A * Math.sin(2 * Math.PI * p.frequency * (i / n) + phase + phaseStart);
    }
  };

  const slots = distribute(uniform(n), vertical ? b.x : b.y, vertical ? b.w : b.h, p.gap, p.gap / 2);
  const len = Math.max(0, along - 2 * A - p.gap);
  const base = (vertical ? b.y : b.x) + p.gap / 2 + A;

  // y가 위로 간(음수 오프셋) 바가 정방향
  const column = (x: number, w: number, o: number) => {
    const flipped = p.shape === 'sine' && o > 0;
    return makeBar({ x, y: base + o, w, h: len }, p, 'v', flipped ? 'end' : 'start', flipped ? 'top' : 'bottom');
  };

  if (vertical && panX !== 0 && slots.length > 0) {
    // 바 i는 x = slots[0] + i·pitch. 화면 [panX, panX + w]에 걸치는 번호만 그린다
    const size = slots[0][1];
    const pitch = size + p.gap;
    if (pitch <= 0) return [];
    const x0 = slots[0][0];
    const first = Math.floor((panX - x0 - size) / pitch) + 1;
    const last = Math.floor((panX + b.w - x0) / pitch);
    const bars: Bar[] = [];
    for (let i = first; i <= last; i++) bars.push(column(x0 + i * pitch - panX, size, offset(i)));
    return bars;
  }

  return slots.map(([s, size], i) => {
    const o = offset(i);
    if (vertical) return column(s, size, o);
    const right = o <= 0; // 가로: 음수 오프셋을 오른쪽 이동으로 쓴다 (sine 부호 일치)
    return makeBar({ x: base - o, y: s, w: len, h: size }, p, 'h', right ? 'end' : 'start', right ? 'left' : 'right');
  });
}
