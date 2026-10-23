import { hash, mulberry32 } from '../engine/rng';
import { distribute, flip } from './rules';
import type { Bar, BlendKind, BlendStep, MotifType, Recipe, Rect } from './types';

// Mix: 여러 모티프의 요소를 섞어 새 패턴을 만든다.
// 각 레이어는 화면 전체를 채운 Bar[]이고, 레시피의 연산을 차례로 적용해 하나의 Bar[]로 합친다.
// 결과 조각도 토큰 그라데이션 + cyan 캡만 쓰므로 가이드 색 규칙은 유지된다.

export const BLEND_KINDS: BlendKind[] = ['slice', 'field', 'swap', 'weave'];

/** seed로 레시피를 뽑는다. blend가 'auto'면 단계마다 연산을 무작위로 고른다. mutation 0~100 */
export function makeRecipe(seed: number, layers: number, blend: BlendKind | 'auto', mutation: number): Recipe {
  const rng = mulberry32(seed);
  const order = Array.from({ length: layers }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const m = Math.min(1, Math.max(0, mutation / 100));
  const steps: BlendStep[] = Array.from({ length: Math.max(0, layers - 1) }, () => ({
    kind: blend === 'auto' ? BLEND_KINDS[Math.floor(rng() * BLEND_KINDS.length)] : blend,
    seed: Math.floor(rng() * 2 ** 32),
    axis: rng() < 0.5 ? 'h' : 'v',
    scale: 0.25 + m * 0.25 + m * 0.75 * rng(),
    flip: m * 0.35 * rng(),
  }));
  return { order, steps };
}

/** 사람이 읽는 레시피: "SLICE(Stack × Portal) → FIELD(· × Wave)" */
export function describeRecipe(r: Recipe, types: MotifType[]): string {
  const name = (i: number) => {
    const t = types[r.order[i]];
    return t ? t[0].toUpperCase() + t.slice(1) : '?';
  };
  if (r.steps.length === 0) return name(0);
  return r.steps.map((s, k) => `${s.kind.toUpperCase()}(${k === 0 ? name(0) : '·'} × ${name(k + 1)})`).join(' → ');
}

export function hybridBars(layers: Bar[][], recipe: Recipe, bounds: Rect): Bar[] {
  let acc = layers[recipe.order[0]] ?? [];
  recipe.steps.forEach((step, k) => {
    const next = layers[recipe.order[k + 1]] ?? [];
    acc = OPS[step.kind](acc, next, step, bounds);
  });
  return acc;
}

// ── 연산 ─────────────────────────────────────

type Op = (a: Bar[], b: Bar[], step: BlendStep, bounds: Rect) => Bar[];

/** (seed, i, j)마다 고정된 0~1 값 */
const chance = (seed: number, i: number, j = 0) => hash(hash(seed, i), j) / 2 ** 32;

function intersect(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.w, b.x + b.w) - x;
  const h = Math.min(a.y + a.h, b.y + b.h) - y;
  return w >= 1 && h >= 1 ? { x, y, w, h } : null;
}

/**
 * src 바에서 r만큼 잘라낸 조각. 그라데이션은 조각 영역에 다시 펼친다.
 * 캡은 조각이 원래 바의 캡 쪽 끝을 포함할 때만 남기고, 원래 두께(px)를 유지하도록 비율을 고친다.
 */
function piece(src: Bar, r: Rect, flipped: boolean): Bar {
  let cap: Bar['cap'];
  if (src.cap) {
    const s = src.cap.side;
    const vertical = s === 'top' || s === 'bottom';
    const touches =
      s === 'top' ? Math.abs(r.y - src.y) < 0.5
      : s === 'bottom' ? Math.abs(r.y + r.h - (src.y + src.h)) < 0.5
      : s === 'left' ? Math.abs(r.x - src.x) < 0.5
      : Math.abs(r.x + r.w - (src.x + src.w)) < 0.5;
    if (touches) {
      const ratio = (src.cap.ratio * (vertical ? src.h : src.w)) / Math.max(1e-6, vertical ? r.h : r.w);
      cap = { side: s, ratio: Math.min(0.6, ratio) };
    }
  }
  const gradient = flipped ? { ...src.gradient, blueAt: flip(src.gradient.blueAt) } : src.gradient;
  return { ...r, gradient, cap, opacity: src.opacity };
}

const maybeFlip = (b: Bar, flipped: boolean): Bar =>
  flipped ? { ...b, gradient: { ...b.gradient, blueAt: flip(b.gradient.blueAt) } } : b;

