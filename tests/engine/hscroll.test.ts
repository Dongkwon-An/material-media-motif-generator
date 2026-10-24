import { describe, expect, it } from 'vitest';
import { exploreScene } from '../../src/engine/scene';
import { defaultMotif } from '../../src/motifs';
import type { Bar, MotifParams } from '../../src/motifs/types';

const W = 1000;
const H = 600;
const scene = (motif: MotifParams, scrollX: number, scrollY = 0) =>
  exploreScene({ baseSeed: 3, mode: 'normal', motif }, W, H, 0, scrollY, scrollX).layers[0].bars;
const onScreen = (bars: Bar[]) => bars.filter((b) => b.x + b.w > 0 && b.x < W && b.y + b.h > 0 && b.y < H);

describe('Explore 좌우 스크롤', () => {
  it('가로 스크롤 0이면 화면은 이전과 같다', () => {
    for (const t of ['wave', 'spread', 'portal'] as const) {
      expect(scene(defaultMotif(t), 0)).toEqual(exploreScene({ baseSeed: 3, mode: 'normal', motif: defaultMotif(t) }, W, H, 0, 0).layers[0].bars);
    }
  });

  it('Stack·Pull은 가로 스크롤을 쓰지 않는다', () => {
    for (const t of ['stack', 'pull'] as const) expect(scene(defaultMotif(t), 300)).toEqual(scene(defaultMotif(t), 0));
  });

  it('세로 Wave는 frequency가 정수가 아니어도 이웃 바와 파형이 이어진다', () => {
    const m = { ...defaultMotif('wave'), frequency: 1.25, count: 20 } as MotifParams;
    const at = (pan: number) => onScreen(scene(m, pan)).sort((a, b) => a.x - b.x);
    // 화면 폭만큼 옮긴 지점의 이음매 근처에서 이웃 바 사이의 높이 차가 일정 범위 안
    const bars = at(W / 2);
    const jumps = bars.slice(1).map((b, i) => Math.abs(b.y - bars[i].y));
    expect(Math.max(...jumps)).toBeLessThan(Math.min(...jumps) + 60);
  });

  it('세로 Wave: 바 하나 간격만큼 옮기면 같은 모양이 한 칸 옆에 있다', () => {
    const m = { ...defaultMotif('wave'), shape: 'flat', count: 20 } as MotifParams;
    const a = onScreen(scene(m, 0.001)).map((b) => Math.round(b.x));
    const pitch = a[1] - a[0];
    const b = onScreen(scene(m, pitch + 0.001)).map((b) => Math.round(b.x));
    expect(b.slice(0, 5)).toEqual(a.slice(0, 5));
  });

  it('Spread·Portal은 화면 폭 + gap 주기로 이어지고 이음매에 gap만큼 빈다', () => {
    for (const t of ['spread', 'portal'] as const) {
      const m = defaultMotif(t);
      const pan = 200;
      const bars = scene(m, pan);
      const seam = W - pan; // 첫 사본의 오른쪽 끝
      expect(bars.some((b) => Math.abs(b.x + b.w - seam) < 0.01)).toBe(true);
      expect(bars.some((b) => Math.abs(b.x - (seam + m.gap)) < 0.01)).toBe(true);
      expect(bars.every((b) => b.x + b.w <= seam + 0.01 || b.x >= seam + m.gap - 0.01)).toBe(true);
    }
  });
});
