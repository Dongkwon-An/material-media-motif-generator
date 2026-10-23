import { describe, expect, it } from 'vitest';
import { MOTIFS, defaultMotif } from '../../src/motifs';
import { sequenceBars, sequenceStage } from '../../src/motifs/sequence';
import type { Rect } from '../../src/motifs/types';

const B: Rect = { x: 0, y: 0, w: 1200, h: 800 };
const F = { progress: 1, time: 0 };
const common = defaultMotif('stack');

describe('sequenceStage', () => {
  it('Stack → Pull → Wave → Spread → Portal → Stack 순서로 루프한다', () => {
    expect([0, 1, 2, 3, 4, 5].map((p) => sequenceStage(p).stage)).toEqual(['stack', 'pull', 'wave', 'spread', 'portal', 'stack']);
    expect(sequenceStage(4).next).toBe('stack');
  });

  it('음수 진행도(위로 스크롤)에서도 역순으로 이어진다', () => {
    expect(sequenceStage(-0.2).stage).toBe('portal');
    expect(sequenceStage(-1.2).stage).toBe('spread');
  });

  it('구간 앞부분은 유지(k = 0), 끝으로 갈수록 k → 1', () => {
    expect(sequenceStage(2.3).k).toBe(0);
    expect(sequenceStage(2.99).k).toBeGreaterThan(0.99);
  });
});

describe('sequenceBars', () => {
  it('유지 구간에서는 해당 모티프 출력과 같다', () => {
    const { bars } = sequenceBars(common, 1.2, F, B, 3);
    expect(bars).toEqual(MOTIFS.pull(defaultMotif('pull', common), F, B, 3));
  });

  it('전환 중 바 수는 두 모티프 중 큰 쪽, 모든 바는 bounds 안', () => {
    for (const p of [0.6, 0.75, 0.9, 1.7, 2.8, 3.6, 4.8]) {
      const { bars, state } = sequenceBars(common, p, F, B, 3);
      const a = MOTIFS[state.stage](defaultMotif(state.stage, common), F, B, 3).length;
      const b = MOTIFS[state.next](defaultMotif(state.next, common), F, B, 3).length;
      expect(bars.length).toBe(Math.max(a, b));
      for (const bar of bars) {
        expect(bar.x).toBeGreaterThanOrEqual(-1e-6);
        expect(bar.y).toBeGreaterThanOrEqual(-1e-6);
        expect(bar.x + bar.w).toBeLessThanOrEqual(B.w + 1e-6);
        expect(bar.y + bar.h).toBeLessThanOrEqual(B.h + 1e-6);
      }
    }
  });

  it('같은 진행도 + seed → 같은 결과', () => {
    expect(sequenceBars(common, 2.77, F, B, 9)).toEqual(sequenceBars(common, 2.77, F, B, 9));
  });
});
