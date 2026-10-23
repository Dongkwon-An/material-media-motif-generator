import { useSyncExternalStore } from 'react';

// 경로 기반 페이지 전환. Vite dev/preview는 SPA fallback으로, GitHub Pages는 404.html(= index.html 사본)로
// 어느 경로든 앱이 열린다. 경로는 base(로컬 '/', Pages '/material-media-motif-generator/') 아래에 붙는다.
//  {base}         Explore — 모티프 탐색, 스크롤 반복, Sequence
//  {base}create   Create  — 조합을 만든 뒤 클릭하면 전체 화면에 패턴 생성
export type Page = 'explore' | 'create';

const BASE = import.meta.env.BASE_URL;

export const PAGE_PATH: Record<Page, string> = { explore: BASE, create: `${BASE}create` };

const fromPath = (p: string): Page => (p.startsWith(PAGE_PATH.create) ? 'create' : 'explore');

const NAV_EVENT = 'mm:navigate';

const subscribe = (cb: () => void) => {
  window.addEventListener('popstate', cb);
  window.addEventListener(NAV_EVENT, cb);
  return () => {
    window.removeEventListener('popstate', cb);
    window.removeEventListener(NAV_EVENT, cb);
  };
};

export function navigate(page: Page): void {
  const path = PAGE_PATH[page];
  if (location.pathname === path) return;
  history.pushState(null, '', path + location.search);
  window.dispatchEvent(new Event(NAV_EVENT));
}

export function currentPage(): Page {
  return fromPath(location.pathname);
}

export function usePage(): Page {
  return useSyncExternalStore(subscribe, currentPage);
}
