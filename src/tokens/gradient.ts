import { COLORS, type Palette } from './colors';

// 그라데이션 정의 (명세 3.2). 방향 표기는 항상 "blue 쪽(offset 0) → cyan 쪽(offset 1)".

export interface GradientConfig {
  palette: Palette;
  /** light 스톱 위치 0~1. 기본값(미확정) 0.68 */
  highlightStop: number;
  /** [blue→light, light→cyan] 구간별 중간점(◇). 0.5 = 선형 */
  bias: [number, number];
}

export interface GradientStop {
  offset: number;
  color: string;
}

export type GradientAxis = 'v' | 'h';
export type BlueAt = 'start' | 'end';

export const DEFAULT_HIGHLIGHT_STOP = 0.68;
/** 캡 두께: 바 두께 대비 비율. 기본값(미확정) 20% (명세 3.3) */
export const DEFAULT_CAP_RATIO = 0.2;
/** bias ≠ 0.5일 때 구간마다 넣는 보간 스톱 수 (명세: 2~4개) */
const BIAS_SUBSTOPS = 3;

export const DEFAULT_GRADIENT: GradientConfig = {
  palette: { blue: COLORS.blue, cyan: COLORS.cyan, light: COLORS.light },
  highlightStop: DEFAULT_HIGHLIGHT_STOP,
  bias: [0.5, 0.5],
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** 구간 내 위치 t(0~1)를 중간점 m에서 0.5가 되도록 휘게 한다 (m = 0.5면 선형). */
export function biasCurve(t: number, m: number): number {
  const mm = Math.min(0.99, Math.max(0.01, m));
  if (mm === 0.5) return t;
  return Math.pow(t, Math.log(0.5) / Math.log(mm));
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex([0, 1, 2].map((i) => ca[i] + (cb[i] - ca[i]) * t) as [number, number, number]);
}

/** Canvas/SVG에는 중간점 개념이 없으므로 bias ≠ 0.5인 구간에 보간 스톱을 추가해 근사한다. */
export function gradientStops(cfg: GradientConfig): GradientStop[] {
  const { blue, light, cyan } = cfg.palette;
  const h = Math.min(0.999, Math.max(0.001, cfg.highlightStop));
  const segments: [number, string, number, string, number][] = [
    [0, blue, h, light, cfg.bias[0]],
    [h, light, 1, cyan, cfg.bias[1]],
  ];

  const stops: GradientStop[] = [{ offset: 0, color: blue }];
  for (const [o0, c0, o1, c1, m] of segments) {
    if (m !== 0.5) {
      for (let i = 1; i <= BIAS_SUBSTOPS; i++) {
        const t = i / (BIAS_SUBSTOPS + 1);
        stops.push({ offset: o0 + (o1 - o0) * t, color: mixHex(c0, c1, biasCurve(t, m)) });
      }
    }
    stops.push({ offset: o1, color: c1 });
  }
  return stops.map((s) => ({ ...s, offset: clamp01(s.offset) }));
}

/** blueAt 'end'면 cyan이 offset 0 쪽에 오도록 뒤집는다. */
export function orientStops(stops: GradientStop[], blueAt: BlueAt): GradientStop[] {
  if (blueAt === 'start') return stops;
  return stops.map((s) => ({ offset: 1 - s.offset, color: s.color })).reverse();
}

export function gradientCacheKey(axis: GradientAxis, blueAt: BlueAt, cfg: GradientConfig): string {
  const { blue, light, cyan } = cfg.palette;
  return [axis, blueAt, cfg.highlightStop, cfg.bias.join(','), blue, light, cyan].join('|');
}
