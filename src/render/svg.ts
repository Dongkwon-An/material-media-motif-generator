import { COLORS } from '../tokens/colors';
import { DEFAULT_GRADIENT, gradientCacheKey, gradientStops, orientStops, type GradientConfig } from '../tokens/gradient';
import { splitCap } from './barGeometry';
import type { Layer } from './Renderer';

const n = (v: number) => +v.toFixed(2);

/**
 * 레이어를 SVG 문자열로 그린다 (Canvas2DRenderer와 같은 규칙).
 * 그라데이션은 objectBoundingBox 단위라 (축, 방향, 스톱) 조합별로 한 번만 정의하고 재사용한다.
 */
export function renderSvg(layers: readonly Layer[], width: number, height: number, gradient: GradientConfig = DEFAULT_GRADIENT): string {
  const ids = new Map<string, string>();
  const defs: string[] = [];
  const body: string[] = [];

  for (const layer of layers) {
    for (const bar of layer.bars) {
      if (bar.w <= 0 || bar.h <= 0 || bar.opacity <= 0) continue;
      const { body: b, cap } = splitCap(bar);
      const op = bar.opacity < 1 ? ` opacity="${n(bar.opacity)}"` : '';
      const parts: string[] = [];

      if (b.w > 0 && b.h > 0) {
        const { axis, blueAt, highlightStop } = bar.gradient;
        const cfg = { ...gradient, highlightStop };
        const key = gradientCacheKey(axis, blueAt, cfg);
        let id = ids.get(key);
        if (!id) {
          id = `g${ids.size}`;
          const end = axis === 'v' ? 'x2="0" y2="1"' : 'x2="1" y2="0"';
          const stops = orientStops(gradientStops(cfg), blueAt)
            .map((s) => `<stop offset="${n(s.offset)}" stop-color="${s.color}"/>`)
            .join('');
          ids.set(key, id);
          defs.push(`<linearGradient id="${id}" x1="0" y1="0" ${end}>${stops}</linearGradient>`);
        }
        parts.push(`<rect x="${n(b.x)}" y="${n(b.y)}" width="${n(b.w)}" height="${n(b.h)}" fill="url(#${id})"/>`);
      }
      if (cap && cap.w > 0 && cap.h > 0) {
        parts.push(`<rect x="${n(cap.x)}" y="${n(cap.y)}" width="${n(cap.w)}" height="${n(cap.h)}" fill="${gradient.palette.cyan}"/>`);
      }
      if (parts.length === 0) continue;
      body.push(op && parts.length > 1 ? `<g${op}>${parts.join('')}</g>` : parts.map((p) => p.replace('/>', `${op}/>`)).join(''));
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${n(width)}" height="${n(height)}" viewBox="0 0 ${n(width)} ${n(height)}">` +
    `<defs>${defs.join('')}</defs>` +
    `<rect width="100%" height="100%" fill="${COLORS.white}"/>` +
    body.join('') +
    `</svg>`
  );
}
