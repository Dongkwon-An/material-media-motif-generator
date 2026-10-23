import { clamp01, easeInOutCubic, lerp, mod } from '../engine/easing';
import { MOTIFS, MOTIF_ORDER, defaultMotif } from './index';
import type { Bar, CommonParams, Frame, MotifType, Rect } from './types';

// Sequence (명세 7.3, 7.4): 스크롤 진행도 → Stack → Pull → Wave → Spread → Portal → (Stack) 루프.
// 진행도 1 = 한 구간. 구간 앞부분은 현재 모티프를 유지하고, 뒷부분에서 다음 모티프로 보간한다.
//
// 바 풀 보간: 풀 크기 n = max(A, B). 풀의 j번째 바는 A[⌊j·|A|/n⌋] → B[⌊j·|B|/n⌋]로 이동한다.
// (개수가 다르면 바가 갈라지거나 합쳐지며, 모든 바가 최소 한 번은 쓰인다.)
// 그라데이션 축·방향·캡은 보간할 수 없으므로 k = 0.5에서 바꾸고, 그 순간 바가 작아지도록 크기를 줄인다.

/** 구간 중 현재 모티프를 유지하는 비율 */
const HOLD = 0.45;
/** 전환 중간(k = 0.5)에서 바 크기가 줄어드는 정도 */
const DIP = 0.55;

export interface SequenceState {
  stage: MotifType;
  next: MotifType;
  /** 0~1, 전환 진행도 (HOLD 구간에서는 0) */
  k: number;
}

export function sequenceStage(progress: number): SequenceState {
  const seg = Math.floor(progress);
  const t = progress - seg;
  const n = MOTIF_ORDER.length;
  return {
    stage: MOTIF_ORDER[mod(seg, n)],
    next: MOTIF_ORDER[mod(seg + 1, n)],
    k: easeInOutCubic(clamp01((t - HOLD) / (1 - HOLD))),
  };
}

function morph(a: Bar, b: Bar, k: number): Bar {
  const dip = 1 - DIP * Math.sin(Math.PI * k);
  const w = lerp(a.w, b.w, k) * dip;
  const h = lerp(a.h, b.h, k) * dip;
  const cx = lerp(a.x + a.w / 2, b.x + b.w / 2, k);
  const cy = lerp(a.y + a.h / 2, b.y + b.h / 2, k);
  const src = k < 0.5 ? a : b;
  return { ...src, x: cx - w / 2, y: cy - h / 2, w, h, opacity: lerp(a.opacity, b.opacity, k) };
}

export function sequenceBars(
  common: CommonParams,
  progress: number,
  frame: Frame,
  bounds: Rect,
  seed: number,
): { bars: Bar[]; state: SequenceState } {
  const state = sequenceStage(progress);
  const run = (type: MotifType) => {
    const p = defaultMotif(type, common);
    return MOTIFS[type](p, frame, bounds, seed);
  };
  const A = run(state.stage);
  if (state.k <= 0) return { bars: A, state };
  const B = run(state.next);
  if (state.k >= 1) return { bars: B, state };

  const n = Math.max(A.length, B.length);
  const bars: Bar[] = [];
  for (let j = 0; j < n; j++) {
    bars.push(morph(A[Math.floor((j * A.length) / n)], B[Math.floor((j * B.length) / n)], state.k));
  }
  return { bars, state };
}
