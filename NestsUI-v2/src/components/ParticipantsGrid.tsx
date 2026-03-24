import { useMemo } from "react";
import { Separator } from "@/components/ui/separator";
import { ParticipantAvatar } from "./ParticipantAvatar";
import { ProfileCard } from "./ProfileCard";
import { useRoomContext } from "./RoomContextProvider";
import { useRemoteParticipantList } from "@/transport";
import { getRoomParticipants } from "@/lib/room";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function ParticipantsGrid() {
  const { event, presenceList, participantReactions } = useRoomContext();
  const { user } = useCurrentUser();
  const remoteParticipants = useRemoteParticipantList();

  const roomParticipants = useMemo(() => getRoomParticipants(event), [event]);

  // Build speaker set from event p-tags with roles + host
  const speakers = useMemo(() => {
    const speakerSet = new Set<string>();
    speakerSet.add(event.pubkey); // host is always a speaker

    for (const p of roomParticipants) {
      if (p.role === "speaker" || p.role === "admin") {
        speakerSet.add(p.pubkey);
      }
    }

    return speakerSet;
  }, [event.pubkey, roomParticipants]);

  // Get role for a pubkey
  const getRole = (pubkey: string): string => {
    if (pubkey === event.pubkey) return "host";
    const p = roomParticipants.find((rp) => rp.pubkey === pubkey);
    return p?.role ?? "";
  };

  // Get presence info for a pubkey
  const getPresenceInfo = (pubkey: string) => {
    const presence = presenceList.find((e) => e.pubkey === pubkey);
    if (!presence) return { handRaised: false, isMuted: true, isPublishing: false };

    return {
      handRaised: presence.tags.find(([t]) => t === "hand")?.[1] === "1",
      isMuted: presence.tags.find(([t]) => t === "muted")?.[1] === "1",
      isPublishing: presence.tags.find(([t]) => t === "publishing")?.[1] === "1",
    };
  };

  // Build the list of all known participants (speakers + remote + presence)
  const allPubkeys = useMemo(() => {
    const set = new Set<string>();
    // Add speakers from event
    for (const pk of speakers) set.add(pk);
    // Add remote audio participants
    for (const rp of remoteParticipants) set.add(rp.pubkey);
    // Add presence participants
    for (const e of presenceList) set.add(e.pubkey);
    return set;
  }, [speakers, remoteParticipants, presenceList]);

  const speakerList = useMemo(
    () => Array.from(allPubkeys).filter((pk) => speakers.has(pk)),
    [allPubkeys, speakers],
  );

  const listenerList = useMemo(
    () => Array.from(allPubkeys).filter((pk) => !speakers.has(pk)),
    [allPubkeys, speakers],
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
