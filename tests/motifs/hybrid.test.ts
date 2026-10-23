import { describe, expect, it } from 'vitest';
import { MOTIFS, MOTIF_ORDER, defaultMotif } from '../../src/motifs';
import { BLEND_KINDS, describeRecipe, hybridBars, makeRecipe } from '../../src/motifs/hybrid';
import type { Bar, BlendKind, MotifType, Rect } from '../../src/motifs/types';

const B: Rect = { x: 0, y: 0, w: 1200, h: 800 };
const layer = (t: MotifType, seed = 1) => MOTIFS[t](defaultMotif(t), { progress: 1, time: 0 }, B, seed);
const recipeOf = (kind: BlendKind, seed = 5) => ({ ...makeRecipe(seed, 2, kind, 60), order: [0, 1] });
const EPS = 1e-6;
const within = (b: Bar) => b.x >= -EPS && b.y >= -EPS && b.x + b.w <= B.w + EPS && b.y + b.h <= B.h + EPS;

describe('makeRecipe', () => {
  it('레이어 n개 → 단계 n-1개, order는 순열', () => {
    const r = makeRecipe(3, 4, 'auto', 50);
    expect(r.steps).toHaveLength(3);
    expect([...r.order].sort()).toEqual([0, 1, 2, 3]);
  });

  it('같은 seed → 같은 레시피, auto는 seed에 따라 여러 연산이 나온다', () => {
    expect(makeRecipe(9, 3, 'auto', 50)).toEqual(makeRecipe(9, 3, 'auto', 50));
    const kinds = new Set(Array.from({ length: 30 }, (_, s) => makeRecipe(s, 2, 'auto', 50).steps[0].kind));
    expect(kinds.size).toBe(BLEND_KINDS.length);
  });

  it('Mutation 0이면 그라데이션 뒤집기 없음', () => {
    for (const st of makeRecipe(4, 4, 'auto', 0).steps) expect(st.flip).toBe(0);
  });

  it('describeRecipe', () => {
    const r = { order: [1, 0, 2], steps: [recipeOf('slice').steps[0], { ...recipeOf('field').steps[0] }] };
    expect(describeRecipe(r, ['stack', 'portal', 'wave'])).toBe('SLICE(Portal × Stack) → FIELD(· × Wave)');
  });
});

describe.each(BLEND_KINDS)('%s', (kind) => {
  const pairs: [MotifType, MotifType][] = MOTIF_ORDER.flatMap((a) => MOTIF_ORDER.filter((b) => b !== a).map((b) => [a, b] as [MotifType, MotifType]));

  it.each(pairs)('%s × %s: 바가 생기고 모두 화면 안, 같은 입력 → 같은 결과', (a, b) => {
    const layers = [layer(a), layer(b)];
    const out = hybridBars(layers, recipeOf(kind), B);
    expect(out.length).toBeGreaterThan(0);
    for (const bar of out) {
      expect(bar.w).toBeGreaterThan(0);
      expect(bar.h).toBeGreaterThan(0);
      expect(within(bar)).toBe(true);
      if (bar.cap) expect(bar.cap.ratio).toBeLessThanOrEqual(0.6);
    }
    expect(hybridBars(layers, recipeOf(kind), B)).toEqual(out);
  });

  it('두 레이어 중 하나만 그대로 돌려주지 않는다 (실제로 섞인다)', () => {
    const layers = [layer('stack'), layer('portal')];
    const out = hybridBars(layers, recipeOf(kind), B);
    expect(out).not.toEqual(layers[0]);
    expect(out).not.toEqual(layers[1]);
  });
});

describe('slice', () => {
  it('조각은 두 레이어 바가 겹친 영역이다 (Stack 가로 바 × Portal 세로 줄 → 격자)', () => {
    const stack = layer('stack');
    const portal = layer('portal');
    const out = hybridBars([stack, portal], recipeOf('slice'), B);
    for (const p of out) {
      const inA = stack.some((a) => p.x >= a.x - EPS && p.x + p.w <= a.x + a.w + EPS && p.y >= a.y - EPS && p.y + p.h <= a.y + a.h + EPS);
      const inB = portal.some((b) => p.x >= b.x - EPS && p.x + p.w <= b.x + b.w + EPS && p.y >= b.y - EPS && p.y + p.h <= b.y + b.h + EPS);
      expect(inA && inB).toBe(true);
    }
    expect(out.length).toBeGreaterThan(stack.length);
  });
});
