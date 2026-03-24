import { useMemo } from "react";
import { Separator } from "@/components/ui/separator";
import { ParticipantAvatar } from "./ParticipantAvatar";
import { ProfileCard } from "./ProfileCard";
import { useRoomContext } from "./RoomContextProvider";
import { useRemoteParticipantList, useLocalParticipant } from "@/transport";
import { getRoomParticipants } from "@/lib/room";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function ParticipantsGrid() {
  const { event, presenceList, participantReactions, handRaised: localHandRaised } = useRoomContext();
  const { user } = useCurrentUser();
  const remoteParticipants = useRemoteParticipantList();
  const { declinedPublish } = useLocalParticipant();

  const roomParticipants = useMemo(() => getRoomParticipants(event), [event]);

  // Build set of pubkeys that have speaker/admin/host role from p-tags
  const speakerPubkeys = useMemo(() => {
    const set = new Set<string>();
    set.add(event.pubkey); // host is always a speaker
    for (const p of roomParticipants) {
      if (p.role === "speaker" || p.role === "admin") {
        set.add(p.pubkey);
      }
    }
    return set;
  }, [event.pubkey, roomParticipants]);

  // Build set of pubkeys who have voluntarily left the stage
  // (local user via declinedPublish, remote users via presence ["onstage", "0"] tag)
  const declinedStageSet = useMemo(() => {
    const declined = new Set<string>();
    if (user && declinedPublish) {
      declined.add(user.pubkey);
    }
    for (const p of presenceList) {
      const onstageTag = p.tags.find(([t]) => t === "onstage")?.[1];
      if (onstageTag === "0") {
        declined.add(p.pubkey);
      }
    }
    return declined;
  }, [user, declinedPublish, presenceList]);

  // Get role for a pubkey
  const getRole = (pubkey: string): string => {
    if (pubkey === event.pubkey) return "host";
    const p = roomParticipants.find((rp) => rp.pubkey === pubkey);
    return p?.role ?? "";
  };

  // For the local user, use optimistic local state instead of waiting for relay round-trip
  const { isMicEnabled: localMicEnabled, isPublishing: localIsPublishing } = useLocalParticipant();

  const getPresenceInfo = (pubkey: string) => {
    // Optimistic: use local state for the current user
    if (user && pubkey === user.pubkey) {
      return {
        handRaised: localHandRaised,
        isMuted: !localMicEnabled,
        isPublishing: localIsPublishing,
      };
    }
    // Remote users: read from presence events
    const presence = presenceList.find((e) => e.pubkey === pubkey);
    if (!presence) return { handRaised: false, isMuted: true, isPublishing: false };
    return {
      handRaised: presence.tags.find(([t]) => t === "hand")?.[1] === "1",
      isMuted: presence.tags.find(([t]) => t === "muted")?.[1] === "1",
      isPublishing: presence.tags.find(([t]) => t === "publishing")?.[1] === "1",
    };
  };

  // Build the list of all known participants
  const allPubkeys = useMemo(() => {
    const set = new Set<string>();
    for (const pk of speakerPubkeys) set.add(pk);
    for (const rp of remoteParticipants) set.add(rp.pubkey);
    for (const e of presenceList) set.add(e.pubkey);
    return set;
  }, [speakerPubkeys, remoteParticipants, presenceList]);

  // Speakers: have a speaker p-tag AND haven't declined the stage
  const activeSpeakerSet = useMemo(() => {
    return new Set(
      Array.from(allPubkeys).filter(
        (pk) => speakerPubkeys.has(pk) && !declinedStageSet.has(pk),
      ),
    );
  }, [allPubkeys, speakerPubkeys, declinedStageSet]);

  const speakerList = useMemo(
    () => Array.from(allPubkeys).filter((pk) => activeSpeakerSet.has(pk)),
    [allPubkeys, activeSpeakerSet],
  );

  const listenerList = useMemo(
    () => Array.from(allPubkeys).filter((pk) => !activeSpeakerSet.has(pk)),
    [allPubkeys, activeSpeakerSet],
  );

  return (
    <div className="flex flex-col gap-6 md:gap-8 p-4 md:p-6">
      {/* Speakers */}
      {speakerList.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Speakers
          </h3>
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 justify-items-center">
            {speakerList.map((pubkey) => {
              const presence = getPresenceInfo(pubkey);
              const role = getRole(pubkey);
              const remote = remoteParticipants.find((rp) => rp.pubkey === pubkey);

              return (
                <ProfileCard key={pubkey} pubkey={pubkey} roomEvent={event}>
                  <ParticipantAvatar
                    pubkey={pubkey}
                    role={role}
                    isPublishing={remote?.isPublishing ?? presence.isPublishing}
                    isMuted={presence.isMuted}
                    handRaised={presence.handRaised}
                    reaction={participantReactions.get(pubkey)}
                    size="lg"
                  />
                </ProfileCard>
              );
            })}
          </div>
        </div>
      )}

      {/* Separator */}
      {listenerList.length > 0 && speakerList.length > 0 && (
        <Separator className="bg-border/50" />
      )}

      {/* Listeners */}
      {listenerList.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Listeners {listenerList.length > 0 && `(${listenerList.length})`}
          </h3>
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5 justify-items-center">
            {listenerList.map((pubkey) => {
              const presence = getPresenceInfo(pubkey);

              return (
                <ProfileCard key={pubkey} pubkey={pubkey} roomEvent={event}>
                  <ParticipantAvatar
                    pubkey={pubkey}
                    handRaised={presence.handRaised}
                    reaction={participantReactions.get(pubkey)}
                    size="md"
                  />
                </ProfileCard>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {allPubkeys.size === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No participants yet</p>
          <p className="text-sm mt-1">Be the first to join!</p>
        </div>
      )}
    </div>
  );
}
