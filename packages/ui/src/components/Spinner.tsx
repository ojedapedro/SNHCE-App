import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size in tailwind units */
  size?: 'sm' | 'md' | 'lg';
  /** Accessible label (defaults to "Cargando...") */
  label?: string;
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

/**
 * Loading spinner with accessible label.
 * Renders a visually hidden text for screen readers.
 */
const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  label = 'Cargando...',
  className,
  ...props
}) => (
  <span role="status" aria-label={label} className={cn('inline-flex', className)} {...props}>
    <Loader2
      className={cn('animate-spin text-primary-700', sizeMap[size])}
      aria-hidden="true"
    />
    <span className="sr-only">{label}</span>
  </span>
);

Spinner.displayName = 'Spinner';

export { Spinner };
