import { describe, expect, it } from 'vitest';
import { decodeShareState, encodeShareState } from '../../src/export/share';
import type { Bar } from '../../src/motifs/types';
import { renderSvg } from '../../src/render/svg';
import { useStore } from '../../src/store';

const bar = (over: Partial<Bar> = {}): Bar => ({
  x: 0, y: 0, w: 100, h: 20, opacity: 1, gradient: { axis: 'v', blueAt: 'start', highlightStop: 0.68 }, ...over,
});

describe('renderSvg', () => {
  it('같은 그라데이션은 한 번만 정의한다', () => {
    const svg = renderSvg([{ bars: [bar(), bar({ y: 30 })] }], 200, 100);
    expect(svg.match(/<linearGradient/g)).toHaveLength(1);
    expect(svg.match(/fill="url\(#g0\)"/g)).toHaveLength(2);
  });

  it('캡은 cyan 단색, 반투명 바는 opacity를 붙인다', () => {
    const svg = renderSvg([{ bars: [bar({ cap: { side: 'top', ratio: 0.2 }, opacity: 0.5 })] }], 200, 100);
    expect(svg).toContain('fill="#73FCFF"');
    expect(svg).toContain('<g opacity="0.5">');
  });

  it('보이지 않는 바는 건너뛴다', () => {
    const svg = renderSvg([{ bars: [bar({ opacity: 0 }), bar({ w: 0 })] }], 200, 100);
    expect(svg).not.toContain('url(#');
  });
});

describe('share URL', () => {
  it('인코딩한 설정을 그대로 복원하고 shot은 완성 상태로 둔다', () => {
    const s = useStore.getState();
    s.shoot({ x: 10, y: 20 }, 3, { x: 0.1, y: 0.2 });
    const state = useStore.getState();
    const back = decodeShareState(encodeShareState(state))!;
    expect(back.baseSeed).toBe(state.baseSeed);
    expect(back.motif).toEqual(state.motif);
    expect(back.create.single).toEqual(state.create.single);
    expect(back.create.shot!.recipe).toEqual(state.create.shot!.recipe);
    expect(back.create.shot!.bornAt).toBeLessThan(0);
  });

  it('깨진 값이면 null', () => {
    expect(decodeShareState('not-base64!!')).toBeNull();
    expect(decodeShareState(null)).toBeNull();
  });
});
