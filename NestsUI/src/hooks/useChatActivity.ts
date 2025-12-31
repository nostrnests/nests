import { EventKind, NostrLink, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LIVE_CHAT } from "../const";

/**
 * Hook to track chat activity and detect new messages.
 * Returns hasNewMessages which is true when there are unseen messages.
 */
export function useChatActivity(link: NostrLink, isViewing: boolean) {
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const lastSeenCountRef = useRef(0);
  const isFirstLoadRef = useRef(true);

  const sub = useMemo(() => {
    const rb = new RequestBuilder(`chat-activity:${link.id}`);
    rb.withOptions({ leaveOpen: true }).withFilter().kinds([LIVE_CHAT, EventKind.ZapReceipt]).replyToLink([link]);
    return rb;
  }, [link]);

  const messages = useRequestBuilder(sub);
  const messageCount = messages.length;

  // When viewing (panel expanded), mark all as seen
  useEffect(() => {
    if (isViewing) {
      lastSeenCountRef.current = messageCount;
      setHasNewMessages(false);
    }
  }, [isViewing, messageCount]);

  // Detect new messages when not viewing
  useEffect(() => {
    // Skip the first load to avoid showing indicator on initial render
    if (isFirstLoadRef.current) {
      if (messageCount > 0) {
        lastSeenCountRef.current = messageCount;
        isFirstLoadRef.current = false;
      }
      return;
    }

    if (!isViewing && messageCount > lastSeenCountRef.current) {
      setHasNewMessages(true);
    }
  }, [messageCount, isViewing]);

  return { hasNewMessages, newMessageCount: messageCount - lastSeenCountRef.current };
}
