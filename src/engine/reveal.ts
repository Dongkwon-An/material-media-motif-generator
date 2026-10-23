import type { Bar } from '../motifs/types';
import { clamp01, easeOutCubic } from './easing';

/** 클릭 후 화면 전체로 펼쳐지는 모션 길이 (명세 7.2: 기본 1.6초) */
export const REVEAL_DURATION = 1.6;

/**
 * 클릭 지점에서 화면 전체로 펼쳐지는 생성 모션 (Pull → Wave → Spread 압축).
 *  Spread: 클릭 지점에서 가까운 바부터 차례로 나타난다(거리 비례 지연).
 *  Pull: 각 바는 클릭 지점 쪽 끝에서 긴 축 방향으로 서랍처럼 밀려나온다.
 *  Wave: 나타나는 동안 물결이 한 번 지나가며 감쇠한다.
 */
export function revealFrom(bars: Bar[], origin: { x: number; y: number }, progress: number, maxDist: number): Bar[] {
  if (progress >= 1) return bars;
  const reach = Math.max(1, maxDist);
  return bars.map((b) => {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const d = Math.hypot(cx - origin.x, cy - origin.y) / reach;
    const t = easeOutCubic(clamp01((progress - d * 0.55) / 0.45));
    if (t <= 0) return { ...b, w: 0, h: 0, opacity: 0 };
    const wave = Math.sin(d * 14 - progress * 10) * 8 * (1 - t);
    const opacity = b.opacity * Math.min(1, t * 1.6);
    if (b.w >= b.h) {
      const w = b.w * t;
      const x = origin.x > cx ? b.x + b.w - w : b.x;
      return { ...b, x, w, y: b.y + wave, opacity };
    }
    const h = b.h * t;
    const y = origin.y > cy ? b.y + b.h - h : b.y;
    return { ...b, y, h, x: b.x + wave, opacity };
  });
}
