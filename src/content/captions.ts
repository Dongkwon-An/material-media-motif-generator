import type { MotifType } from '../motifs/types';

// 모티프 설명 캡션 (명세 8장). 기본값(미확정): 2장 서사 문구를 한 줄로 축약.
export const CAPTIONS: Record<MotifType, { title: string; text: string }> = {
  stack: { title: 'STACK', text: '랙에 견고하게 쌓인 서버' },
  pull: { title: 'PULL', text: '서버(서랍)를 꺼내는 순간' },
  wave: { title: 'WAVE', text: '서랍 속 작품이 나오며 이는 물결' },
  spread: { title: 'SPREAD', text: '작품이 퍼지며 만들어지는 패턴' },
  portal: { title: 'PORTAL', text: '통로를 지나 다른 세계로' },
};
