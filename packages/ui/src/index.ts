// Shared UI component library barrel export
// All components are built on Radix UI primitives for WCAG 2.1 AA compliance

export { Button } from './components/Button';
export type { ButtonProps } from './components/Button';

export { Input } from './components/Input';
export type { InputProps } from './components/Input';

export { Label } from './components/Label';
export type { LabelProps } from './components/Label';

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from './components/Select';

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from './components/Dialog';

export { Toast, ToastProvider, ToastViewport, ToastTitle, ToastDescription, ToastClose, ToastAction } from './components/Toast';

export { Badge } from './components/Badge';
export type { BadgeProps } from './components/Badge';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './components/Card';

export { Spinner } from './components/Spinner';
export type { SpinnerProps } from './components/Spinner';

export { ConnectionStatus } from './components/ConnectionStatus';
export type { ConnectionStatusProps } from './components/ConnectionStatus';

// Utility
export { cn } from './lib/utils';
