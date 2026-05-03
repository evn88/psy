'use client';

import { useHeartbeat } from '@/lib/hooks/use-heartbeat';

export function HeartbeatProvider({ children }: { children: React.ReactNode }) {
  useHeartbeat();
  return <>{children}</>;
}
