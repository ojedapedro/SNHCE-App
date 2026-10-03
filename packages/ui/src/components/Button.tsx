import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

const buttonVariants = cva(
  // Base styles — always applied
  [
    'inline-flex items-center justify-center gap-2',
    'rounded-md font-medium text-sm',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none',
    // WCAG 2.5.5: minimum touch target 44×44px on mobile
    'min-h-[2.75rem] sm:min-h-auto',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-primary-700 text-white',
          'hover:bg-primary-800 active:bg-primary-900',
        ],
        secondary: [
          'bg-neutral-100 text-neutral-800 border border-neutral-200',
          'hover:bg-neutral-200 active:bg-neutral-300',
        ],
        destructive: [
          'bg-danger-600 text-white',
          'hover:bg-danger-700 active:bg-danger-800',
        ],
        outline: [
          'border border-primary-700 text-primary-700 bg-transparent',
          'hover:bg-primary-50 active:bg-primary-100',
        ],
        ghost: [
          'text-neutral-700 bg-transparent',
          'hover:bg-neutral-100 active:bg-neutral-200',
        ],
        link: [
          'text-primary-700 underline-offset-4',
          'hover:underline',
          'min-h-auto p-0',
        ],
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** When true, renders children as the child element (Radix Slot) */
  asChild?: boolean;
  /** Shows a loading spinner and disables interaction */
  isLoading?: boolean;
  /** Accessible loading label (defaults to "Cargando...") */
  loadingText?: string;
}

/**
 * Button component built on Radix Slot for polymorphic usage.
 * Supports primary, secondary, destructive, outline, ghost and link variants.
 * Includes loading state with spinner and full keyboard / screen-reader accessibility.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      loadingText = 'Cargando...',
      disabled,
      children,
      'aria-label': ariaLabel,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    const isDisabled = disabled || isLoading;

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={isLoading}
        aria-label={isLoading ? loadingText : ariaLabel}
        {...props}
      >
        {isLoading && (
          <Loader2
            className="h-4 w-4 animate-spin"
            aria-hidden="true"
          />
        )}
        {children}
      </Comp>
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
