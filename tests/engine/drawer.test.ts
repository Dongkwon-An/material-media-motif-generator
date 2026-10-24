import { describe, expect, it } from 'vitest';
import { DRAWER_CYCLE, drawerOpenness, pullDrawers } from '../../src/engine/drawer';
import { exploreScene } from '../../src/engine/scene';
import { MOTIFS, defaultMotif } from '../../src/motifs';
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

describe('Explore · Pull · top (위에서 밀려 내려오는 서랍)', () => {
  const motif = { ...defaultMotif('pull'), view: 'top' as const, count: 6 };
  const s = { baseSeed: 1, mode: 'normal' as const, motif };
  const bars = (scrollY: number) => exploreScene(s, 1000, 600, 0, scrollY).layers[0].bars;

  it('스크롤 0 이하면 빈 화면', () => {
    expect(bars(0)).toEqual([]);
    expect(bars(-300)).toEqual([]);
  });

  it('스크롤할수록 서랍이 늘어나고, 화면 높이만큼 스크롤하면 정적 top 레이아웃과 같다', () => {
    expect(bars(150).length).toBeLessThan(bars(450).length);
    const stat = MOTIFS.pull(motif, { progress: 1, time: 0 }, { x: 0, y: 0, w: 1000, h: 600 }, 1);
    const full = bars(600);
    stat.forEach((b, i) => {
      expect(full[i].y).toBeCloseTo(b.y);
      expect(full[i].h).toBeCloseTo(b.h);
    });
  });

  it('꽉 찬 뒤 잠시 머물고, 다시 비워졌다가 반복한다 (side와 같은 주기)', () => {
    const full = bars(600);
    expect(bars(700)).toEqual(full);
    expect(bars(600 * 1.35 + 300).length).toBeLessThan(full.length);
    expect(bars(600 * 2.4)).toEqual([]);
    const again = bars(600 * DRAWER_CYCLE + 250);
    const first = bars(250);
    expect(again.length).toBe(first.length);
    again.forEach((b, i) => expect(b.h).toBeCloseTo(first[i].h));
  });

  it('맨 위 서랍이 가장 작고 아래로 갈수록 크며, 계속 내리면 기존 서랍이 커진다', () => {
    const b = bars(500).filter((x) => x.h > 1);
    for (let i = 1; i < b.length; i++) expect(b[i].h).toBeGreaterThan(b[i - 1].h);
    // 맨 처음 들어온 서랍(맨 아래)은 스크롤할수록 커지며 내려간다
    const first = (y: number) => bars(y).at(-1)!;
    expect(first(400).h).toBeGreaterThan(first(200).h);
    expect(first(400).y).toBeGreaterThan(first(200).y);
  });

  it('위아래로 움직여도 같은 스크롤 위치면 같은 화면 (거꾸로 재생)', () => {
    expect(bars(321)).toEqual(bars(321));
  });
});
