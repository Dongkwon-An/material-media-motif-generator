import { useState, type ReactNode } from 'react';

export function Section({ title, children, defaultOpen = true }: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mm-section">
      <button className="mm-section__head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span className="mm-section__mark" aria-hidden>{open ? '−' : '+'}</span>
      </button>
      {open && <div className="mm-section__body">{children}</div>}
    </section>
  );
}

/** 아직 연결되지 않은 컨트롤 자리 표시 (연결 단계 표기) */
export function Pending({ label, phase }: { label: string; phase: string }) {
  return (
    <div className="mm-row mm-row--pending">
      <span className="mm-label">{label}</span>
      <span className="mm-tag">{phase}</span>
    </div>
  );
}
