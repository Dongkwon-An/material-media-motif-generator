import { editedMotif, useStore, type EditTarget } from '../../store';
import { Segmented, Slider, pct } from './controls';

// 모티프별 하위 옵션 (명세 6.1). target이 가리키는 모티프를 편집한다.
export function MotifOptions({ target }: { target: EditTarget }) {
  const m = useStore((s) => editedMotif(s, target));
  const patchMotif = useStore((s) => s.patchMotif);
  const patch = (p: Record<string, unknown>) => patchMotif(target, p);
  const clickHint = target === 'create' ? ' (클릭 지점)' : '';

  switch (m.type) {
    case 'stack':
      return (
        <Slider label="Columns (좌·우 분할)" value={m.splits} min={1} max={4} onChange={(v) => patch({ splits: v })} />
      );
    case 'pull':
      return (
        <>
          <Segmented label="View" value={m.view} options={['top', 'side'] as const} onChange={(v) => patch({ view: v })} />
          <Segmented label="Curve" value={m.curve} options={['linear', 'exp'] as const} onChange={(v) => patch({ curve: v })} />
          {m.view === 'side' && (
            <Segmented label="Align" value={m.align} options={['left', 'right'] as const} onChange={(v) => patch({ align: v })} />
          )}
          <Slider label="Growth" value={m.growth} min={0.05} max={1} step={0.05} format={pct} onChange={(v) => patch({ growth: v })} />
        </>
      );
    case 'wave':
      return (
        <>
          <Segmented label="Orientation" value={m.orientation} options={['vertical', 'horizontal'] as const} onChange={(v) => patch({ orientation: v })} />
          <Segmented label="Shape" value={m.shape} options={['flat', 'alternate', 'arc', 'sine'] as const} onChange={(v) => patch({ shape: v })} />
          <Slider label="Amplitude" value={m.amplitude} min={0} max={0.3} step={0.01} format={pct} onChange={(v) => patch({ amplitude: v })} />
          {m.shape === 'sine' && (
            <Slider label="Frequency" value={m.frequency} min={0.5} max={4} step={0.25} onChange={(v) => patch({ frequency: v })} />
          )}
          <Slider label="Phase speed" value={m.phaseSpeed} min={0} max={3} step={0.1} onChange={(v) => patch({ phaseSpeed: v })} />
        </>
      );
    case 'spread':
      return (
        <>
          <Slider label={`Focus X${clickHint}`} value={m.focus.x} min={0} max={1} step={0.01} format={pct} onChange={(v) => patch({ focus: { ...m.focus, x: v } })} />
          <Slider label={`Focus Y${clickHint}`} value={m.focus.y} min={0} max={1} step={0.01} format={pct} onChange={(v) => patch({ focus: { ...m.focus, y: v } })} />
          <Slider label="Compression" value={m.compression} min={0} max={1} step={0.01} format={pct} onChange={(v) => patch({ compression: v })} />
        </>
      );
    case 'portal':
      return (
        <>
          <Segmented label="Axis" value={m.axis} options={['cols', 'rows'] as const} onChange={(v) => patch({ axis: v })} />
          <Slider label="Splits" value={m.splits} min={0} max={6} onChange={(v) => patch({ splits: v })} />
          <Slider label={`Vanish X${clickHint}`} value={m.vanish.x} min={0} max={1} step={0.01} format={pct} onChange={(v) => patch({ vanish: { ...m.vanish, x: v } })} />
          <Slider label={`Vanish Y${clickHint}`} value={m.vanish.y} min={0} max={1} step={0.01} format={pct} onChange={(v) => patch({ vanish: { ...m.vanish, y: v } })} />
          <Slider label="Compression" value={m.compression} min={0} max={1} step={0.01} format={pct} onChange={(v) => patch({ compression: v })} />
          <Segmented label="Flow" value={m.flow} options={['in', 'out'] as const} onChange={(v) => patch({ flow: v })} />
          <Slider label="Flow speed" value={m.flowSpeed} min={0} max={1} step={0.01} onChange={(v) => patch({ flowSpeed: v })} />
        </>
      );
  }
}
