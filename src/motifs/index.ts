import { DEFAULT_CAP_RATIO, DEFAULT_HIGHLIGHT_STOP } from '../tokens/gradient';
import { portal } from './portal';
import { pull } from './pull';
import { spread } from './spread';
import { stack } from './stack';
import type { CommonParams, MotifFn, MotifParams, MotifType } from './types';
import { wave } from './wave';

export const MOTIFS: Record<MotifType, MotifFn> = { stack, pull, wave, spread, portal };

export const MOTIF_ORDER: MotifType[] = ['stack', 'pull', 'wave', 'spread', 'portal'];

/** 모티프 기본값. 전환할 때 complexity·invert·highlightStop은 이전 값을 유지한다. */
export function defaultMotif(type: MotifType, prev?: CommonParams): MotifParams {
  const keep = {
    complexity: prev?.complexity ?? 50,
    invert: prev?.invert ?? false,
    highlightStop: prev?.highlightStop ?? DEFAULT_HIGHLIGHT_STOP,
  };
  const cap = (enabled: boolean) => ({ enabled, ratio: DEFAULT_CAP_RATIO, side: 'auto' as const });
  switch (type) {
    case 'stack':
      return { type, splits: 2, gap: 16, cap: cap(false), ...keep };
    case 'pull':
      return { type, view: 'side', growth: 0.35, curve: 'linear', align: 'right', gapGrowth: false, gap: 16, cap: cap(true), ...keep };
    case 'wave':
      return { type, orientation: 'vertical', shape: 'sine', amplitude: 0.12, frequency: 1, phase: 0, phaseSpeed: 0.8, gap: 6, cap: cap(true), ...keep };
    case 'spread':
      return { type, compression: 0.5, focus: { x: 0.5, y: 0.5 }, gap: 14, cap: cap(true), ...keep };
    case 'portal':
      return { type, axis: 'cols', splits: 0, compression: 0.5, vanish: { x: 0.5, y: 0.5 }, flowSpeed: 0.15, flow: 'in', gap: 10, cap: cap(false), ...keep };
  }
}
