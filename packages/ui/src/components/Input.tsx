import * as React from 'react';
import { cn } from '../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Accessible error message to display below input */
  errorMessage?: string;
  /** Helper text shown below input when no error */
  helperText?: string;
}

/**
 * Input component compliant with WCAG 2.1 AA.
 * Renders error messages linked via aria-describedby for screen readers.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', errorMessage, helperText, id, ...props }, ref) => {
    const descriptionId = id ? `${id}-description` : undefined;
    const hasError = Boolean(errorMessage);

    return (
      <div className="w-full">
        <input
          ref={ref}
          id={id}
          type={type}
          aria-describedby={descriptionId}
          aria-invalid={hasError}
          className={cn(
            'flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm',
            'placeholder:text-neutral-400',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500',
            hasError
              ? 'border-danger-500 focus-visible:ring-danger-500'
              : 'border-neutral-300',
            className,
          )}
          {...props}
        />
        {(errorMessage || helperText) && (
          <p
            id={descriptionId}
            className={cn(
              'mt-1 text-xs',
              hasError ? 'text-danger-600' : 'text-neutral-500',
            )}
            role={hasError ? 'alert' : undefined}
          >
            {errorMessage ?? helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export { Input };
