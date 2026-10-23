import { describe, expect, it } from 'vitest';
import { PRESETS, PRESET_SEED } from '../../src/content/presets';
import { MOTIFS } from '../../src/motifs';

const render = (id: string) => {
  const p = PRESETS.find((x) => x.id === id)!;
  return MOTIFS[p.params.type](p.params, { progress: 1, time: 0 }, { x: 0, y: 0, ...p.size }, PRESET_SEED);
};

describe('프리셋 (명세 4장)', () => {
  it('14개, ID가 겹치지 않는다', () => {
    expect(PRESETS).toHaveLength(14);
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(14);
  });

  it.each([
    ['02', 8], ['03a', 9], ['03b', 8], ['04a', 8], ['04b', 8], ['04c', 8], ['04d', 16], ['04e', 16],
    ['05a', 24], ['05b', 96], ['06', 96],
  ])('%s: 바 %i개 (레퍼런스와 같은 개수)', (id, n) => {
    expect(render(id)).toHaveLength(n);
  });

  it('07a·07b는 반대 축 4등분, 08은 분할 없음', () => {
    const cols = (id: string) => new Set(render(id).map((b) => Math.round(b.y))).size;
    const rows = (id: string) => new Set(render(id).map((b) => Math.round(b.x))).size;
    expect(rows('07a')).toBe(4);
    expect(cols('07b')).toBe(4);
    expect(cols('08')).toBe(1);
  });

  it('03a: 아래로 갈수록 바 높이와 캡이 커진다', () => {
    const bars = render('03a');
    for (let i = 1; i < bars.length; i++) {
      expect(bars[i].h).toBeGreaterThan(bars[i - 1].h);
      expect(bars[i].cap!.ratio).toBeGreaterThan(bars[i - 1].cap!.ratio);
    }
  });

  it('03b: 오른쪽 정렬, 아래로 갈수록 넓어진다', () => {
    const bars = render('03b');
    for (const b of bars) expect(b.x + b.w).toBeCloseTo(338);
    for (let i = 1; i < bars.length; i++) expect(bars[i].w).toBeGreaterThan(bars[i - 1].w);
  });

  it.each(PRESETS.map((p) => p.id))('%s 지오메트리 스냅샷', (id) => {
    expect(render(id)).toMatchSnapshot();
  });
});
