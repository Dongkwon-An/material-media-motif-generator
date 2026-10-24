import type { Bar } from '../motifs/types';
import { clamp01, easeInOutCubic, mod } from './easing';

// Explore · Pull: 스크롤하면 서랍이 위에서부터 차례로 열리고, 잠시 열린 채로 있다가
// 다시 위에서부터 차례로 닫힌다. 위로 스크롤하면 거꾸로 진행.
//  side: 정면에서 본 서랍 — 화면 가장자리에서 옆으로 당겨져 나온다
//  top: 위에서 내려다본 서랍 — 위쪽 선은 그대로 두고 아래로 열린다
// 한 주기 = 열기 OPEN + 유지 HOLD + 닫기 OPEN + 유지 HOLD (단위: 화면 높이만큼의 스크롤)

const OPEN = 1;
const HOLD = 0.35;
export const DRAWER_CYCLE = 2 * (OPEN + HOLD);
/** 서랍 하나가 움직이는 구간 (OPEN 대비). 나머지는 위→아래 차례 지연으로 쓴다 */
const SPAN = 0.45;
/** 닫혀 있을 때 남는 손잡이: 가장 긴(높은) 바 대비 비율 (모든 서랍이 같은 크기) */
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
 * 서랍 여닫기.
 *  left/right: 바를 그쪽 가장자리 밖으로 밀어 넣었다가 꺼낸다 (모양·그라데이션은 그대로, 위치만 이동)
 *  down: 바의 위쪽 선을 고정하고 높이를 손잡이에서 원래 높이까지 늘린다 (캡 두께는 유지)
 * @param cycle 스크롤 / 화면 높이
 */
export function pullDrawers(bars: Bar[], dir: 'left' | 'right' | 'down', cycle: number): Bar[] {
  // 위에 있는 서랍부터 열리도록 y 순서로 차례를 매긴다
  const order = bars.map((b, i) => [b.y, i] as const).sort((a, b) => a[0] - b[0]);
  const rank = new Array<number>(bars.length);
  order.forEach(([, i], r) => (rank[i] = r));
  const stub = STUB * Math.max(0, ...bars.map((b) => (dir === 'down' ? b.h : b.w)));

  return bars.map((b, i) => {
    const t = drawerOpenness(rank[i], bars.length, cycle);
    if (t >= 1) return b;
    if (dir === 'down') {
      const capPx = b.cap ? b.h * b.cap.ratio : 0;
      const closed = Math.min(b.h, Math.max(stub, capPx));
      const h = closed + t * (b.h - closed);
      return { ...b, h, cap: b.cap && { ...b.cap, ratio: Math.min(1, capPx / h) } };
    }
    const hidden = (1 - t) * Math.max(0, b.w - stub);
    return { ...b, x: dir === 'left' ? b.x - hidden : b.x + hidden };
  });
}
