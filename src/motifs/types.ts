// 데이터 모델 (명세 10장)
import type { BlueAt, GradientAxis } from '../tokens/gradient';

export interface Rect { x: number; y: number; w: number; h: number }

export type Side = 'top' | 'bottom' | 'left' | 'right';

export interface Bar extends Rect {
  gradient: {
    axis: GradientAxis;
    blueAt: BlueAt;                // v: start=위, h: start=왼쪽
    highlightStop: number;         // 0~1
  };
  cap?: { side: Side; ratio: number };
  opacity: number;                 // 0~1
}

export interface Frame {
  progress: number;  // 0~1, 생성 모션·전환 진행도
  time: number;      // 초, 끝없이 증가 (위상 흐름·무한 줌용)
}

export interface CommonParams {
  complexity: number;              // 0~100
  gap: number;
  invert: boolean;
  highlightStop: number;           // 기본 0.68
  cap: { enabled: boolean; ratio: number; side: 'auto' | Side };
}

export type MotifParams =
  // splits: 좌우 열 분할 수 (명세 v2 이후 추가, 1 = 분할 없음)
  | ({ type: 'stack'; count?: number; splits: number } & CommonParams)
  | ({ type: 'pull'; view: 'top' | 'side'; count?: number; growth: number;
       curve: 'linear' | 'exp'; align: 'left' | 'right'; gapGrowth: boolean } & CommonParams)
  | ({ type: 'wave'; orientation: 'vertical' | 'horizontal';
       shape: 'flat' | 'alternate' | 'arc' | 'sine';
       count?: number; amplitude: number; frequency: number; phase: number; phaseSpeed: number } & CommonParams)
  | ({ type: 'spread'; rows?: number; cols?: number; compression: number;
       focus: { x: number; y: number } } & CommonParams)
  | ({ type: 'portal'; axis: 'rows' | 'cols'; splits: number; count?: number;
       compression: number; vanish: { x: number; y: number };
       flowSpeed: number; flow: 'in' | 'out' } & CommonParams);

export type MotifType = MotifParams['type'];

// Create 페이지 (명세 v2 이후 변경: 스티커식 인스턴스 대신 클릭 시 전체 화면 생성)
//  single: 모티프 1개 + 설정 조합
//  mix: 여러 모티프의 요소를 섞어 새 패턴을 만든다 (hybrid.ts)

/** 섞는 연산: slice(교차 조각) · field(물결 경계 패치워크) · swap(모양 A + 스타일 B) · weave(띠로 엮기) */
export type BlendKind = 'slice' | 'field' | 'swap' | 'weave';

export interface BlendStep {
  kind: BlendKind;
  seed: number;
  axis: 'h' | 'v';     // weave 띠 방향
  scale: number;       // 0.25~1.25: field 물결 빈도 · weave 띠 수
  flip: number;        // 0~0.35: 조각마다 그라데이션을 뒤집을 확률
}

/** 클릭마다 seed로 뽑는 섞기 레시피. 레이어를 order 순서로 steps를 차례로 적용한다. */
export interface Recipe {
  order: number[];
  steps: BlendStep[];
}

export interface CreateShot {
  origin: { x: number; y: number };  // 클릭 지점 (화면 좌표)
  seed: number;                      // hash(baseSeed, 클릭 횟수)
  bornAt: number;                    // 실시간 시계(초) — 펼쳐지는 모션 시작
  recipe: Recipe;
}

export interface CreateState {
  kind: 'single' | 'mix';
  single: MotifParams;
  mix: { layers: MotifParams[]; active: number; blend: BlendKind | 'auto'; mutation: number };
  shot: CreateShot | null;           // null이면 아직 클릭 전
  clicks: number;
}

export interface AppState {
  baseSeed: number;
  mode: 'normal' | 'sequence';
  motif: MotifParams;
  create: CreateState;
  scrollY: number;
  exhibition: { enabled: boolean; state: 'active' | 'attract' };
}

// 모든 모티프 공통 시그니처 (순수 함수)
export type MotifFn = (p: MotifParams, frame: Frame, bounds: Rect, seed: number) => Bar[];
