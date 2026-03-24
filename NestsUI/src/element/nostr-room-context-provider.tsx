import { Link, useNavigate } from "react-router-dom";
import { NostrEvent, NostrLink } from "@snort/system";
import { PrimaryButton, SecondaryButton } from "./button";
import useRoomPresence, { useSendPresence } from "../hooks/useRoomPresence";
import { useLogin } from "../login";
import Modal from "./modal";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRoomReactions } from "../hooks/useRoomReactions";
import Flyout from "./flyout";
import { NostrRoomContext } from "../hooks/nostr-room-context";
import { FormattedMessage } from "react-intl";
import { unixNow } from "@snort/shared";
import { extractStreamInfo, updateOrAddTag } from "../utils";
import useEventModifier from "../hooks/useEventModifier";
import { usePageVisibility } from "../hooks/usePageVisibility";
import LobbyFlyoutContent from "./lobby-flyout";
import { useNestTransport, useLocalParticipant, useConnectionState } from "../transport";

export function NostrRoomContextProvider({
  event,
  children,
}: {
  event: NostrEvent;
  children?: ReactNode;
}) {
  const [flyout, setFlyout] = useState<ReactNode>();
  const [lobbyOpen, setLobbyOpen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [confirmGuest, setConfirmGuest] = useState(false);
  const login = useLogin();
  const navigate = useNavigate();
  const link = useMemo(() => NostrLink.fromEvent(event), [event]);
  const presence = useRoomPresence(link);
  const reactions = useRoomReactions(link);
  const transport = useNestTransport();
  const { isMicEnabled, isPublishing, setMicEnabled } = useLocalParticipant();
  const connectionState = useConnectionState();
  const modifier = useEventModifier();

  const { status } = extractStreamInfo(event);
  const isMine = event.pubkey === login.pubkey;

  const isLive = status === "live";
  const isEnded = status === "ended";
  const isPlanned = status === "planned";
  useSendPresence(isLive ? link : undefined);

  const leaveRoom = useCallback(() => {
    transport.disconnect();
    navigate("/lobby");
  }, [transport, navigate]);

  // Auto-publish microphone when connected as a speaker
  const isSpeaker = useMemo(() => {
    if (!login.pubkey) return false;
    if (event.pubkey === login.pubkey) return true; // host
    return event.tags.some(
      (t) => t[0] === "p" && t[1] === login.pubkey &&
        (t[3] === "speaker" || t[3] === "admin" || t[3] === "host"),
    );
  }, [event, login.pubkey]);

  // Use a ref to track speaker status so the callback always has the latest value
  const isSpeakerRef = useRef(isSpeaker);
  isSpeakerRef.current = isSpeaker;

  useEffect(() => {
    if (!isLive) return;

    const tryAutoPublish = () => {
      if (isSpeakerRef.current && !transport.isPublishing && !transport.declinedPublish) {
        console.log("[room] auto-publishing microphone");
        transport.publishMicrophone().catch((e) =>
          console.error("[room] auto-publish failed:", e),
        );
      }
    };

    // Subscribe to connection state changes
    const dispose = transport.onStateChange((state) => {
      if (state === "connected") {
        tryAutoPublish();
      }
    });

    // Also check immediately (connection might already be established)
    if (transport.state === "connected") {
      tryAutoPublish();
    }

    // Poll as a safety net (handles React StrictMode double-invoke race)
    const pollInterval = setInterval(() => {
      if (transport.state === "connected") {
        tryAutoPublish();
      }
    }, 2000);

    return () => {
      dispose();
      clearInterval(pollInterval);
    };
  }, [isLive, transport]);

  // Global spacebar handler for mute toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;

      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (!isPublishing) return;

      e.preventDefault();
      setMicEnabled(!isMicEnabled);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPublishing, isMicEnabled, setMicEnabled]);

  // Handle reconnection when page becomes visible after being hidden (mobile wake)
  const { isVisible } = usePageVisibility();
  const wasHiddenRef = useRef(false);

  useEffect(() => {
    if (!isVisible) {
      wasHiddenRef.current = true;
    } else if (wasHiddenRef.current) {
      wasHiddenRef.current = false;

      if (connectionState === "disconnected") {
        console.debug("Page became visible, transport disconnected - will auto-reconnect via Reload");
      }
    }
  }, [isVisible, connectionState]);

  // Volume sync with transport
  useEffect(() => {
    transport.setVolume(volume);
  }, [transport, volume]);

  async function startRoomNow() {
    updateOrAddTag(event, "starts", unixNow().toString());
    updateOrAddTag(event, "status", "live");
    event.tags = event.tags.filter((a) => a[0] !== "ends");

    await modifier.update(event);
    navigate(`/${link.encode()}`);
  }

  return (
    <NostrRoomContext.Provider
      value={{
        event,
        reactions,
        presence,
        flyout,
        setFlyout,
        lobbyOpen,
        setLobbyOpen,
        volume,
        setVolume,
        leaveRoom,
      }}
    >
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
      {isLive && login.type === "none" && !confirmGuest && (
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
