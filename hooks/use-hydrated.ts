import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** true only on the client after hydration — for client-only widgets (charts, etc.). */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
