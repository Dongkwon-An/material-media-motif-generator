import { mod } from '../engine/easing';
import { mulberry32 } from '../engine/rng';
import { distribute, makeBar, resolveCount, uniform } from './rules';
import type { Bar, MotifFn } from './types';

// M5 Portal (ref 07, 08). 한 축만 원근이 걸린 full-bleed 줄무늬. 캡 없음.
// 그라데이션은 소실점 쪽이 blue, 바깥이 cyan (M4와 반대).
// 무한 줌: 줄 경계 s_k = S·((k + φ)/m)^e. φ가 0→1로 흐르면 줄이 바깥으로 밀려나고 소실점에서 새 줄이 생긴다.

/** 소실점에서 한쪽 끝까지 길이 S 구간의 줄 [소실점으로부터 시작, 끝] 목록 */
function sideStripes(S: number, m: number, e: number, phi: number): [number, number][] {
  const edges = [0];
  for (let k = 0; ; k++) {
    const s = S * Math.pow((k + phi) / m, e);
    if (s >= S) break;
    if (s > 0) edges.push(s);
  }
  edges.push(S);
  const out: [number, number][] = [];
  for (let i = 0; i < edges.length - 1; i++) out.push([edges[i], edges[i + 1]]);
  return out;
}

export const portal: MotifFn = (p, frame, b, seed) => {
  if (p.type !== 'portal') return [];
  const rng = mulberry32(seed);
  const count = resolveCount(p.count, p.complexity, 6, 30, rng);
  const e = 1 + p.compression * 2.5;
  const phi = mod(frame.time * p.flowSpeed * (p.flow === 'out' ? 1 : -1), 1);
  const cols = p.axis === 'cols';

  const L = cols ? b.w : b.h;
  const origin = cols ? b.x : b.y;
  const v = Math.min(1, Math.max(0, cols ? p.vanish.x : p.vanish.y)) * L;
  const half = p.gap / 2;

  // 원근 축 위의 줄: [시작, 크기, 소실점 이후 쪽인가]
  const stripes: [number, number, boolean][] = [];
  for (const after of [false, true]) {
    const S = after ? L - v : v;
    if (S <= 0) continue;
    const m = Math.max(1, Math.round((count * S) / L));
    for (const [s0, s1] of sideStripes(S, m, e, phi)) {
      // 소실점 쪽과 줄 사이에만 간격, 바깥 끝은 full-bleed
      const inner = s0 + half;
      const outer = s1 >= S ? s1 : s1 - half;
      if (outer - inner <= 0) continue;
      const start = after ? origin + v + inner : origin + v - outer;
      stripes.push([start, outer - inner, after]);
    }
  }

  const across = distribute(uniform(Math.max(1, Math.round(p.splits))), cols ? b.y : b.x, cols ? b.h : b.w, p.gap, 0);
  const bars: Bar[] = [];
  for (const [a, size, after] of stripes) {
    for (const [c, csize] of across) {
      const rect = cols ? { x: a, y: c, w: size, h: csize } : { x: c, y: a, w: csize, h: size };
      // 소실점 이후 쪽(오른쪽/아래)의 줄은 시작(왼/위) 쪽이 소실점 → blue
      bars.push(makeBar(rect, p, cols ? 'h' : 'v', after ? 'start' : 'end', null));
    }
  }
  return bars;
};
