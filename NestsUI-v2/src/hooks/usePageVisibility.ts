import { useEffect, useState, useCallback } from "react";

/**
 * Hook to detect page visibility changes.
 * Useful for handling mobile screen sleep/wake and tab switching.
 */
export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const [lastVisibleTime, setLastVisibleTime] = useState(Date.now());

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      if (visible) {
        setLastVisibleTime(Date.now());
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return { isVisible, lastVisibleTime };
}

/**
 * Hook that calls a callback when the page becomes visible.
 * Useful for reconnecting or refreshing data after mobile wake.
 */
export function useOnPageVisible(callback: () => void, deps: React.DependencyList = []) {
  const { isVisible } = usePageVisibility();
  const [wasHidden, setWasHidden] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setWasHidden(true);
    } else if (wasHidden) {
      // Page just became visible after being hidden
      callback();
      setWasHidden(false);
    }
  }, [isVisible, wasHidden, callback, ...deps]);
}

/**
 * Hook that triggers reconnection logic when the page becomes visible
 * after being hidden for a certain amount of time.
 */
export function useReconnectOnWake(
  onReconnect: () => void | Promise<void>,
  options: { minHiddenTime?: number } = {}
) {
  const { minHiddenTime = 5000 } = options; // Default 5 seconds
  const [hiddenAt, setHiddenAt] = useState<number | null>(null);
  const { isVisible } = usePageVisibility();

  const handleReconnect = useCallback(async () => {
    try {
      await onReconnect();
    } catch (e) {
      console.error("Reconnect on wake failed:", e);
    }
  }, [onReconnect]);

  useEffect(() => {
    if (!isVisible) {
      // Page became hidden, record the time
      setHiddenAt(Date.now());
    } else if (hiddenAt !== null) {
      // Page became visible, check if we were hidden long enough
      const hiddenDuration = Date.now() - hiddenAt;
      if (hiddenDuration >= minHiddenTime) {
        console.debug(`Page was hidden for ${hiddenDuration}ms, triggering reconnect`);
        handleReconnect();
      }
      setHiddenAt(null);
    }
  }, [isVisible, hiddenAt, minHiddenTime, handleReconnect]);
}
