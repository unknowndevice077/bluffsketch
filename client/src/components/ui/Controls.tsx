import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ label, description, checked, onChange, disabled }: ToggleProps) {
  return (
    <label className={cn('flex min-h-[44px] items-center justify-between gap-3', disabled ? 'cursor-default' : 'cursor-pointer')}>
      <span className="min-w-0">
        <span className="block font-hand text-xl leading-tight">{label}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-8 w-14 shrink-0 rounded-full border-[3px] border-ink transition-colors disabled:opacity-60',
          checked ? 'bg-mint' : 'bg-card',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full border-2 border-ink bg-card transition-all',
            checked ? 'left-[26px]' : 'left-0.5',
          )}
        />
      </button>
    </label>
  );
}

interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function Stepper({ label, value, min, max, step = 1, suffix = '', onChange, disabled }: StepperProps) {
  const set = (next: number) => onChange(Math.min(max, Math.max(min, next)));
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-3">
      <span className="font-hand text-xl">{label}</span>
      <div className="flex items-center gap-1" role="group" aria-label={label}>
        <button
          type="button"
          className="btn btn-ghost !min-w-[44px] !px-0"
          onClick={() => set(value - step)}
          disabled={disabled || value <= min}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <output className="w-16 text-center font-display text-2xl" aria-live="polite">
          {value}
          {suffix}
        </output>
        <button
          type="button"
          className="btn btn-ghost !min-w-[44px] !px-0"
          onClick={() => set(value + step)}
          disabled={disabled || value >= max}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  options: readonly { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  hideLabel?: boolean;
}

export function Segmented<T extends string>({ label, options, value, onChange, disabled, hideLabel }: SegmentedProps<T>) {
  return (
    <div className="flex flex-col gap-1">
      <span className={cn('font-hand text-xl', hideLabel && 'sr-only')}>{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn('btn !px-3 !text-lg', value === option.value ? 'btn-secondary' : 'btn-ghost')}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
