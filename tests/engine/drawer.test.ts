import { describe, expect, it } from 'vitest';
import { DRAWER_CYCLE, drawerOpenness, pullDrawers } from '../../src/engine/drawer';
import { exploreScene } from '../../src/engine/scene';
import { defaultMotif } from '../../src/motifs';
import type { Bar } from '../../src/motifs/types';

const bar = (y: number): Bar => ({
  x: 0, y, w: 500, h: 40, opacity: 1, gradient: { axis: 'h', blueAt: 'end', highlightStop: 0.68 },
});

describe('drawerOpenness', () => {
  it('처음엔 닫혀 있고, 열기 구간이 끝나면 모두 열린다', () => {
    expect(drawerOpenness(0, 5, 0)).toBe(0);
    expect(drawerOpenness(4, 5, 0)).toBe(0);
    expect(drawerOpenness(0, 5, 1)).toBe(1);
    expect(drawerOpenness(4, 5, 1)).toBe(1);
  });

  it('위 서랍이 먼저 열린다', () => {
    expect(drawerOpenness(0, 5, 0.3)).toBeGreaterThan(drawerOpenness(4, 5, 0.3));
  });

  it('주기의 후반엔 다시 닫히고, 한 주기 뒤엔 처음과 같다', () => {
    expect(drawerOpenness(2, 5, DRAWER_CYCLE - 0.01)).toBe(0);
    expect(drawerOpenness(2, 5, DRAWER_CYCLE + 0.3)).toBeCloseTo(drawerOpenness(2, 5, 0.3));
    expect(drawerOpenness(2, 5, -0.01)).toBe(0);
  });
});

describe('pullDrawers', () => {
  it('닫힌 서랍은 정렬된 쪽 가장자리 밖으로 밀려나고 손잡이만 남는다', () => {
    const [l] = pullDrawers([bar(0)], 'left', 0);
    expect(l.x + l.w).toBeGreaterThan(0);
    expect(l.x).toBeLessThan(-400);
    const [r] = pullDrawers([bar(0)], 'right', 0);
    expect(r.x).toBeGreaterThan(400);
    expect(r.w).toBe(500);
  });

  it('배열 순서와 상관없이 위(y가 작은) 서랍부터 열린다', () => {
    const [low, high] = pullDrawers([bar(300), bar(0)], 'left', 0.3);
    expect(high.x).toBeGreaterThan(low.x);
  });
});

describe('Explore · Pull', () => {
  it('세로로 흐르지 않고 바 개수 그대로 제자리에서 여닫힌다', () => {
    const s = { baseSeed: 1, mode: 'normal' as const, motif: defaultMotif('pull') };
    const open = exploreScene(s, 1000, 600, 0, 600).layers[0].bars;
    const closed = exploreScene(s, 1000, 600, 0, 0).layers[0].bars;
    expect(open.length).toBe(closed.length);
    expect(open.map((b) => b.y)).toEqual(closed.map((b) => b.y));
    expect(open.map((b) => b.x)).not.toEqual(closed.map((b) => b.x));
  });
});
