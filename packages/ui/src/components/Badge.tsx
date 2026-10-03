import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:     'bg-neutral-100 text-neutral-800',
        primary:     'bg-primary-100 text-primary-800',
        success:     'bg-success-100 text-success-800',
        warning:     'bg-warning-100 text-warning-800',
        destructive: 'bg-danger-100 text-danger-800',
        outline:     'border border-neutral-300 text-neutral-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * Badge for status labels, counts, and category tags.
 */
const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
  ),
);

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
