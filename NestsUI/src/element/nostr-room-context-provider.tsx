import { RoomAudioRenderer, useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { Link, useNavigate } from "react-router-dom";
import { NostrEvent, NostrLink } from "@snort/system";
import { useNestsApi } from "../hooks/useNestsApi";
import { PrimaryButton, SecondaryButton } from "./button";
import useRoomPresence, { useSendPresence } from "../hooks/useRoomPresence";
import { useLogin } from "../login";
import Modal from "./modal";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useRoomReactions } from "../hooks/useRoomReactions";
import Flyout from "./flyout";
import { NostrRoomContext } from "../hooks/nostr-room-context";
import { RoomInfo } from "../api";
import { FormattedMessage } from "react-intl";
import { unixNow } from "@snort/shared";
import { extractStreamInfo, updateOrAddTag } from "../utils";
import useEventModifier from "../hooks/useEventModifier";
import { usePageVisibility } from "../hooks/usePageVisibility";
import { ConnectionState } from "livekit-client";
import LobbyFlyoutContent from "./lobby-flyout";

export function NostrRoomContextProvider({
  event,
  token,
  serverUrl,
  children,
}: {
  event: NostrEvent;
  token: string;
  serverUrl: string;
  children?: ReactNode;
}) {
  const [flyout, setFlyout] = useState<ReactNode>();
  const [lobbyOpen, setLobbyOpen] = useState(false);
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

  function leaveRoom() {
    // Disconnect in background, don't wait for it
    room.disconnect();
    // Navigate immediately
    window.location.href = "/";
  }

  // Global spacebar handler for mute toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle spacebar
      if (e.code !== "Space") return;

      // Don't toggle if typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Only toggle if user has a microphone track
      if (room.localParticipant.audioTrackPublications.size === 0) return;

      // Prevent default (which would trigger the focused button)
      e.preventDefault();

      // Toggle mute
      room.localParticipant.setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [room]);

  // Handle reconnection when page becomes visible after being hidden (mobile wake)
  const { isVisible } = usePageVisibility();
  const wasHiddenRef = useRef(false);

  useEffect(() => {
    if (!isVisible) {
      wasHiddenRef.current = true;
    } else if (wasHiddenRef.current) {
      wasHiddenRef.current = false;

      // Check if LiveKit room needs reconnection
      const connectionState = room.state;
      if (connectionState === ConnectionState.Disconnected && serverUrl) {
        console.debug("Page became visible, LiveKit disconnected - attempting reconnect");
        room.connect(serverUrl, token, {
          autoSubscribe: true,
        }).catch((e) => {
          console.error("Failed to reconnect to LiveKit:", e);
        });
      } else if (connectionState === ConnectionState.Connected) {
        console.debug("Page became visible, LiveKit still connected");
      }
    }
  }, [isVisible, room, token, serverUrl]);

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
      if (room.numParticipants === 0) {
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
      if (room.numParticipants === 0) {
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

    // Wait for update to broadcast
    const signed = await modifier.update(event);
    if (signed) {
      // Navigate with the new event in state - room.tsx will prefer this
      // over any stale event from the subscription due to newer created_at
      navigate(`/${link.encode()}`, {
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
        lobbyOpen,
        setLobbyOpen,
        info: roomInfo,
        volume,
        setVolume,
        leaveRoom,
      }}
    >
      <RoomAudioRenderer volume={volume} />
      <Flyout side="right" show={flyout !== undefined} onClose={() => setFlyout(undefined)}>
        {flyout}
      </Flyout>
      <Flyout side="left" show={lobbyOpen} onClose={() => setLobbyOpen(false)}>
        <LobbyFlyoutContent />
      </Flyout>
      {children}
      {isEnded && (
        <Modal id="leave-ended">
          <div className="flex flex-col gap-4 items-center">
            <h2>
              <FormattedMessage defaultMessage="Room Ended" />
            </h2>
            <PrimaryButton className="w-full" onClick={leaveRoom}>
              <FormattedMessage defaultMessage="Back to Lobby" />
            </PrimaryButton>
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
            <SecondaryButton className="w-full" onClick={leaveRoom}>
              <FormattedMessage defaultMessage="Back to Lobby" />
            </SecondaryButton>
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
