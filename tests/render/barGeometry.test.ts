import { describe, expect, it } from 'vitest';
import { splitCap } from '../../src/render/barGeometry';
import type { Bar } from '../../src/motifs/types';

const bar = (cap?: Bar['cap']): Bar => ({
  x: 10, y: 20, w: 200, h: 50,
  gradient: { axis: 'v', blueAt: 'end', highlightStop: 0.68 },
  cap,
  opacity: 1,
});

describe('splitCap', () => {
  it('캡이 없으면 본체가 바 전체', () => {
    expect(splitCap(bar())).toEqual({ body: { x: 10, y: 20, w: 200, h: 50 }, cap: null });
  });

  it('top 캡: 높이의 ratio만큼 위에서 떼어내고 나머지가 본체', () => {
    expect(splitCap(bar({ side: 'top', ratio: 0.2 }))).toEqual({
      body: { x: 10, y: 30, w: 200, h: 40 },
      cap: { x: 10, y: 20, w: 200, h: 10 },
    });
  });

  it('bottom 캡', () => {
    expect(splitCap(bar({ side: 'bottom', ratio: 0.2 }))).toEqual({
      body: { x: 10, y: 20, w: 200, h: 40 },
      cap: { x: 10, y: 60, w: 200, h: 10 },
    });
  });

  it('left / right 캡은 너비 기준', () => {
    expect(splitCap(bar({ side: 'left', ratio: 0.1 })).cap).toEqual({ x: 10, y: 20, w: 20, h: 50 });
    expect(splitCap(bar({ side: 'right', ratio: 0.1 })).cap).toEqual({ x: 190, y: 20, w: 20, h: 50 });
  });

  it('ratio는 0~1로 제한된다', () => {
    const { body, cap } = splitCap(bar({ side: 'top', ratio: 1.5 }));
    expect(cap!.h).toBe(50);
    expect(body.h).toBe(0);
  });
});
