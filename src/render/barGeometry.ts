import type { Bar, Rect } from '../motifs/types';

// Canvas·SVG 렌더러가 공유하는 바 분해 규칙.
// 캡은 cap.side 쪽 끝에서 바 두께(top/bottom → h, left/right → w)의 ratio만큼 떼어낸 단색 띠이고,
// 그라데이션은 남은 본체 영역에만 칠한다 (ref 03a: 캡 바로 아래에서 하이라이트가 시작).
export function splitCap(bar: Bar): { body: Rect; cap: Rect | null } {
  const { x, y, w, h } = bar;
  if (!bar.cap) return { body: { x, y, w, h }, cap: null };

  const r = Math.min(1, Math.max(0, bar.cap.ratio));
  switch (bar.cap.side) {
    case 'top': {
      const c = h * r;
      return { body: { x, y: y + c, w, h: h - c }, cap: { x, y, w, h: c } };
    }
    case 'bottom': {
      const c = h * r;
      return { body: { x, y, w, h: h - c }, cap: { x, y: y + h - c, w, h: c } };
    }
    case 'left': {
      const c = w * r;
      return { body: { x: x + c, y, w: w - c, h }, cap: { x, y, w: c, h } };
    }
    case 'right': {
      const c = w * r;
      return { body: { x, y, w: w - c, h }, cap: { x: x + w - c, y, w: c, h } };
    }
  }
}
