import { PRESETS } from '../../content/presets';
import { MOTIF_ORDER } from '../../motifs';
import { BLEND_KINDS, describeRecipe } from '../../motifs/hybrid';
import type { MotifType } from '../../motifs/types';
import { MAX_MIX_LAYERS, editedMotif, useStore, type EditTarget } from '../../store';
import { PAGE_PATH, navigate, type Page } from '../router';
import { Segmented, Slider, Toggle, pct } from './controls';
import { MotifOptions } from './MotifOptions';
import { Pending, Section } from './Section';

const LABELS: Record<MotifType, string> = { stack: 'Stack', pull: 'Pull', wave: 'Wave', spread: 'Spread', portal: 'Portal' };
const PAGES: { page: Page; label: string }[] = [
  { page: 'explore', label: 'Explore' },
  { page: 'create', label: 'Create' },
];

function MotifChips({ target, sequence }: { target: EditTarget; sequence: boolean }) {
  const type = useStore((s) => editedMotif(s, target).type);
  const setMotifType = useStore((s) => s.setMotifType);
  const setSequence = useStore((s) => s.setSequence);
  return (
    <div className="mm-chips" role="group" aria-label="모티프 선택">
      {MOTIF_ORDER.map((t, i) => (
        <button key={t} className="mm-chip" aria-pressed={!sequence && type === t} onClick={() => setMotifType(target, t)}>
          <span className="mm-chip__num">{i + 1}</span>{LABELS[t]}
        </button>
      ))}
      {target === 'explore' && (
        <button className="mm-chip" aria-pressed={sequence} onClick={setSequence}>
          <span className="mm-chip__num">6</span>Sequence
        </button>
      )}
    </div>
  );
}

