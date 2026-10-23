import { create } from 'zustand';
import { hash } from './engine/rng';
import { defaultMotif } from './motifs';
import { makeRecipe } from './motifs/hybrid';
import type { AppState, BlendKind, CreateState, MotifParams, MotifType } from './motifs/types';

const randomSeed = () => (Math.random() * 2 ** 32) >>> 0;

export const MAX_MIX_LAYERS = 4;

/** 사이드바가 편집하는 대상: Explore의 모티프, 또는 Create의 Single 모티프 / Mix 선택 레이어 */
export type EditTarget = 'explore' | 'create';

interface UiState {
  sidebarOpen: boolean;
  paused: boolean;
  scrollSensitivity: number;
}

interface Actions {
  toggleSidebar(): void;
  togglePause(): void;
  setScrollSensitivity(v: number): void;
  randomizeSeed(): void;

  /** Explore: Sequence 모드 */
  setSequence(): void;
  /** 모티프 전환. Explore에서는 Sequence 모드를 해제한다. */
  setMotifType(target: EditTarget, type: MotifType): void;
  /** 프리셋 등 파라미터 통째로 교체 */
  setMotif(target: EditTarget, params: MotifParams): void;
  /** 파라미터 일부 변경 (type은 바꾸지 않는다) */
  patchMotif(target: EditTarget, patch: Record<string, unknown>): void;

  /** Create */
  setCreateKind(kind: CreateState['kind']): void;
  setBlend(blend: BlendKind | 'auto'): void;
  setMutation(v: number): void;
  addMixLayer(): void;
  removeMixLayer(index: number): void;
  setMixActive(index: number): void;
  /**
   * 화면 클릭 → 클릭 지점에서 전체 화면 생성. Spread 초점 / Portal 소실점은 클릭 지점(local, 0~1)으로 옮긴다.
   * Mix는 클릭마다 새 섞기 레시피를 뽑는다.
   */
  shoot(origin: { x: number; y: number }, now: number, local: { x: number; y: number }): void;
  clearCreate(): void;
}

export type Store = AppState & { ui: UiState } & Actions;

const initialCreate = (): CreateState => ({
  kind: 'single',
  single: defaultMotif('spread'),
  mix: { layers: [defaultMotif('stack'), defaultMotif('portal')], active: 0, blend: 'auto', mutation: 40 },
  shot: null,
  clicks: 0,
});

/** 편집 대상 모티프 읽기 */
export function editedMotif(s: AppState, target: EditTarget): MotifParams {
  if (target === 'explore') return s.motif;
  const c = s.create;
  return c.kind === 'single' ? c.single : c.mix.layers[c.mix.active];
}

/** 편집 대상 모티프 쓰기 */
function withEdited(s: AppState, target: EditTarget, next: MotifParams): Partial<AppState> {
  if (target === 'explore') return { motif: next };
  const c = s.create;
  if (c.kind === 'single') return { create: { ...c, single: next } };
  const layers = c.mix.layers.map((m, i) => (i === c.mix.active ? next : m));
  return { create: { ...c, mix: { ...c.mix, layers } } };
}

/** 생성된 화면이 있으면 현재 Mix 설정으로 레시피를 다시 뽑는다 (펼침 모션 없이 바로 바뀜) */
function reroll(c: CreateState, baseSeed: number): CreateState {
  if (!c.shot) return c;
  const seed = hash(baseSeed, c.clicks);
  return { ...c, shot: { ...c.shot, seed, recipe: makeRecipe(seed, c.mix.layers.length, c.mix.blend, c.mix.mutation) } };
}

/** 클릭 지점을 초점/소실점으로 쓰는 모티프는 그 값을 갱신한다 */
function aimAt(p: MotifParams, local: { x: number; y: number }): MotifParams {
  if (p.type === 'spread') return { ...p, focus: local };
  if (p.type === 'portal') return { ...p, vanish: local };
  return p;
}

