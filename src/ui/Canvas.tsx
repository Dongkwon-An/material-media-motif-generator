import { useEffect, useRef } from 'react';
import { CAPTIONS } from '../content/captions';
import { attachInput } from '../engine/input';
import { createScene, exploreScene } from '../engine/scene';
import { registerStage } from '../export/export';
import { VirtualScroll } from '../engine/scroll';
import { MOTIF_ORDER } from '../motifs';
import type { MotifType } from '../motifs/types';
import { Canvas2DRenderer } from '../render/canvas2d';
import type { Layer } from '../render/Renderer';
import { useStore } from '../store';
import type { Page } from './router';

// 캔버스 + rAF 루프. 매 프레임 store를 직접 읽어 React 리렌더 없이 그린다.
//  explore: 현재 모티프(또는 Sequence)가 화면을 채우고 드래그·휠로 스크롤
//  create: 클릭하면 사이드바에서 만든 조합이 클릭 지점에서 화면 전체로 펼쳐진다. 휠·드래그로 스크롤
export function Canvas({ page }: { page: Page }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const renderer = new Canvas2DRenderer(canvas);
    const scroll = new VirtualScroll();
    const size = { w: 0, h: 0 };
    /** 실시간 시계: 펼쳐지는 모션 (일시정지와 무관) */
    let now = 0;
    /** 모션 시계: Wave 위상·Portal 흐름 (일시정지하면 멈춤) */
    let clock = 0;
    let last = performance.now();
    let raf = 0;
    let shownStage: MotifType | null = null;
    /** 마지막으로 그린 레이어 (SVG Export용) */
    let drawn: readonly Layer[] = [];

    const ro = new ResizeObserver(([entry]) => {
      size.w = entry.contentRect.width;
      size.h = entry.contentRect.height;
      renderer.resize(size.w, size.h, window.devicePixelRatio || 1);
    });
    ro.observe(canvas);

    const detach = attachInput(canvas, {
      onScroll: (d) => scroll.add(d * useStore.getState().ui.scrollSensitivity),
      onTap:
        page === 'create'
          ? (p) => useStore.getState().shoot(p, now, { x: p.x / size.w, y: p.y / size.h })
          : undefined,
    });

    const showCaption = (stage: MotifType | null) => {
      if (stage === shownStage || !captionRef.current) return;
      shownStage = stage;
      const el = captionRef.current;
      el.hidden = stage === null;
      if (stage) {
        const c = CAPTIONS[stage];
        el.textContent = `0${MOTIF_ORDER.indexOf(stage) + 1} ${c.title} — ${c.text}`;
      }
    };

    const tick = (t: number) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      now += dt;
      const s = useStore.getState();
      if (!s.ui.paused) clock += dt;
      scroll.update(dt);

      if (page === 'explore') {
        const { layers, sequence } = exploreScene(s, size.w, size.h, clock, scroll.current);
        showCaption(sequence ? sequence.stage : null);
        drawn = layers;
      } else {
        if (hintRef.current) hintRef.current.hidden = s.create.shot !== null;
        drawn = createScene(s.create, size.w, size.h, now, clock, scroll.current);
      }
      renderer.render(drawn);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const unregister = registerStage({ canvas, frame: () => ({ w: size.w, h: size.h, layers: drawn }) });

    return () => {
      unregister();
      cancelAnimationFrame(raf);
      detach();
      ro.disconnect();
      renderer.dispose();
    };
  }, [page]);

  return (
    <>
      <canvas ref={canvasRef} className="mm-canvas" aria-label="패턴 캔버스" />
      <div ref={captionRef} className="mm-caption" hidden />
      {page === 'create' && (
        <div ref={hintRef} className="mm-start-hint">
          <b>CLICK TO GENERATE</b>
          사이드바에서 조합을 고른 뒤 화면을 클릭하세요
        </div>
      )}
    </>
  );
}
