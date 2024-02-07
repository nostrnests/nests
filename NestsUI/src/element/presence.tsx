import { useEffect } from "react";
import usePresence from "../hooks/usePresence";
import { NostrLink } from "@snort/system";

export default function RoomPresence({ link }: { link: NostrLink }) {
  const { sendPresence, interval } = usePresence(link);

  useEffect(() => {
    sendPresence();
    const t = setInterval(async () => {
      await sendPresence();
    }, interval * 1000);
    return () => clearInterval(t);
  }, [link, interval, sendPresence]);

  return null;
}
