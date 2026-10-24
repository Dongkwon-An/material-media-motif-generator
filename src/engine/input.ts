// 입력 매핑 (명세 7.1). 포인터 이벤트로 마우스·터치를 통일한다.
//  탭: 이동 10px 미만이면 누른 시간과 관계없이 탭 → onTap. 멀티터치면 손가락마다 따로.
//  드래그: onDrag가 있으면 드래그로 패턴을 그리고(Create 페이지), 없으면 스크롤(Explore 페이지).
//  휠·트랙패드(좌우 스와이프, Shift+휠 포함) → onScroll(dx, dy).
//  대각선 입력은 주된 축만 남긴다: 세로로 넘기다가 화면이 옆으로 흘러가지 않도록.

const TAP_DIST = 10;
/** 작은 쪽 축이 큰 쪽의 이 비율 미만이면 버린다 */
const AXIS_LOCK = 0.5;

const lockAxis = (dx: number, dy: number): [number, number] =>
  Math.abs(dx) < Math.abs(dy) * AXIS_LOCK ? [0, dy] : Math.abs(dy) < Math.abs(dx) * AXIS_LOCK ? [dx, 0] : [dx, dy];

export interface Point { x: number; y: number }

export interface InputHandlers {
  onTap?(p: Point): void;
  onScroll(dx: number, dy: number): void;
  onDrag?: {
    start(id: number, from: Point): void;
    move(id: number, to: Point): void;
    end(id: number, to: Point): void;
    cancel(id: number): void;
  };
}

export function attachInput(el: HTMLElement, h: InputHandlers): () => void {
  const pointers = new Map<number, { x0: number; y0: number; x: number; y: number; moved: boolean }>();

  const local = (e: PointerEvent): Point => {
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const down = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    el.setPointerCapture(e.pointerId);
    const { x, y } = local(e);
    pointers.set(e.pointerId, { x0: x, y0: y, x, y, moved: false });
  };

  const move = (e: PointerEvent) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const pt = local(e);
    if (!p.moved && Math.hypot(pt.x - p.x0, pt.y - p.y0) >= TAP_DIST) {
      p.moved = true;
      h.onDrag?.start(e.pointerId, { x: p.x0, y: p.y0 });
    }
    if (p.moved) {
      if (h.onDrag) h.onDrag.move(e.pointerId, pt);
      else h.onScroll(...lockAxis(p.x - pt.x, p.y - pt.y));
    }
    p.x = pt.x;
    p.y = pt.y;
  };

  const up = (e: PointerEvent) => {
    const p = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (!p) return;
    if (!p.moved) h.onTap?.({ x: p.x0, y: p.y0 });
    else h.onDrag?.end(e.pointerId, local(e));
  };

  const cancel = (e: PointerEvent) => {
    const p = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (p?.moved) h.onDrag?.cancel(e.pointerId);
  };

  const wheel = (e: WheelEvent) => {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1;
    h.onScroll(...lockAxis(e.deltaX * unit, e.deltaY * unit));
  };

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('wheel', wheel, { passive: false });
  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', cancel);
    el.removeEventListener('wheel', wheel);
  };
}