export const useStore = create<Store>()((set) => ({
  baseSeed: randomSeed(),
  mode: 'normal',
  motif: defaultMotif('stack'),
  create: initialCreate(),
  scrollY: 0,
  exhibition: { enabled: false, state: 'active' },
  ui: { sidebarOpen: true, paused: false, scrollSensitivity: 1 },

  toggleSidebar: () => set((s) => ({ ui: { ...s.ui, sidebarOpen: !s.ui.sidebarOpen } })),
  togglePause: () => set((s) => ({ ui: { ...s.ui, paused: !s.ui.paused } })),
  setScrollSensitivity: (v) => set((s) => ({ ui: { ...s.ui, scrollSensitivity: v } })),
  // Create에 이미 생성된 화면이 있으면 펼침 모션 없이 새 seed·레시피로 바로 바꾼다
  randomizeSeed: () =>
    set((s) => {
      const baseSeed = randomSeed();
      return { baseSeed, create: reroll(s.create, baseSeed) };
    }),

  setSequence: () => set({ mode: 'sequence' }),
  setMotifType: (target, type) =>
    set((s) => {
      const cur = editedMotif(s, target);
      const next = cur.type === type ? cur : defaultMotif(type, cur);
      return { ...withEdited(s, target, next), ...(target === 'explore' ? { mode: 'normal' as const } : {}) };
    }),
  setMotif: (target, params) =>
    set((s) => ({ ...withEdited(s, target, params), ...(target === 'explore' ? { mode: 'normal' as const } : {}) })),
  patchMotif: (target, patch) =>
    set((s) => {
      const cur = editedMotif(s, target);
      return withEdited(s, target, { ...cur, ...patch, type: cur.type } as MotifParams);
    }),

  setCreateKind: (kind) => set((s) => ({ create: { ...s.create, kind } })),
  setBlend: (blend) => set((s) => ({ create: reroll({ ...s.create, mix: { ...s.create.mix, blend } }, s.baseSeed) })),
  setMutation: (mutation) => set((s) => ({ create: reroll({ ...s.create, mix: { ...s.create.mix, mutation } }, s.baseSeed) })),
  addMixLayer: () =>
    set((s) => {
      const { mix } = s.create;
      if (mix.layers.length >= MAX_MIX_LAYERS) return {};
      // 아직 안 쓴 모티프부터 채운다
      const used = new Set(mix.layers.map((l) => l.type));
      const type = (['stack', 'pull', 'wave', 'spread', 'portal'] as const).find((t) => !used.has(t)) ?? 'stack';
      const layers = [...mix.layers, defaultMotif(type, mix.layers[mix.active])];
      return { create: reroll({ ...s.create, mix: { ...mix, layers, active: layers.length - 1 } }, s.baseSeed) };
    }),
  removeMixLayer: (index) =>
    set((s) => {
      const { mix } = s.create;
      if (mix.layers.length <= 1) return {};
      const layers = mix.layers.filter((_, i) => i !== index);
      return { create: reroll({ ...s.create, mix: { ...mix, layers, active: Math.min(mix.active, layers.length - 1) } }, s.baseSeed) };
    }),
  setMixActive: (index) => set((s) => ({ create: { ...s.create, mix: { ...s.create.mix, active: index } } })),

  shoot: (origin, now, local) =>
    set((s) => {
      const c = s.create;
      const clicks = c.clicks + 1;
      const seed = hash(s.baseSeed, clicks);
      const recipe = makeRecipe(seed, c.mix.layers.length, c.mix.blend, c.mix.mutation);
      return {
        create: {
          ...c,
          clicks,
          shot: { origin, seed, bornAt: now, recipe },
          single: aimAt(c.single, local),
          mix: { ...c.mix, layers: c.mix.layers.map((m) => aimAt(m, local)) },
        },
      };
    }),
  clearCreate: () => set((s) => ({ create: { ...s.create, shot: null } })),
}));

// 캔버스 rAF 루프가 store 인스턴스를 붙잡고 있어서, store가 HMR로 다시 만들어지면 화면과 사이드바가
// 서로 다른 store를 보게 된다 (예: Clear가 화면에 반영되지 않음). store가 바뀌면 전체 새로고침한다.
import.meta.hot?.accept(() => location.reload());
