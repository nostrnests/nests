import { useUserProfile } from "@snort/system-react";
import Icon from "../icon";
import Avatar from "./avatar";
import { unixNow } from "@snort/shared";
import { useUserPresence } from "../hooks/useRoomPresence";
import { NostrEvent, NostrLink } from "@snort/system";
import ProfileCard from "./profile-card";
import useHoverMenu from "../hooks/useHoverMenu";
import { useUserRoomReactions } from "../hooks/useRoomReactions";
import { useEffect, useMemo, useRef } from "react";
import { useNostrRoom } from "../hooks/nostr-room-context";
import { FormattedMessage } from "react-intl";
import DisplayName from "./display-name";
import ZapButton from "./zap-button";
import { useHand, useLogin } from "../login";
import { useRemoteParticipantList, useLocalParticipant, useConnectionState } from "../transport";
import { ParticipantRole } from "../const";

export default function NostrParticipants({ event }: { event: NostrEvent }) {
  const remoteParticipants = useRemoteParticipantList();
  const login = useLogin();
  const { presence } = useNostrRoom();

  // Determine who is a speaker from the event's p tags
  const getSpeakerPubkeys = useMemo(() => {
    const speakers = new Set<string>();
    // Host is always a speaker
    speakers.add(event.pubkey);
    for (const tag of event.tags) {
      if (tag[0] === "p") {
        const role = tag[3];
        if (
          role === ParticipantRole.SPEAKER ||
          role === ParticipantRole.ADMIN ||
          role === ParticipantRole.HOST
        ) {
          speakers.add(tag[1]);
        }
      }
    }
    return speakers;
  }, [event]);

  // Build participant list from three sources:
  // 1. Local user (always shown if logged in)
  // 2. MoQ remote participants (discovered via announcements -- only publishers)
  // 3. Nostr presence events (all users in the room, including listeners)
  const allPubkeys = useMemo(() => {
    const seen = new Set<string>();
    const pubkeys: string[] = [];

    const addPubkey = (pk: string) => {
      if (!pk || seen.has(pk)) return;
      seen.add(pk);
      pubkeys.push(pk);
    };

    // Local user first
    if (login.pubkey) {
      addPubkey(login.pubkey);
    }

    // MoQ remote participants (publishers)
    for (const p of remoteParticipants) {
      addPubkey(p.pubkey);
    }

    // Nostr presence events (listeners + speakers who sent presence)
    for (const p of presence) {
      addPubkey(p.pubkey);
    }

    return pubkeys;
  }, [remoteParticipants, login.pubkey, presence]);

  const speakers = allPubkeys.filter((pk) => getSpeakerPubkeys.has(pk));
  const listeners = allPubkeys.filter((pk) => !getSpeakerPubkeys.has(pk));

  return (
    <>
      <div className="grid lg:grid-cols-4 max-lg:grid-cols-3 gap-4 content-evenly">
        {speakers.map((pubkey) => (
          <NostrParticipant
            key={pubkey}
            pubkey={pubkey}
            event={event}
            isSpeaker={true}
            isMe={pubkey === login.pubkey}
          />
        ))}
      </div>
      <div className="h-[1px] bg-foreground w-full"></div>
      <div className="grid lg:grid-cols-4 max-lg:grid-cols-3 gap-4 content-evenly">
        {listeners.map((pubkey) => (
          <NostrParticipant
            key={pubkey}
            pubkey={pubkey}
            event={event}
            isSpeaker={false}
            isMe={pubkey === login.pubkey}
          />
        ))}
      </div>
    </>
  );
}

