import type { Bar } from '../motifs/types';
import { clamp01, easeInOutCubic, mod } from './easing';

// Explore · Pull · side: 스크롤하면 서랍이 위에서부터 차례로 화면 가장자리에서 당겨져 나오고,
// 잠시 열린 채로 있다가 다시 위에서부터 차례로 들어간다. 위로 스크롤하면 거꾸로 진행.
// (top 뷰는 pull.ts의 pullTopStream)
// 한 주기 = 열기 OPEN + 유지 HOLD + 닫기 OPEN + 유지 HOLD (단위: 화면 높이만큼의 스크롤)

const OPEN = 1;
const HOLD = 0.35;
export const DRAWER_CYCLE = 2 * (OPEN + HOLD);
/** 서랍 하나가 움직이는 구간 (OPEN 대비). 나머지는 위→아래 차례 지연으로 쓴다 */
const SPAN = 0.45;
/** 닫혀 있을 때 가장자리에 남는 손잡이: 가장 긴 바 너비 대비 비율 (모든 서랍이 같은 폭) */
const STUB = 0.04;

/** 주기 위치 → 서랍 i가 열린 정도 0~1 */
export function drawerOpenness(i: number, n: number, cycle: number): number {
  const c = mod(cycle, DRAWER_CYCLE);
  const delay = n > 1 ? (i / (n - 1)) * (1 - SPAN) : 0;
  const step = (local: number) => easeInOutCubic(clamp01((local / OPEN - delay) / SPAN));
  if (c < OPEN + HOLD) return step(c);
  return 1 - step(c - OPEN - HOLD);
}

/**
 * 바들을 side 쪽 가장자리 밖으로 밀어 넣었다가 꺼낸다 (모양·그라데이션은 그대로, 위치만 이동).
 * @param cycle 스크롤 / 화면 높이
 */
export function pullDrawers(bars: Bar[], side: 'left' | 'right', cycle: number): Bar[] {
  // 위에 있는 서랍부터 열리도록 y 순서로 차례를 매긴다
  const order = bars.map((b, i) => [b.y, i] as const).sort((a, b) => a[0] - b[0]);
  const rank = new Array<number>(bars.length);
  order.forEach(([, i], r) => (rank[i] = r));
  const stub = STUB * Math.max(0, ...bars.map((b) => b.w));

  return bars.map((b, i) => {
    const t = drawerOpenness(rank[i], bars.length, cycle);
    if (t >= 1) return b;
    const hidden = (1 - t) * Math.max(0, b.w - stub);
    return { ...b, x: side === 'left' ? b.x - hidden : b.x + hidden };
  });
}
