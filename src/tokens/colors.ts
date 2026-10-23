// 키 컬러 토큰 (명세 3.1). 기본 상태에서는 이 값 외의 색을 쓰지 않는다.
export const COLORS = {
  blue: '#005BD5',
  cyan: '#73FCFF',
  light: '#A2F8FF',
  white: '#FFFFFF',
} as const;

export type ColorToken = keyof typeof COLORS;
export type Palette = { blue: string; cyan: string; light: string };
