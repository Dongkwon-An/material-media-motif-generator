import { defaultMotif } from '../motifs';
import type { MotifParams, MotifType } from '../motifs/types';

// 레퍼런스 재현 프리셋 (명세 4장 프리셋 목록). size는 레퍼런스 이미지에서 잰 구성의 픽셀 크기.
// Count를 직접 지정해 seed의 개수 흔들림을 받지 않는다.

export interface Preset {
  id: string;
  label: string;
  /** reference/ 폴더 파일 */
  ref: RefFile;
  size: { w: number; h: number };
  params: MotifParams;
}

export type RefFile =
  | '01_gradient.png' | '02_stack.png' | '03_pull.png' | '04_wave.png'
  | '05_spread.png' | '06_spread_detail.png' | '07_portal_axis.png' | '08_portal_vertical.png';

export const PRESET_SEED = 1;

const make = <T extends MotifType>(type: T, patch: Record<string, unknown>) =>
  ({ ...defaultMotif(type), ...patch, type }) as MotifParams;

export const PRESETS: Preset[] = [
  { id: '02', label: 'Stack · 가로 바 8개', ref: '02_stack.png', size: { w: 338, h: 616 },
    params: make('stack', { count: 8, splits: 1, gap: 15 }) },
  { id: '03a', label: 'Pull · 위 시점 9개', ref: '03_pull.png', size: { w: 338, h: 610 },
    params: make('pull', { view: 'top', count: 9, curve: 'exp', growth: 0.3, gap: 6 }) },
  { id: '03b', label: 'Pull · 옆 시점 계단 8개', ref: '03_pull.png', size: { w: 338, h: 616 },
    params: make('pull', { view: 'side', count: 8, align: 'right', gap: 15 }) },
  { id: '04a', label: 'Wave · flat 8개', ref: '04_wave.png', size: { w: 292, h: 168 },
    params: make('wave', { shape: 'flat', count: 8, amplitude: 0, gap: 6 }) },
  { id: '04b', label: 'Wave · alternate 8개', ref: '04_wave.png', size: { w: 292, h: 188 },
    // phase π: 첫 바가 아래로 (ref 04b)
    params: make('wave', { shape: 'alternate', count: 8, amplitude: 0.055, gap: 6, phase: Math.PI }) },
  { id: '04c', label: 'Wave · arc 8개', ref: '04_wave.png', size: { w: 292, h: 226 },
    params: make('wave', { shape: 'arc', count: 8, amplitude: 0.14, gap: 6 }) },
  { id: '04d', label: 'Wave · sine N자', ref: '04_wave.png', size: { w: 282, h: 376 },
    params: make('wave', { shape: 'sine', count: 16, amplitude: 0.22, frequency: 1, gap: 3 }) },
  { id: '04e', label: 'Wave · sine Z자 (가로)', ref: '04_wave.png', size: { w: 374, h: 284 },
    params: make('wave', { shape: 'sine', orientation: 'horizontal', count: 16, amplitude: 0.2, frequency: 1, gap: 2 }) },
  { id: '05a', label: 'Spread · 코너 6×4', ref: '05_spread.png', size: { w: 338, h: 176 },
    params: make('spread', { cols: 6, rows: 4, focus: { x: 0, y: 1 }, compression: 0.3, gap: 8 }) },
  { id: '05b', label: 'Spread · 중심 12×8', ref: '05_spread.png', size: { w: 524, h: 360 },
    params: make('spread', { cols: 12, rows: 8, focus: { x: 0.5, y: 0.5 }, compression: 0.75, gap: 8 }) },
  { id: '06', label: 'Spread · 중심 확대', ref: '06_spread_detail.png', size: { w: 1424, h: 868 },
    params: make('spread', { cols: 12, rows: 8, focus: { x: 0.5, y: 0.5 }, compression: 0.75, gap: 24 }) },
  { id: '07a', label: 'Portal · 가로 줄무늬, 4등분', ref: '07_portal_axis.png', size: { w: 722, h: 440 },
    params: make('portal', { axis: 'rows', splits: 4, count: 9, gap: 6 }) },
  { id: '07b', label: 'Portal · 세로 줄무늬, 4등분', ref: '07_portal_axis.png', size: { w: 722, h: 440 },
    params: make('portal', { axis: 'cols', splits: 4, count: 8, gap: 8 }) },
  { id: '08', label: 'Portal · 세로 줄무늬', ref: '08_portal_vertical.png', size: { w: 712, h: 428 },
    params: make('portal', { axis: 'cols', splits: 0, count: 8, gap: 8 }) },
];
