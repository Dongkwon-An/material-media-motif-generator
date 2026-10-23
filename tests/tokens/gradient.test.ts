import { describe, expect, it } from 'vitest';
import { COLORS } from '../../src/tokens/colors';
import {
  DEFAULT_GRADIENT,
  biasCurve,
  gradientCacheKey,
  gradientStops,
  orientStops,
} from '../../src/tokens/gradient';

describe('gradientStops', () => {
  it('기본 설정은 토큰 색 3개 스톱만 만든다 (blue 0 → light 0.68 → cyan 1)', () => {
    expect(gradientStops(DEFAULT_GRADIENT)).toEqual([
      { offset: 0, color: COLORS.blue },
      { offset: 0.68, color: COLORS.light },
      { offset: 1, color: COLORS.cyan },
    ]);
  });

  it('기본 상태에서 토큰 외 색이 등장하지 않는다', () => {
    const tokens = new Set<string>(Object.values(COLORS));
    for (const s of gradientStops(DEFAULT_GRADIENT)) expect(tokens.has(s.color)).toBe(true);
  });

  it('highlightStop 위치를 반영하고 0~1 범위로 제한한다', () => {
    expect(gradientStops({ ...DEFAULT_GRADIENT, highlightStop: 0.5 })[1].offset).toBe(0.5);
    const clamped = gradientStops({ ...DEFAULT_GRADIENT, highlightStop: 2 });
    for (const s of clamped) expect(s.offset).toBeLessThanOrEqual(1);
  });

  it('bias가 0.5가 아니면 구간 사이에 보간 스톱을 추가하고 offset은 단조 증가한다', () => {
    const stops = gradientStops({ ...DEFAULT_GRADIENT, bias: [0.3, 0.5] });
    expect(stops.length).toBe(3 + 3); // 첫 구간에만 보간 스톱 3개
    for (let i = 1; i < stops.length; i++) {
      expect(stops[i].offset).toBeGreaterThan(stops[i - 1].offset);
    }
    expect(stops[0].color).toBe(COLORS.blue);
    expect(stops.at(-1)!.color).toBe(COLORS.cyan);
  });
});

describe('biasCurve', () => {
  it('구간 중간점(bias)에서 정확히 50%가 되고 양 끝은 고정된다', () => {
    for (const m of [0.2, 0.5, 0.8]) {
      expect(biasCurve(0, m)).toBe(0);
      expect(biasCurve(1, m)).toBe(1);
      expect(biasCurve(m, m)).toBeCloseTo(0.5, 10);
    }
  });
});

describe('orientStops', () => {
  it("blueAt 'end'면 offset을 뒤집고 오름차순을 유지한다", () => {
    const flipped = orientStops(gradientStops(DEFAULT_GRADIENT), 'end');
    expect(flipped[0]).toEqual({ offset: 0, color: COLORS.cyan });
    expect(flipped[1].offset).toBeCloseTo(0.32, 10);
    expect(flipped[2]).toEqual({ offset: 1, color: COLORS.blue });
  });
});

describe('gradientCacheKey', () => {
  it('축·방향·스톱 설정이 같으면 같은 키, 다르면 다른 키', () => {
    const a = gradientCacheKey('v', 'start', DEFAULT_GRADIENT);
    expect(gradientCacheKey('v', 'start', { ...DEFAULT_GRADIENT })).toBe(a);
    expect(gradientCacheKey('h', 'start', DEFAULT_GRADIENT)).not.toBe(a);
    expect(gradientCacheKey('v', 'end', DEFAULT_GRADIENT)).not.toBe(a);
    expect(gradientCacheKey('v', 'start', { ...DEFAULT_GRADIENT, highlightStop: 0.5 })).not.toBe(a);
  });
});
