import { useCallback, useEffect, useRef } from "react";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ROOM_PRESENCE } from "@/lib/const";

interface PresenceOptions {
  /** Room a-tag, e.g. "30312:<pubkey>:<d-tag>" */
  roomATag: string | undefined;
  /** Whether the user has their hand raised */
  handRaised: boolean;
  /** Whether the user is currently publishing audio */
  isPublishing: boolean;
  /** Whether the user's mic is muted */
  isMuted: boolean;
  /** Whether the user is on stage (speaker/admin/host) */
  onStage: boolean;
  /** Whether the user declined to publish */
  declinedPublish: boolean;
}

/**
 * Build and auto-publish kind:10312 presence events every 2 minutes.
 * Also publishes immediately on state changes.
 */
export function usePresence(options: PresenceOptions) {
  const { roomATag, handRaised, isPublishing, isMuted, onStage, declinedPublish } = options;
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPublishRef = useRef<string>("");

  const publishPresence = useCallback(() => {
    if (!user || !roomATag) return;

    const tags: string[][] = [
      ["a", roomATag],
      ["hand", handRaised ? "1" : "0"],
      ["publishing", isPublishing ? "1" : "0"],
      ["muted", isMuted ? "1" : "0"],
      ["onstage", onStage ? "1" : "0"],
    ];

    // Create a fingerprint to avoid duplicate publishes
    const fingerprint = tags.map((t) => t.join(":")).join("|");
    const now = Math.floor(Date.now() / 1000);

    // Skip if same state was published less than 30s ago
    if (fingerprint === lastPublishRef.current) return;
    lastPublishRef.current = fingerprint;

    createEvent({
      kind: ROOM_PRESENCE,
      content: "",
      tags,
      created_at: now,
    });
  }, [user, roomATag, handRaised, isPublishing, isMuted, onStage, createEvent]);

  // Publish on state changes
  useEffect(() => {
    if (!user || !roomATag) return;
    publishPresence();
  }, [publishPresence, user, roomATag, handRaised, isPublishing, isMuted, onStage, declinedPublish]);

  // Publish every 2 minutes as heartbeat
  useEffect(() => {
    if (!user || !roomATag) return;

    intervalRef.current = setInterval(() => {
      lastPublishRef.current = ""; // Force republish
      publishPresence();
    }, 120_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, roomATag, publishPresence]);
}
