// src/shell/ActionButton.tsx
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'positive' | 'neutral' | 'negative';

const styles: Record<Variant, string> = {
  positive: 'bg-emerald-600 active:bg-emerald-700',
  neutral: 'bg-slate-600 active:bg-slate-700',
  negative: 'bg-rose-600 active:bg-rose-700',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant };

export function ActionButton({ variant = 'neutral', className = '', ...rest }: Props) {
  return (
    <button
      {...rest}
      className={`w-full rounded-2xl py-6 text-2xl font-bold text-white disabled:opacity-40 ${styles[variant]} ${className}`}
    />
  );
}
