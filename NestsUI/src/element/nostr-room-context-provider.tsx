import { RoomAudioRenderer, useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { Link, useNavigate } from "react-router-dom";
import { NostrEvent, NostrLink } from "@snort/system";
import { useNestsApi } from "../hooks/useNestsApi";
import { PrimaryButton, SecondaryButton } from "./button";
import useRoomPresence, { useSendPresence } from "../hooks/useRoomPresence";
import { useLogin } from "../login";
import Modal from "./modal";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { useRoomReactions } from "../hooks/useRoomReactions";
import Flyout from "./flyout";
import { NostrRoomContext } from "../hooks/nostr-room-context";
import { RoomInfo } from "../api";
import { FormattedMessage } from "react-intl";
import { unixNow } from "@snort/shared";
import { extractStreamInfo, updateOrAddTag } from "../utils";
import useEventModifier from "../hooks/useEventModifier";

export function NostrRoomContextProvider({
  event,
  token,
  children,
}: {
  event: NostrEvent;
  token: string;
  children?: ReactNode;
}) {
  const [flyout, setFlyout] = useState<ReactNode>();
  const [volume, setVolume] = useState(1);
  const [roomInfo, setRoomInfo] = useState<RoomInfo>();
  const [confirmGuest, setConfirmGuest] = useState(false);
  const login = useLogin();
  const link = useMemo(() => NostrLink.fromEvent(event), [event]);
  const presence = useRoomPresence(link);
  const reactions = useRoomReactions(link);
  const room = useRoomContext();
  const localParticipant = useLocalParticipant();
  const modifier = useEventModifier();

  const { status, service } = extractStreamInfo(event);
  const api = useNestsApi(service);
  const isMine = event.pubkey === login.pubkey;
  const navigate = useNavigate();

  const isLive = status === "live";
  const isEnded = status === "ended";
  const isPlanned = status === "planned";
  useSendPresence(isLive ? link : undefined);

  // Handle room metadata change / recording
  useEffect(() => {
    const handler = (m?: string) => {
      if (m) {
        const info = JSON.parse(m) as RoomInfo;
        console.debug("setting metadata", info);
        setRoomInfo(info);
      }
    };
    const endRecording = () => console.log("END_RECORDING");
    const handler2 = () => {
      if (room.participants.size === 0) {
        endRecording();
      }
    };

    const isRecorder = room.localParticipant.permissions?.recorder;
    room.on("roomMetadataChanged", handler);
    if (isRecorder) {
      room.on("participantDisconnected", handler2);
      room.on("disconnected", endRecording);
      console.log("START_RECORDING");
    }
    return () => {
      room.off("roomMetadataChanged", handler);
      if (isRecorder) {
        room.off("participantDisconnected", handler2);
        room.off("disconnected", endRecording);
      }
    };
  }, [room]);

  useEffect(() => {
    const endRecording = () => console.log("END_RECORDING");
    const handler2 = () => {
      if (room.participants.size === 0) {
        endRecording();
      }
    };

    const isRecorder = localParticipant.localParticipant.permissions?.recorder;
    if (isRecorder) {
      room.on("participantDisconnected", handler2);
      room.on("disconnected", endRecording);
      console.log("START_RECORDING");
    }
    return () => {
      if (isRecorder) {
        room.off("participantDisconnected", handler2);
        room.off("disconnected", endRecording);
      }
    };
  }, [room, localParticipant]);

  useEffect(() => {
    api.getRoomInfo(link.id).then((m) => {
      console.debug("setting metadata", m);
      setRoomInfo(m);
    });
  }, [link.id, api]);

  async function startRoomNow() {
    updateOrAddTag(event, "starts", unixNow().toString());
    updateOrAddTag(event, "status", "live");
    event.tags = event.tags.filter((a) => a[0] !== "ends");

    const signed = await modifier.update(event);
    if (signed) {
      navigate("#", {
        state: {
          token,
          event: signed,
        },
        replace: true,
      });
    }
  }

  return (
    <NostrRoomContext.Provider
      value={{
        api,
        event,
        reactions,
        presence,
        flyout,
        setFlyout,
        info: roomInfo,
        volume,
        setVolume,
      }}
    >
      <RoomAudioRenderer volume={volume} />
      <Flyout show={flyout !== undefined} onClose={() => setFlyout(undefined)}>
        {flyout}
      </Flyout>
      {children}
      {isEnded && (
        <Modal id="leave-ended">
          <div className="flex flex-col gap-4 items-center">
            <h2>
              <FormattedMessage defaultMessage="Room Ended" />
            </h2>
            <Link to="/" className="w-full">
              <PrimaryButton className="w-full">
                <FormattedMessage defaultMessage="Back to Lobby" />
              </PrimaryButton>
            </Link>
            {isMine && (
              <SecondaryButton className="w-full" onClick={startRoomNow}>
                <FormattedMessage defaultMessage="Restart room" />
              </SecondaryButton>
            )}
          </div>
        </Modal>
      )}
      {isMine && isPlanned && (
        <Modal id="start-planned">
          <div className="flex flex-col gap-4 items-center">
            <h2>
              <FormattedMessage defaultMessage="Start Room" />
            </h2>
            <PrimaryButton className="w-full" onClick={startRoomNow}>
              <FormattedMessage defaultMessage="Start room" />
            </PrimaryButton>
            <Link to="/" className="w-full">
              <SecondaryButton className="w-full">
                <FormattedMessage defaultMessage="Back to Lobby" />
              </SecondaryButton>
            </Link>
          </div>
        </Modal>
      )}
      {isLive && login.type === "none" && !room.localParticipant.permissions?.recorder && !confirmGuest && (
        <Modal id="join-as-guest">
          <div className="flex flex-col gap-4 items-center">
            <h2>
              <FormattedMessage defaultMessage="Join Room" />
            </h2>
            <SecondaryButton className="w-full" onClick={() => setConfirmGuest(true)}>
              <FormattedMessage defaultMessage="Continue as Guest" />
            </SecondaryButton>
            <Link to="/sign-up" className="text-highlight">
              <FormattedMessage defaultMessage="Create a nostr account" />
            </Link>
          </div>
        </Modal>
      )}
    </NostrRoomContext.Provider>
  );
}
