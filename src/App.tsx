import { useEffect } from 'react';
import { MOTIF_ORDER } from './motifs';
import { useStore } from './store';
import { Canvas } from './ui/Canvas';
import { currentPage, usePage } from './ui/router';
import { Sidebar } from './ui/Sidebar/Sidebar';

// 키보드 (명세 7.6 중 현재 구현된 것): 1–5 모티프, 6 Sequence(Explore), Space 재생/정지, R seed, H 사이드바,
// Shift+R Create 화면 지우기
function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useStore.getState();
      const page = currentPage();
      const n = Number(e.key);
      if (n >= 1 && n <= MOTIF_ORDER.length) s.setMotifType(page, MOTIF_ORDER[n - 1]);
      else if (e.key === '6' && page === 'explore') s.setSequence();
      else if (e.code === 'Space') {
        e.preventDefault();
        s.togglePause();
        (document.activeElement as HTMLElement | null)?.blur();
      } else if (e.code === 'KeyR') {
        if (e.shiftKey) s.clearCreate();
        else s.randomizeSeed();
      } else if (e.code === 'KeyH') s.toggleSidebar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export function App() {
  useShortcuts();
  const page = usePage();
  return (
    <div className="mm-app">
      <Sidebar page={page} />
      <main className="mm-stage" data-page={page}>
        <Canvas key={page} page={page} />
      </main>
    </div>
  );
}
