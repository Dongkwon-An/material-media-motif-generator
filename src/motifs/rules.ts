import type { BlueAt, GradientAxis } from '../tokens/gradient';
import type { Bar, CommonParams, Rect, Side } from './types';

// 모티프 공통 규칙: 그라데이션 방향·캡 위치(명세 3.4 기준표)를 Bar로 굳히는 곳.

export const flip = (b: BlueAt): BlueAt => (b === 'start' ? 'end' : 'start');

/**
 * @param blueAt 3.4 기준표의 기본 방향. invert가 켜지면 뒤집는다.
 * @param autoCap 캡 위치 'auto'일 때의 모티프 규칙. null이면 캡 없음.
 */
export function makeBar(
  rect: Rect,
  p: CommonParams,
  axis: GradientAxis,
  blueAt: BlueAt,
  autoCap: Side | null,
  capScale = 1,
): Bar {
  const side = p.cap.side === 'auto' ? autoCap : p.cap.side;
  return {
    ...rect,
    gradient: { axis, blueAt: p.invert ? flip(blueAt) : blueAt, highlightStop: p.highlightStop },
    cap: p.cap.enabled && side ? { side, ratio: p.cap.ratio * capScale } : undefined,
    opacity: 1,
  };
}

/** Complexity(0~100) → 개수. Count를 직접 지정하지 않았으면 seed로 ±1 흔든다 (명세 7.5). */
export function resolveCount(
  override: number | undefined,
  complexity: number,
  min: number,
  max: number,
  rng: () => number,
): number {
  if (override !== undefined) return Math.max(1, Math.round(override));
  const base = Math.round(min + (max - min) * Math.min(1, Math.max(0, complexity / 100)));
  return Math.max(min, base + Math.floor(rng() * 3) - 1);
}

/** weights 비율대로 total 길이를 나눈다. 사이 간격 gap, 양 끝 여백 edge. → [시작, 크기][] */
export function distribute(
  weights: number[],
  start: number,
  total: number,
  gap: number,
  edge: number,
): [number, number][] {
  const n = weights.length;
  const free = Math.max(0, total - 2 * edge - gap * (n - 1));
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  let pos = start + edge;
  return weights.map((w) => {
    const size = (free * w) / sum;
    const seg: [number, number] = [pos, size];
    pos += size + gap;
    return seg;
  });
}

/** 초점에 가까울수록 작고 바깥으로 갈수록 커지는 원근 가중치 (M4). */
export function perspectiveWeights(n: number, focus: number, compression: number): number[] {
  const k = compression * 30;
  return Array.from({ length: n }, (_, i) => 1 + k * Math.pow(Math.abs((i + 0.5) / n - focus), 1.3));
}

export const uniform = (n: number) => Array.from({ length: n }, () => 1);
