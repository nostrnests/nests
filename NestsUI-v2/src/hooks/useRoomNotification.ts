import { useEffect, useRef } from "react";

/**
 * Show a browser notification only when the tab is backgrounded while in a room.
 * Clears when the tab comes back to focus.
 */
export function useRoomNotification(roomTitle: string, enabled: boolean) {
  const notifRef = useRef<Notification | null>(null);

  useEffect(() => {
    if (!enabled || !("Notification" in window)) return;

    const show = () => {
      if (Notification.permission !== "granted") return;
      if (notifRef.current) return; // already showing

      notifRef.current = new Notification("Nests", {
        body: `In room: ${roomTitle}`,
        icon: "/favicon.svg",
        tag: "nests-room-active",
        silent: true,
        requireInteraction: true,
      });

      notifRef.current.onclick = () => {
        window.focus();
        notifRef.current?.close();
        notifRef.current = null;
      };
    };

    const hide = () => {
      notifRef.current?.close();
      notifRef.current = null;
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        show();
      } else {
        hide();
      }
    };

    // Request permission quietly on first use
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      hide();
    };
  }, [roomTitle, enabled]);
}
