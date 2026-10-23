import { MOTIFS } from '../motifs';
import { hybridBars } from '../motifs/hybrid';
import { sequenceBars, type SequenceState } from '../motifs/sequence';
import type { AppState, Bar, CreateState, MotifParams, Rect } from '../motifs/types';
import type { Layer } from '../render/Renderer';
import { clamp01, mod } from './easing';
import { hash } from './rng';
import { REVEAL_DURATION, revealFrom } from './reveal';

/** 스크롤 1px이 모션 시간으로 환산되는 비율 (Wave 위상, Portal 흐름이 스크롤로 진행·역행) */
export const SCROLL_TO_TIME = 0.004;
/** Sequence 한 구간 = 뷰포트 높이 × 2 (명세 7.3) */
const SEQUENCE_SEGMENT = 2;

const shift = (bars: Bar[], dx: number, dy: number): Bar[] =>
  dx === 0 && dy === 0 ? bars : bars.map((b) => ({ ...b, x: b.x + dx, y: b.y + dy }));

/** M1~M4 반복: 화면 높이 주기로 세로 무한 반복 */
const tile = (bars: Bar[], h: number, scrollY: number): Bar[] => {
  const off = mod(scrollY, h);
  return [...shift(bars, 0, -off), ...shift(bars, 0, h - off)];
};

/** 화면 전체를 채우는 모티프 1개. M1~M4는 세로 반복, M5(Portal)는 스크롤을 줌(흐름)으로만 쓴다. */
function fullBars(p: MotifParams, bounds: Rect, time: number, scrollY: number, seed: number): Bar[] {
  const bars = MOTIFS[p.type](p, { progress: 1, time }, bounds, seed);
  return p.type === 'portal' ? bars : tile(bars, bounds.h, scrollY);
}

/**
 * Explore 페이지: 현재 모티프가 화면 전체를 채운다.
 *  normal: 화면 높이 주기 세로 반복 (Portal은 줌)
 *  sequence: 스크롤 진행도로 다섯 모티프를 순서대로 보간
 */
export function exploreScene(
  s: Pick<AppState, 'baseSeed' | 'motif' | 'mode'>,
  w: number,
  h: number,
  clock: number,
  scrollY: number,
): { layers: Layer[]; sequence: SequenceState | null } {
  if (w <= 0 || h <= 0) return { layers: [], sequence: null };
  const time = clock + scrollY * SCROLL_TO_TIME;
  const bounds = { x: 0, y: 0, w, h };

  if (s.mode === 'sequence') {
    const { bars, state } = sequenceBars(s.motif, scrollY / (h * SEQUENCE_SEGMENT), { progress: 1, time }, bounds, s.baseSeed);
    return { layers: [{ bars }], sequence: state };
  }
  return { layers: [{ bars: fullBars(s.motif, bounds, time, scrollY, s.baseSeed) }], sequence: null };
}

/**
 * Create 페이지: 클릭 전에는 빈 화면. 클릭하면 클릭 지점에서 화면 가득 펼쳐지고, 이후 사이드바 조정은 그대로 반영된다.
 *  single: 모티프 1개
 *  mix: 레이어마다 화면 전체 패턴을 만든 뒤 레시피대로 섞는다 (Portal이 섞이면 반복 없이 스크롤 = 줌)
 * @param now 펼쳐지는 모션용 실시간 시계 (일시정지와 무관)
 * @param clock Wave 위상·Portal 흐름용 시계 (일시정지하면 멈춤)
 */
export function createScene(c: CreateState, w: number, h: number, now: number, clock: number, scrollY: number): Layer[] {
  const shot = c.shot;
  if (!shot || w <= 0 || h <= 0) return [];
  const time = clock + scrollY * SCROLL_TO_TIME;
  const bounds = { x: 0, y: 0, w, h };
  const progress = clamp01((now - shot.bornAt) / REVEAL_DURATION);
  const reach = Math.hypot(Math.max(shot.origin.x, w - shot.origin.x), Math.max(shot.origin.y, h - shot.origin.y));

  if (c.kind === 'single') {
    return [{ bars: revealFrom(fullBars(c.single, bounds, time, scrollY, shot.seed), shot.origin, progress, reach) }];
  }

  const frame = { progress: 1, time };
  const layers = c.mix.layers.map((p, i) => MOTIFS[p.type](p, frame, bounds, hash(shot.seed, i)));
  const mixed = hybridBars(layers, shot.recipe, bounds);
  const bars = c.mix.layers.some((p) => p.type === 'portal') ? mixed : tile(mixed, h, scrollY);
  return [{ bars: revealFrom(bars, shot.origin, progress, reach) }];
}