function NostrParticipant({
  pubkey,
  event,
  isSpeaker,
  isMe,
}: {
  pubkey: string;
  event: NostrEvent;
  isSpeaker: boolean;
  isMe: boolean;
}) {
  const isGuest = pubkey.startsWith("guest-") || pubkey === "";
  const profile = useUserProfile(isGuest ? undefined : pubkey);
  const presence = useUserPresence(pubkey);
  const reactions = useUserRoomReactions(pubkey);
  const { isMicEnabled, isPublishing, publishMicrophone, declinedPublish, resetDeclinedPublish } = useLocalParticipant();
  const connectionState = useConnectionState();
  const link = useMemo(() => NostrLink.fromEvent(event), [event]);
  const { active: handRaised, toggleHand } = useHand(link);

  // Track previous speaker state to detect fresh promotion
  const wasOnStageRef = useRef(isSpeaker);

  // Reset declined flag when freshly promoted (host re-added to stage)
  useEffect(() => {
    if (isMe && isSpeaker && !wasOnStageRef.current) {
      resetDeclinedPublish();
    }
    wasOnStageRef.current = isSpeaker;
  }, [isMe, isSpeaker, resetDeclinedPublish]);

  useEffect(() => {
    if (isMe && isSpeaker && connectionState === "connected" && !declinedPublish) {
      // Auto-publish mic when promoted to speaker and transport is connected
      if (!isPublishing) {
        publishMicrophone().catch((e) =>
          console.error("Failed to publish microphone:", e),
        );
      }

      // Auto-lower hand when moved to stage
      if (handRaised) {
        toggleHand();
      }
    }
  }, [isMe, isSpeaker, isPublishing, connectionState, declinedPublish, handRaised, toggleHand, publishMicrophone]);

  const { handleMouseEnter, handleMouseLeave, isHovering } = useHoverMenu();

  const isHandRaised = Boolean(presence?.tags.find((a) => a[0] === "hand")?.[1]);
  const isHost = event.pubkey === pubkey;
  const isAdmin = event.tags.some(
    (t) => t[0] === "p" && t[1] === pubkey && t[3] === ParticipantRole.ADMIN,
  );
  const reaction = reactions
    ?.filter((a) => a.created_at > unixNow() - 10)
    ?.sort((a, b) => (a.created_at > b.created_at ? -1 : 1))?.[0];

  function getRole() {
    if (isHost) {
      return (
        <div className="text-primary">
          <FormattedMessage defaultMessage="Host" />
        </div>
      );
    } else if (isAdmin) {
      return (
        <div className="text-primary">
          <FormattedMessage defaultMessage="Moderator" />
        </div>
      );
    } else if (isSpeaker) {
      return (
        <div>
          <FormattedMessage defaultMessage="Speaker" />
        </div>
      );
    }
  }

  // Determine mic state for display
  const showMicIcon = isMe ? isPublishing : isSpeaker;
  const micEnabled = isMe ? isMicEnabled : true; // We can't know remote mic state yet

  return (
    <div className="flex items-center flex-col gap-2" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="relative">
        {reaction && (
          <div key={reaction.id} className="absolute w-[72px] h-[72px] flex items-center justify-center text-3xl react">
            {reaction.content}
          </div>
        )}
        {isHandRaised && (
          <div className="absolute w-[72px] h-[72px]">
            <div className="bg-foreground rounded-full inline-block w-10 h-10 -mt-4 -ml-4 flex items-center justify-center">
              <Icon name="hand" size={25} />
            </div>
          </div>
        )}
        {(profile?.lud16 || profile?.lud06) && (
          <div className="absolute w-[72px] h-[72px] rotate-[80deg]">
            <div className="inline-block mt-[-8px] ml-[-8px]">
              <ZapButton pubkey={pubkey} iconClass="rotate-[-80deg]" iconSize={32} event={event} />
            </div>
          </div>
        )}
        {showMicIcon && (
          <div className="absolute w-[72px] h-[72px] rotate-[135deg]">
            <div className="bg-foreground rounded-full inline-block mt-[-4px] ml-[-4px] w-8 h-8 flex items-center justify-center">
              <div className="flex items-center justify-center relative rotate-[-135deg] w-full h-full overflow-hidden rounded-full">
                <Icon name={micEnabled ? "mic" : "mic-off"} className="z-20" size={20} />
                {/* TODO: VU meter needs MediaStreamTrack - will integrate when transport exposes it */}
              </div>
            </div>
          </div>
        )}
        <Avatar pubkey={pubkey} size={72} className={""} link={false} />
        {isHovering && !isGuest && <ProfileCard pubkey={pubkey} />}
      </div>
      <div className={`text-center ${isHost ? "text-primary" : ""}`}>
        {isGuest ? (
          isMe ? (
            <FormattedMessage defaultMessage="Guest (me)" />
          ) : (
            <FormattedMessage defaultMessage="Guest" />
          )
        ) : (
          <DisplayName pubkey={pubkey} profile={profile} />
        )}
        {getRole()}
      </div>
    </div>
  );
}