/** Slice: 두 패턴이 겹치는 부분만 조각으로 남긴다. 조각의 스타일은 체커 / 무작위 / 행 교대 중 하나로 고른다. */
const slice: Op = (A, B, st) => {
  const mode = st.seed % 3;
  const out: Bar[] = [];
  A.forEach((a, i) => {
    B.forEach((b, j) => {
      const r = intersect(a, b);
      if (!r) return;
      const useA = mode === 0 ? (i + j) % 2 === 0 : mode === 1 ? chance(st.seed, i, j) < 0.5 : i % 2 === 0;
      out.push(piece(useA ? a : b, r, chance(st.seed ^ 0x9e37, i, j) < st.flip));
    });
  });
  return out;
};

/** 바의 긴 축을 따라 표본을 찍어 keep(x, y)가 참인 연속 구간만 조각으로 잘라낸다. */
const FIELD_SAMPLES = 48;
function runs(bar: Bar, keep: (x: number, y: number) => boolean): Rect[] {
  const horizontal = bar.w >= bar.h;
  const len = horizontal ? bar.w : bar.h;
  const out: Rect[] = [];
  let start = -1;
  for (let i = 0; i <= FIELD_SAMPLES; i++) {
    const t = (i + 0.5) / FIELD_SAMPLES;
    const inside =
      i < FIELD_SAMPLES &&
      (horizontal ? keep(bar.x + t * bar.w, bar.y + bar.h / 2) : keep(bar.x + bar.w / 2, bar.y + t * bar.h));
    if (inside && start < 0) start = i;
    if (!inside && start >= 0) {
      const s0 = (start / FIELD_SAMPLES) * len;
      const s1 = (i / FIELD_SAMPLES) * len;
      out.push(horizontal ? { x: bar.x + s0, y: bar.y, w: s1 - s0, h: bar.h } : { x: bar.x, y: bar.y + s0, w: bar.w, h: s1 - s0 });
      start = -1;
    }
  }
  return out;
}

/**
 * Field: 겹친 사인파로 만든 물결 경계로 화면을 나눈다. A의 바는 양(+) 구역, B의 바는 음(−) 구역에 걸친
 * 구간만 남겨, 두 패턴이 물결 모양으로 맞물린다.
 */
const field: Op = (A, B, st, b) => {
  const rng = mulberry32(st.seed);
  const f = 2 * Math.PI * (0.6 + st.scale * 2.4);
  const p = [rng(), rng(), rng()].map((v) => v * Math.PI * 2);
  const ang = rng() * Math.PI;
  const value = (x: number, y: number) => {
    const u = (x - b.x) / b.w;
    const v = (y - b.y) / b.h;
    return Math.sin(u * f + p[0]) + Math.sin(v * f * 0.8 + p[1]) + 0.7 * Math.sin((u * Math.cos(ang) + v * Math.sin(ang)) * f * 1.7 + p[2]);
  };
  const out: Bar[] = [];
  A.forEach((a, i) => runs(a, (x, y) => value(x, y) > 0).forEach((r, k) => {
    if (r.w >= 1 && r.h >= 1) out.push(piece(a, r, chance(st.seed, i, k) < st.flip));
  }));
  B.forEach((bb, j) => runs(bb, (x, y) => value(x, y) <= 0).forEach((r, k) => {
    if (r.w >= 1 && r.h >= 1) out.push(piece(bb, r, chance(st.seed ^ 0x51, j, k) < st.flip));
  }));
  return out;
};

/** Swap: A의 모양에 가장 가까운 B 바의 그라데이션 방향·캡을 입힌다. */
const swap: Op = (A, B, st) => {
  if (B.length === 0) return A;
  return A.map((a, i) => {
    const cx = a.x + a.w / 2;
    const cy = a.y + a.h / 2;
    let best = B[0];
    let bd = Infinity;
    for (const b of B) {
      const d = (b.x + b.w / 2 - cx) ** 2 + (b.y + b.h / 2 - cy) ** 2;
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    return maybeFlip({ ...a, gradient: { ...best.gradient }, cap: best.cap ? { ...best.cap } : undefined }, chance(st.seed, i) < st.flip);
  });
};

/** Weave: 화면을 폭이 제각각인 띠로 잘라 A와 B를 번갈아 엮는다. */
const weave: Op = (A, B, st, b) => {
  const rng = mulberry32(st.seed);
  const k = Math.round(4 + st.scale * 16);
  const horizontal = st.axis === 'h';
  const weights = Array.from({ length: k }, () => 0.5 + rng());
  const strips = distribute(weights, horizontal ? b.y : b.x, horizontal ? b.h : b.w, 3, 0);
  const out: Bar[] = [];
  strips.forEach(([s, size], i) => {
    const strip = horizontal ? { x: b.x, y: s, w: b.w, h: size } : { x: s, y: b.y, w: size, h: b.h };
    (i % 2 ? B : A).forEach((bar, j) => {
      const r = intersect(bar, strip);
      if (r) out.push(piece(bar, r, chance(st.seed, i, j) < st.flip));
    });
  });
  return out;
};

const OPS: Record<BlendKind, Op> = { slice, field, swap, weave };
