// Design-system primitives: Card, Button, SegmentedControl, Chip, Field.
// Sheet lives in its own file (it pulls in framer-motion).

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import type { Band } from '../core/scoring';
import s from './ui.module.css';

export function Card({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={className ? `${s.card} ${className}` : s.card} {...rest} />;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost';
}

export function Button({ variant = 'primary', className, ...rest }: ButtonProps) {
  const base = variant === 'primary' ? s.primary : s.ghost;
  return <button className={className ? `${base} ${className}` : base} {...rest} />;
}

interface SegmentedProps<V extends string | number> {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
  ariaLabel?: string;
}

export function Segmented<V extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedProps<V>) {
  return (
    <div className={s.seg} role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          className={o.value === value ? `${s.segBtn} ${s.on}` : s.segBtn}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const CHIP_BY_BAND: Record<Band, string> = { g: s.chipG!, y: s.chipY!, r: s.chipR! };

export function BandChip({ band, children }: { band: Band | null; children: ReactNode }) {
  return <span className={band ? CHIP_BY_BAND[band] : s.chipMuted}>{children}</span>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={s.field}>
      <span className={s.fieldLabel}>{label}</span>
      {children}
    </div>
  );
}

export { s as uiCss };
