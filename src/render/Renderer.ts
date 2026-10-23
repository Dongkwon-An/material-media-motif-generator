import type { Bar } from '../motifs/types';
import type { GradientConfig } from '../tokens/gradient';

/** 그리기 단위. 순서대로 겹쳐 그린다. */
export interface Layer {
  bars: readonly Bar[];
}

// 렌더러 인터페이스 (명세 9장). Canvas 2D가 기본이고, 필요 시 WebGL 구현으로 교체한다.
export interface Renderer {
  /** CSS 픽셀 크기와 devicePixelRatio(상한 2)를 반영해 백버퍼를 맞춘다. */
  resize(cssWidth: number, cssHeight: number, dpr: number): void;
  /** 그라데이션 스톱 설정. 바뀌면 그라데이션 캐시를 무효화한다. */
  setGradient(cfg: GradientConfig): void;
  /** 흰 배경으로 지우고 레이어를 순서대로 그린다. */
  render(layers: readonly Layer[]): void;
  dispose(): void;
}

export const MAX_DPR = 2;
