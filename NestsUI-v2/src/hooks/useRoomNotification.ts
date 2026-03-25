import { useEffect, useRef } from "react";

/**
 * Show a persistent browser notification while the user is in a room.
 * Helps users know audio is active when the tab is backgrounded.
 */
export function useRoomNotification(roomTitle: string, enabled: boolean) {
  const notifRef = useRef<Notification | null>(null);

  useEffect(() => {
    if (!enabled || !("Notification" in window)) return;

    const show = async () => {
      // Only request permission if not already granted
      if (Notification.permission === "default") {
        const result = await Notification.requestPermission();
        if (result !== "granted") return;
      }
      if (Notification.permission !== "granted") return;

      notifRef.current = new Notification("Nests", {
        body: `In room: ${roomTitle}`,
        icon: "/favicon.svg",
        tag: "nests-room-active",
        silent: true,
        requireInteraction: true,
      });

      // Clicking the notification focuses the tab
      notifRef.current.onclick = () => {
        window.focus();
        notifRef.current?.close();
      };
    };

    show();

    return () => {
      notifRef.current?.close();
      notifRef.current = null;
    };
  }, [roomTitle, enabled]);
}
