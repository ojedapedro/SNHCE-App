import * as React from 'react';
import { cn } from '../lib/utils';

export type ConnectionState = 'online' | 'offline' | 'syncing';

export interface ConnectionStatusProps {
  /** Override the detected state (useful for controlled mode) */
  state?: ConnectionState;
  /** Extra CSS classes */
  className?: string;
  /** Whether to auto-hide the "Conectado" banner after N ms (0 = never hide) */
  autoHideOnlineMs?: number;
}

/**
 * Connection status banner.
 *
 * - Offline  → persistent red banner (🔴)
 * - Syncing  → blue banner with spinner (🔄)
 * - Online   → green banner that auto-hides after `autoHideOnlineMs` ms (🟢)
 *
 * Accessibility: role="status" + aria-live="polite" so screen readers
 * announce state changes without interrupting ongoing speech.
 */
const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  state: controlledState,
  className,
  autoHideOnlineMs = 3000,
}) => {
  const [detectedState, setDetectedState] = React.useState<ConnectionState>(
    navigator.onLine ? 'online' : 'offline',
  );
  const [visible, setVisible] = React.useState(!navigator.onLine);
  const hideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentState = controlledState ?? detectedState;

  // Listen for browser network events
  React.useEffect(() => {
    if (controlledState) return; // controlled mode — skip listeners

    const handleOnline = () => {
      setDetectedState('online');
      setVisible(true);
      if (autoHideOnlineMs > 0) {
        hideTimerRef.current = setTimeout(() => setVisible(false), autoHideOnlineMs);
      }
    };

    const handleOffline = () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setDetectedState('offline');
      setVisible(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [controlledState, autoHideOnlineMs]);

  // Show immediately when transitioning to syncing (controlled)
  React.useEffect(() => {
    if (controlledState === 'syncing') setVisible(true);
    if (controlledState === 'online' && autoHideOnlineMs > 0) {
      setVisible(true);
      hideTimerRef.current = setTimeout(() => setVisible(false), autoHideOnlineMs);
    }
  }, [controlledState, autoHideOnlineMs]);

  if (!visible) return null;

  const config: Record<ConnectionState, { icon: string; message: string; classes: string }> = {
    offline: {
      icon: '🔴',
      message: 'Sin conexión — Los cambios se guardarán cuando se restablezca la conexión',
      classes: 'bg-danger-50 border-danger-200 text-danger-800',
    },
    syncing: {
      icon: '🔄',
      message: 'Sincronizando...',
      classes: 'bg-primary-50 border-primary-200 text-primary-800',
    },
    online: {
      icon: '🟢',
      message: 'Conectado',
      classes: 'bg-success-50 border-success-200 text-success-800',
    },
  };

  const { icon, message, classes } = config[currentState];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'flex items-center gap-2 border-b px-4 py-2 text-sm font-medium',
        'transition-all duration-300',
        classes,
        className,
      )}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{message}</span>
    </div>
  );
};

ConnectionStatus.displayName = 'ConnectionStatus';

export { ConnectionStatus };
