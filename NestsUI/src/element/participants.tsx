import { useParticipantPermissions, useParticipants } from "@livekit/components-react";
import { useUserProfile } from "@snort/system-react";
import { LocalParticipant, RemoteParticipant, RoomEvent, Track } from "livekit-client";
import Icon from "../icon";
import Avatar from "./avatar";
import { unixNow } from "@snort/shared";
import { useUserPresence } from "../hooks/useRoomPresence";
import { NostrEvent, NostrLink } from "@snort/system";
import ProfileCard from "./profile-card";
import useHoverMenu from "../hooks/useHoverMenu";
import { useUserRoomReactions } from "../hooks/useRoomReactions";
import { useState } from "react";
import ZapFlow from "./zap-modal";
import { useNostrRoom } from "../hooks/nostr-room-context";
import { FormattedMessage } from "react-intl";
import DisplayName from "./display-name";
import VuBar from "./vu";

export default function NostrParticipants({ event }: { event: NostrEvent }) {
  const participants = useParticipants({
    updateOnlyOn: [
      RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected,
      RoomEvent.ParticipantPermissionsChanged,
      RoomEvent.TrackMuted,
      RoomEvent.TrackPublished,
      RoomEvent.TrackUnmuted,
      RoomEvent.TrackUnmuted,
    ],
  });

  return (
    <>
      <div className="grid lg:grid-cols-4 max-lg:grid-cols-3 gap-4 content-evenly">
        {participants
          .filter((a) => a.permissions?.canPublish)
          .map((a) => {
            return <NostrParticipant p={a} key={a.sid} event={event} />;
          })}
      </div>
      <div className="h-[1px] bg-foreground w-full"></div>
      <div className="grid lg:grid-cols-4 max-lg:grid-cols-3 gap-4 content-evenly">
        {participants
          .filter((a) => !a.permissions?.canPublish)
          .map((a) => {
            return <NostrParticipant p={a} key={a.sid} event={event} />;
          })}
      </div>
    </>
  );
}

function NostrParticipant({ p, event }: { p: RemoteParticipant | LocalParticipant; event: NostrEvent }) {
  const isGuest = p.identity.startsWith("guest-");
  const isMe = p instanceof LocalParticipant;
  const profile = useUserProfile(isGuest ? undefined : p.identity);
  const [zapping, setZapping] = useState(false);
  const presence = useUserPresence(p.identity);
  const reactions = useUserRoomReactions(p.identity);
  const permissions = useParticipantPermissions({
    participant: p,
  });
  if (permissions && p instanceof LocalParticipant) {
    if (permissions.canPublish && p.audioTracks.size === 0) {
      console.debug("Sending mic track");
      p.setMicrophoneEnabled(true);
    } else if (!permissions.canPublish && p.audioTracks.size > 0) {
      console.debug("Turning off mic");
      p.setMicrophoneEnabled(false);
    }
  }
  const { handleMouseEnter, handleMouseLeave, isHovering } = useHoverMenu();
  const room = useNostrRoom();

  const isHandRaised = Boolean(presence?.tags.find((a) => a[0] === "hand")?.[1]);
  const isSpeaker = p.permissions?.canPublish;
  const isHost = event.pubkey === p.identity;
  const isAdmin = room.info?.admins.includes(p.identity);
  const reaction = reactions
    ?.filter((a) => a.created_at > unixNow() - 10)
    ?.sort((a, b) => (a.created_at > b.created_at ? -1 : 1))?.[0];
  return (
    <>
      {zapping && (
        <ZapFlow
          onClose={() => setZapping(false)}
          targets={[
            {
              type: "pubkey",
              weight: 1,
              value: p.identity,
              zap: {
                pubkey: p.identity,
                anon: false,
                event: NostrLink.fromEvent(event),
              },
            },
          ]}
        />
      )}
      <div className="flex items-center flex-col gap-2" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <div className="relative">
          {reaction && (
            <div
              key={reaction.id}
              className="absolute w-[72px] h-[72px] flex items-center justify-center text-3xl react"
            >
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
              <div className="text-primary inline-block mt-[-8px] ml-[-8px]">
                <Icon name="zap" className="rotate-[-80deg]" size={32} onClick={() => setZapping(true)} />
              </div>
            </div>
          )}
          {p.audioTracks.size > 0 && (
            <div className="absolute w-[72px] h-[72px] rotate-[135deg]">
              <div className="bg-foreground rounded-full inline-block mt-[-4px] ml-[-4px] w-8 h-8 flex items-center justify-center">
                <div className="flex items-center justify-center relative rotate-[-135deg] w-full h-full overflow-hidden rounded-full">
                  <Icon name={p.isMicrophoneEnabled ? "mic" : "mic-off"} className="z-20" size={20} />
                  <VuBar
                    track={p.getTrack(Track.Source.Microphone)?.audioTrack?.mediaStreamTrack}
                    height={40}
                    width={40}
                    className="absolute top-0 left-0 w-full h-full z-10"
                  />
                </div>
              </div>
            </div>
          )}
          <Avatar pubkey={p.identity} size={72} className={""} link={false} />
          {isHovering && !isGuest && <ProfileCard participant={p} pubkey={p.identity} />}
        </div>
        <div className={`text-center ${isHost ? "text-primary" : ""}`}>
          {isGuest ? (
            isMe ? (
              <FormattedMessage defaultMessage="Guest (me)" />
            ) : (
              <FormattedMessage defaultMessage="Guest" />
            )
          ) : (
            <DisplayName pubkey={p.identity} profile={profile} />
          )}
        </div>
        {isHost && (
          <div className="text-primary">
            <FormattedMessage defaultMessage="Host" />
          </div>
        )}
        {!isHost && isAdmin && (
          <div className="text-primary">
            <FormattedMessage defaultMessage="Moderator" />
          </div>
        )}
        {!isHost && !isAdmin && isSpeaker && (
          <div>
            <FormattedMessage defaultMessage="Speaker" />
          </div>
        )}
      </div>
    </>
  );
}
