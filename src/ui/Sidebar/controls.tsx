// 사이드바 공용 컨트롤 (브랜드 톤: 얇은 blue 라인, 모노스페이스 라벨)

export function Slider({ label, value, min, max, step = 1, format = String, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange(v: number): void;
}) {
  return (
    <label className="mm-row mm-slider">
      <span className="mm-label">{label}</span>
      <span className="mm-value">{format(value)}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: readonly T[];
  onChange(v: T): void;
}) {
  return (
    <div className="mm-field">
      <span className="mm-label">{label}</span>
      <div className="mm-seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o} aria-pressed={o === value} onClick={() => onChange(o)}>{o}</button>
        ))}
      </div>
    </div>
  );
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange(v: boolean): void }) {
  return (
    <button className="mm-row mm-toggle" role="switch" aria-checked={value} onClick={() => onChange(!value)}>
      <span className="mm-label">{label}</span>
      <span className="mm-value">{value ? 'ON' : 'OFF'}</span>
    </button>
  );
}

export const pct = (v: number) => `${Math.round(v * 100)}%`;
