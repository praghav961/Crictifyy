import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export function NetworkStatus({ hasPendingWrites }: { hasPendingWrites?: boolean }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error/10 text-error border border-error/20 text-xs font-bold">
        <WifiOff className="w-3.5 h-3.5" />
        OFFLINE
      </div>
    );
  }

  if (hasPendingWrites) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/10 text-warning border border-warning/20 text-xs font-bold">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        SYNCING
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success border border-success/20 text-xs font-bold">
      <CheckCircle2 className="w-3.5 h-3.5" />
      SYNCED
    </div>
  );
}
