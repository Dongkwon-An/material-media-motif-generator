import { beforeEach, describe, expect, it } from 'vitest';
import { REVEAL_DURATION, revealFrom } from '../../src/engine/reveal';
import { createScene } from '../../src/engine/scene';
import { defaultMotif } from '../../src/motifs';
import type { Bar, MotifParams } from '../../src/motifs/types';
import { MAX_MIX_LAYERS, useStore } from '../../src/store';

describe('revealFrom', () => {
  const bar = (x: number): Bar => ({
    x, y: 0, w: 100, h: 20, opacity: 1, gradient: { axis: 'v', blueAt: 'end', highlightStop: 0.68 },
  });

  it('클릭 지점에 가까운 바가 먼저 나타난다', () => {
    const [near, far] = revealFrom([bar(0), bar(900)], { x: 0, y: 0 }, 0.3, 1000);
    expect(near.w).toBeGreaterThan(far.w);
  });

  it('progress 1이면 원래 바 그대로', () => {
    const bars = [bar(0), bar(900)];
    expect(revealFrom(bars, { x: 0, y: 0 }, 1, 1000)).toBe(bars);
  });
});

describe('store: Create', () => {
  beforeEach(() => {
    const s = useStore.getState();
    useStore.setState({
      baseSeed: 7,
      create: {
        ...s.create, kind: 'single', single: defaultMotif('spread'), shot: null, clicks: 0,
        mix: { layers: [defaultMotif('stack'), defaultMotif('portal')], active: 0, blend: 'auto', mutation: 40 },
      },
    });
  });

  const scene = (t = 9) => createScene(useStore.getState().create, 1000, 600, t, 0, 0);

  it('클릭 전에는 아무것도 그리지 않는다', () => {
    expect(scene()).toEqual([]);
  });

  it('Single 클릭: 클릭 지점이 Spread 초점이 되고, 펼쳐진 뒤 화면 전체를 채운다', () => {
    useStore.getState().shoot({ x: 250, y: 450 }, 0, { x: 0.25, y: 0.75 });
    expect(useStore.getState().create.single).toMatchObject({ focus: { x: 0.25, y: 0.75 } });
    const bars = scene(REVEAL_DURATION)[0].bars;
    expect(Math.min(...bars.map((b) => b.x))).toBeCloseTo(0);
    expect(Math.max(...bars.map((b) => b.x + b.w))).toBeCloseTo(1000);
  });

  it('생성 후 사이드바 조정이 그대로 반영된다', () => {
    const s = useStore.getState();
    s.shoot({ x: 500, y: 300 }, 0, { x: 0.5, y: 0.5 });
    const before = scene()[0].bars.length;
    s.patchMotif('create', { complexity: 100 });
    expect(scene()[0].bars.length).toBeGreaterThan(before);
  });

  it('Mix 클릭: 모든 레이어의 Portal 소실점이 클릭 지점으로, 섞인 결과 하나가 화면 전체에 그려진다', () => {
    const s = useStore.getState();
    s.setCreateKind('mix');
    s.shoot({ x: 600, y: 120 }, 0, { x: 0.6, y: 0.2 });
    const c = useStore.getState().create;
    expect(c.mix.layers[1]).toMatchObject({ vanish: { x: 0.6, y: 0.2 } });
    expect(c.shot!.recipe.steps).toHaveLength(1);
    const layers = scene();
    expect(layers).toHaveLength(1);
    expect(layers[0].bars.length).toBeGreaterThan(0);
  });

  it('Mix는 클릭마다 레시피가 새로 뽑힌다', () => {
    const s = useStore.getState();
    s.setCreateKind('mix');
    s.addMixLayer();
    const recipes = new Set<string>();
    for (let i = 0; i < 6; i++) {
      useStore.getState().shoot({ x: 500, y: 300 }, i, { x: 0.5, y: 0.5 });
      recipes.add(JSON.stringify(useStore.getState().create.shot!.recipe));
    }
    expect(recipes.size).toBeGreaterThan(1);
  });

  it('Blend를 고정하면 생성된 화면의 레시피가 그 연산으로 바로 바뀐다', () => {
    const s = useStore.getState();
    s.setCreateKind('mix');
    s.shoot({ x: 500, y: 300 }, 0, { x: 0.5, y: 0.5 });
    useStore.getState().setBlend('weave');
    expect(useStore.getState().create.shot!.recipe.steps.map((x) => x.kind)).toEqual(['weave']);
  });

  it('Mix 편집 대상은 선택한 레이어', () => {
    const s = useStore.getState();
    s.setCreateKind('mix');
    s.setMixActive(1);
    s.setMotifType('create', 'wave');
    expect(useStore.getState().create.mix.layers.map((l) => l.type)).toEqual(['stack', 'wave']);
  });

  it(`레이어는 1~${MAX_MIX_LAYERS}개`, () => {
    const s = useStore.getState();
    for (let i = 0; i < 6; i++) s.addMixLayer();
    expect(useStore.getState().create.mix.layers).toHaveLength(MAX_MIX_LAYERS);
    for (let i = 0; i < 6; i++) useStore.getState().removeMixLayer(0);
    expect(useStore.getState().create.mix.layers).toHaveLength(1);
  });
});

describe('Create · Pull top 펼침', () => {
  const at = (t: number) => {
    const s = useStore.getState();
    useStore.setState({ create: { ...s.create, kind: 'single', single: { ...defaultMotif('pull'), view: 'top', count: 6 } as MotifParams } });
    useStore.getState().shoot({ x: 900, y: 300 }, 0, { x: 0.9, y: 0.5 });
    return createScene(useStore.getState().create, 1000, 600, t, 0, 0)[0].bars;
  };

  it('좌우로 늘어나지 않고 위에서부터 내려온다 (바는 항상 화면 폭 전체, 아래쪽은 아직 비어 있음)', () => {
    const mid = at(REVEAL_DURATION * 0.4).filter((b) => b.y < 600);
    expect(mid.every((b) => b.x === 0 && b.w === 1000)).toBe(true);
    expect(Math.max(...mid.map((b) => b.y + b.h))).toBeLessThan(500);
  });

  it('펼침이 끝나면 완성 화면과 같다', () => {
    const almost = at(REVEAL_DURATION * 0.9999);
    const done = at(REVEAL_DURATION + 1);
    expect(almost.length).toBeGreaterThanOrEqual(done.length);
    done.forEach((b, i) => expect(almost[i].h).toBeCloseTo(b.h, 0));
  });
});