/** Create · Mix: 섞을 레이어 목록 + 섞는 방법. 선택한 레이어가 아래 섹션들의 편집 대상이 된다. */
function MixLayers() {
  const mix = useStore((s) => s.create.mix);
  const shot = useStore((s) => s.create.shot);
  const s = useStore.getState();
  return (
    <>
      <div className="mm-layers" role="listbox" aria-label="레이어">
        {mix.layers.map((l, i) => (
          <div key={i} className="mm-layer" role="option" aria-selected={i === mix.active}>
            <button className="mm-layer__pick" onClick={() => useStore.getState().setMixActive(i)}>
              <span className="mm-chip__num">{String.fromCharCode(65 + i)}</span>
              {LABELS[l.type]}
            </button>
            <button
              className="mm-layer__remove"
              aria-label={`레이어 ${String.fromCharCode(65 + i)} 삭제`}
              disabled={mix.layers.length <= 1}
              onClick={() => useStore.getState().removeMixLayer(i)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button className="mm-btn" disabled={mix.layers.length >= MAX_MIX_LAYERS} onClick={() => useStore.getState().addMixLayer()}>
        + Add layer ({mix.layers.length}/{MAX_MIX_LAYERS})
      </button>
      <Segmented label="Blend" value={mix.blend} options={['auto', ...BLEND_KINDS] as const} onChange={s.setBlend} />
      <Slider label="Mutation" value={mix.mutation} min={0} max={100} onChange={(v) => useStore.getState().setMutation(v)} />
      {shot && mix.layers.length > 1 && (
        <div className="mm-recipe">
          <span className="mm-label">Recipe #{useStore.getState().create.clicks}</span>
          <code>{describeRecipe(shot.recipe, mix.layers.map((l) => l.type))}</code>
        </div>
      )}
    </>
  );
}

export function Sidebar({ page }: { page: Page }) {
  const s = useStore();
  const target: EditTarget = page;
  const motif = editedMotif(s, target);
  const { ui, create } = s;
  const sequence = page === 'explore' && s.mode === 'sequence';
  const patch = (p: Record<string, unknown>) => s.patchMotif(target, p);
  const layerName = create.kind === 'mix' ? ` · Layer ${String.fromCharCode(65 + create.mix.active)}` : '';

  return (
    <aside className="mm-sidebar" data-open={ui.sidebarOpen}>
      <header className="mm-sidebar__head">
        <div className="mm-wordmark">
          Material Media
          <small>Motif &amp; Pattern Generator</small>
        </div>
        <button className="mm-icon-btn" onClick={s.toggleSidebar} aria-label={ui.sidebarOpen ? '사이드바 접기' : '사이드바 펼치기'}>
          {ui.sidebarOpen ? '‹' : '›'}
        </button>
      </header>

      <div className="mm-sidebar__scroll" hidden={!ui.sidebarOpen}>
        <nav className="mm-tabs" aria-label="페이지">
          {PAGES.map((p) => (
            <a
              key={p.page}
              href={PAGE_PATH[p.page]}
              aria-current={page === p.page ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                navigate(p.page);
              }}
            >
              {p.label}
            </a>
          ))}
        </nav>

        {page === 'create' && (
          <Section title="Combination">
            <Segmented label="Kind" value={create.kind} options={['single', 'mix'] as const} onChange={s.setCreateKind} />
            <p className="mm-hint">
              {create.kind === 'single'
                ? '모티프 하나와 설정을 고른 뒤 화면을 클릭하면, 클릭한 곳에서 전체 화면으로 펼쳐집니다. Spread는 초점, Portal은 소실점이 클릭 지점이 됩니다.'
                : '여러 모티프의 요소를 섞어 새로운 패턴을 만듭니다. 클릭할 때마다 섞는 방법(레시피)이 새로 뽑혀 매번 다른 결과가 나옵니다. 레이어를 골라 아래에서 조정하세요.'}
            </p>
            {create.kind === 'mix' && <MixLayers />}
            <button className="mm-btn" disabled={!create.shot} onClick={s.clearCreate}>Clear (Shift+R)</button>
          </Section>
        )}

        <Section title={`Motif${page === 'create' ? layerName : ''}`}>
          <MotifChips target={target} sequence={sequence} />
          {sequence ? (
            <p className="mm-hint">스크롤하면 Stack → Pull → Wave → Spread → Portal 순으로 이어지고 다시 Stack으로 돌아옵니다. 위로 스크롤하면 거꾸로 진행합니다.</p>
          ) : (
            <MotifOptions target={target} />
          )}
        </Section>

        <Section title="Structure">
          <Slider label="Complexity" value={motif.complexity} min={0} max={100} onChange={(v) => patch({ complexity: v })} />
          {!sequence && <Slider label="Gap" value={motif.gap} min={0} max={40} format={(v) => `${v}px`} onChange={(v) => patch({ gap: v })} />}
        </Section>

        <Section title="Motion">
          <Toggle label="Pause (Space)" value={ui.paused} onChange={s.togglePause} />
          <Slider label="Scroll sensitivity" value={ui.scrollSensitivity} min={0.2} max={3} step={0.1} onChange={s.setScrollSensitivity} />
        </Section>

        <Section title="Color">
          <Slider label="Highlight stop" value={motif.highlightStop} min={0.05} max={0.95} step={0.01} format={pct} onChange={(v) => patch({ highlightStop: v })} />
          <Toggle label="Invert" value={motif.invert} onChange={(v) => patch({ invert: v })} />
          {!sequence && <Toggle label="Cap" value={motif.cap.enabled} onChange={(v) => patch({ cap: { ...motif.cap, enabled: v } })} />}
          {!sequence && motif.cap.enabled && (
            <Slider label="Cap ratio" value={motif.cap.ratio} min={0.05} max={0.5} step={0.01} format={pct} onChange={(v) => patch({ cap: { ...motif.cap, ratio: v } })} />
          )}
          <div className="mm-swatches" aria-label="키 컬러 (잠금)">
            <span style={{ background: 'var(--mm-blue)' }} title="#005BD5" />
            <span style={{ background: 'var(--mm-light)' }} title="#A2F8FF" />
            <span style={{ background: 'var(--mm-cyan)' }} title="#73FCFF" />
            <em>tokens locked</em>
          </div>
        </Section>

        <Section title="Seed & Presets">
          <div className="mm-row">
            <span className="mm-label">Base seed</span>
            <code className="mm-value">{s.baseSeed}</code>
          </div>
          <button className="mm-btn" onClick={s.randomizeSeed}>Randomize (R)</button>
          <label className="mm-field">
            <span className="mm-label">Preset{page === 'create' ? layerName : ''}</span>
            <select
              className="mm-select"
              value=""
              onChange={(e) => {
                const p = PRESETS.find((x) => x.id === e.target.value);
                if (p) s.setMotif(target, p.params);
              }}
            >
              <option value="" disabled>레퍼런스 프리셋 적용…</option>
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.id} — {p.label}</option>
              ))}
            </select>
          </label>
        </Section>

        <Section title="Export" defaultOpen={false}>
          <Pending label="PNG / SVG / Video / URL" phase="P5" />
        </Section>
      </div>
    </aside>
  );
}
