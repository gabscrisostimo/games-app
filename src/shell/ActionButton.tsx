import type { ButtonHTMLAttributes } from 'react';

type Variant = 'positive' | 'neutral' | 'negative';

const styles: Record<Variant, string> = {
  positive: 'bg-good active:brightness-90',
  neutral: 'bg-surface border border-line active:brightness-90',
  negative: 'bg-bad active:brightness-90',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant };

export function ActionButton({ variant = 'neutral', className = '', ...rest }: Props) {
  return (
    <button
      {...rest}
      className={`w-full rounded-2xl py-6 text-2xl font-bold text-ink transition disabled:opacity-40 ${styles[variant]} ${className}`}
    />
  );
}
