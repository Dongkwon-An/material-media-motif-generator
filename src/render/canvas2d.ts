import type { Bar } from '../motifs/types';
import { COLORS } from '../tokens/colors';
import {
  DEFAULT_GRADIENT,
  gradientCacheKey,
  gradientStops,
  orientStops,
  type BlueAt,
  type GradientAxis,
  type GradientConfig,
} from '../tokens/gradient';
import { splitCap } from './barGeometry';
import { MAX_DPR, type Layer, type Renderer } from './Renderer';

/** 단위 공간 크기. 0→1로 만들면 크게 확대할 때 Chrome에서 띠(banding)가 생겨 0→UNIT을 쓴다 */
const UNIT = 1024;
/** 인스턴스마다 highlightStop 스냅샷이 달라 키가 늘어날 수 있으므로 상한을 둔다 */
const MAX_CACHE = 64;

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * Canvas 2D 렌더러.
 * 바마다 createLinearGradient를 만들지 않고, (축, 방향, 스톱 설정) 조합별로 단위 공간(0→1)
 * 그라데이션을 한 번 만들어 캐시한 뒤 setTransform(w,0,0,h,x,y) + fillRect(0,0,1,1)로 재사용한다.
 */
export class Canvas2DRenderer implements Renderer {
  private ctx: Ctx;
  private dpr = 1;
  private width = 0;
  private height = 0;
  private gradient: GradientConfig = DEFAULT_GRADIENT;
  private cache = new Map<string, CanvasGradient>();

  constructor(private canvas: HTMLCanvasElement | OffscreenCanvas) {
    const ctx = canvas.getContext('2d', { alpha: false }) as Ctx | null;
    if (!ctx) throw new Error('Canvas 2D context를 만들 수 없습니다.');
    this.ctx = ctx;
  }

  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    this.dpr = Math.min(MAX_DPR, Math.max(1, dpr));
    this.width = cssWidth;
    this.height = cssHeight;
    this.canvas.width = Math.max(1, Math.round(cssWidth * this.dpr));
    this.canvas.height = Math.max(1, Math.round(cssHeight * this.dpr));
  }

  setGradient(cfg: GradientConfig): void {
    this.gradient = cfg;
    this.cache.clear();
  }

  render(layers: readonly Layer[]): void {
    const { ctx, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = COLORS.white;
    ctx.fillRect(0, 0, this.width, this.height);

    for (const layer of layers) this.drawBars(layer.bars);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
  }

  private drawBars(bars: readonly Bar[]): void {
    const { ctx, dpr } = this;
    for (const bar of bars) {
      if (bar.w <= 0 || bar.h <= 0 || bar.opacity <= 0) continue;
      ctx.globalAlpha = Math.min(1, bar.opacity);
      const { body, cap } = splitCap(bar);

      if (body.w > 0 && body.h > 0) {
        const s = dpr / UNIT;
        ctx.setTransform(s * body.w, 0, 0, s * body.h, dpr * body.x, dpr * body.y);
        ctx.fillStyle = this.unitGradient(bar.gradient.axis, bar.gradient.blueAt, bar.gradient.highlightStop);
        ctx.fillRect(0, 0, UNIT, UNIT);
      }
      if (cap && cap.w > 0 && cap.h > 0 && bar.cap) {
        // 본체와 맞닿는 경계의 안티앨리어싱 틈(흰 선)을 덮도록 캡을 본체 쪽으로 1px 늘린다
        const side = bar.cap.side;
        const o = body.w > 0 && body.h > 0 ? 1 : 0;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = this.gradient.palette.cyan;
        ctx.fillRect(
          side === 'right' ? cap.x - o : cap.x,
          side === 'bottom' ? cap.y - o : cap.y,
          side === 'left' || side === 'right' ? cap.w + o : cap.w,
          side === 'top' || side === 'bottom' ? cap.h + o : cap.h,
        );
      }
    }
  }

  dispose(): void {
    this.cache.clear();
  }

  private unitGradient(axis: GradientAxis, blueAt: BlueAt, highlightStop: number): CanvasGradient {
    const cfg = highlightStop === this.gradient.highlightStop ? this.gradient : { ...this.gradient, highlightStop };
    const key = gradientCacheKey(axis, blueAt, cfg);
    let g = this.cache.get(key);
    if (!g) {
      if (this.cache.size >= MAX_CACHE) this.cache.clear();
      g = axis === 'v' ? this.ctx.createLinearGradient(0, 0, 0, UNIT) : this.ctx.createLinearGradient(0, 0, UNIT, 0);
      for (const s of orientStops(gradientStops(cfg), blueAt)) g.addColorStop(s.offset, s.color);
      this.cache.set(key, g);
    }
    return g;
  }
}
