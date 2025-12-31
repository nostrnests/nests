import { EventBuilder, EventKind, NostrLink } from "@snort/system";
import Button, { PrimaryButton } from "./button";
import { RefObject, useEffect, useRef, useState } from "react";
import useEventBuilder from "../hooks/useEventBuilder";
import IconButton from "./icon-button";
import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { Link, useNavigate } from "react-router-dom";
import { useHand, useLogin } from "../login";
import { createPortal } from "react-dom";
import classNames from "classnames";
import { RoomOptionsButton } from "./room-menu-bar";
import { LIVE_CHAT } from "../const";
import { useNostrRoom } from "../hooks/nostr-room-context";
import { FormattedMessage, useIntl } from "react-intl";
import { Track } from "livekit-client";
import VuBar from "./vu";
import { useWallet } from "../wallet";
import WalletBalance from "./wallet-balance";

export default function WriteMessage({ link, className }: { link: NostrLink; className?: string }) {
  const [msg, setMsg] = useState("");
  const login = useLogin();
  const [sending, setSending] = useState(false);
  const { system, signer } = useEventBuilder();
  const { formatMessage } = useIntl();
  const participant = useLocalParticipant();

  async function sendMessage() {
    if (!signer || msg.length === 0) return;
    setSending(true);
    const builder = new EventBuilder();
    builder.content(msg).kind(LIVE_CHAT).tag(link.toEventTag()!);

    const ev = await builder.processContent().buildAndSign(signer);
    setMsg("");
    await system.BroadcastEvent(ev);
    setSending(false);
  }

  const mainClasses = "flex bg-foreground-2 rounded-full py-1 px-2 pl-4 items-center";
  if (participant.localParticipant.permissions?.recorder) return;
  if (login.type === "none")
    return (
      <div className={classNames(mainClasses, className, "justify-between")}>
        <div className="font-semibold">
          <FormattedMessage defaultMessage="Please login to chat" />
        </div>
        <Link to={"/login"}>
          <PrimaryButton>
            <FormattedMessage defaultMessage="Login" />
          </PrimaryButton>
        </Link>
      </div>
    );
  return (
    <>
      <MenuBar link={link} />
      <div className={classNames(mainClasses, className)}>
        <input
          type="text"
          className="grow bg-foreground-2 text-white"
          placeholder={formatMessage({ defaultMessage: "Comment", description: "Placeholder for writing comment" })}
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => {
            if (e.key == "Enter") {
              sendMessage();
            }
          }}
        />
        <PrimaryButton onClick={sendMessage} loading={sending}>
          <FormattedMessage defaultMessage="Send" description="Send message button text" />
        </PrimaryButton>
      </div>
    </>
  );
}

function MenuBar({ link }: { link: NostrLink }) {
  const room = useRoomContext();
  const localParticipant = useLocalParticipant();
  const navigate = useNavigate();
  const hand = useHand(link);
  const refMenu = useRef<HTMLDivElement | null>(null);
  const wallet = useWallet();
  const login = useLogin();
  const { api } = useNostrRoom();
  const [leavingStage, setLeavingStage] = useState(false);

  const serverSaysOnStage = localParticipant.localParticipant.permissions?.canPublish ?? false;
  // Use local state to track if we've requested to leave the stage
  // This prevents the race condition where permissions haven't updated yet
  const isOnStage = serverSaysOnStage && !leavingStage;

  // Reset leavingStage when server confirms we're off stage
  useEffect(() => {
    if (!serverSaysOnStage && leavingStage) {
      setLeavingStage(false);
    }
  }, [serverSaysOnStage, leavingStage]);

  async function toggleMute() {
    room.localParticipant.setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled);
  }

  async function handleExit() {
    if (isOnStage && login.pubkey) {
      // Leave the stage (move to audience)
      setLeavingStage(true);
      try {
        await api.updatePermissions(link.id, login.pubkey, { can_publish: false });
      } catch (e) {
        console.error("Failed to leave stage:", e);
        setLeavingStage(false);
      }
    } else {
      // Leave the room (go to lobby)
      navigate("/");
    }
  }

  const desktopContainer = [
    "lg:fixed",
    "lg:bottom-10",
    "lg:w-[calc(100vw-450px)]",
    "lg:left-0",
    "flex",
    "justify-center",
  ];
  const desktopClasses = ["lg:bg-foreground", "lg:px-4", "lg:rounded-full"];
  return (
    <div className={classNames("relative", desktopContainer)}>
      <div className={classNames(desktopClasses, "flex justify-evenly py-3 gap-2")} ref={refMenu}>
        {wallet.wallet && (
          <div className="rounded-full bg-foreground-2 flex items-center px-3 max-lg:text-xs lg:text-sm font-medium">
            <WalletBalance />
          </div>
        )}
        <IconButton
          className={`rounded-full aspect-square ${isOnStage ? "bg-foreground-2" : "bg-delete"}`}
          name="exit"
          size={25}
          onClick={handleExit}
          title={isOnStage ? "Leave Stage" : "Leave Room"}
        />
        <IconButton
          className={`rounded-full aspect-square${hand.active ? " text-primary" : ""}`}
          name="hand"
          size={25}
          onClick={async () => {
            await hand.toggleHand();
          }}
        />
        {room.localParticipant.audioTrackPublications.size > 0 && (
          <IconButton
            className={`relative rounded-full overflow-hidden aspect-square${localParticipant.isMicrophoneEnabled ? " text-highlight" : ""}`}
            name={localParticipant.isMicrophoneEnabled ? "mic" : "mic-off"}
            size={25}
            onClick={toggleMute}
          >
            <VuBar
              track={room.localParticipant.getTrackPublication(Track.Source.Microphone)?.audioTrack?.mediaStreamTrack}
              height={40}
              width={40}
              className="absolute top-0 left-0 w-full h-full opacity-20"
            />
          </IconButton>
        )}
        <ReactionsButton link={link} fromRef={refMenu} />
        <RoomOptionsButton link={link} />
      </div>
    </div>
  );
}

function ReactionsButton({ link, fromRef }: { link: NostrLink; fromRef: RefObject<HTMLDivElement | null> }) {
  const [open, setOpen] = useState(false);
  const pos = fromRef.current?.getBoundingClientRect();
  const { system, signer } = useEventBuilder();

  async function sendReactions(content: string) {
    if (!signer) return;

    const eb = new EventBuilder().kind(EventKind.Reaction).content(content).tag(link.toEventTag()!);
    if (link.author) {
      eb.tag(["p", link.author]);
    }

    const ev = await eb.buildAndSign(signer);
    console.debug(ev);
    await system.BroadcastEvent(ev);
  }

  function ReactIcon({ content }: { content: string }) {
    return (
      <Button
        className="cursor-pointer p-3 hover:bg-foreground rounded-lg transition-colors"
        onClick={async () => await sendReactions(content)}
      >
        {content}
      </Button>
    );
  }

  const px = open
    ? createPortal(
        <div
          className="absolute bg-foreground-2 p-4 grid grid-cols-4 lg:grid-cols-6 text-3xl lg:text-2xl gap-3 lg:gap-2 rounded-2xl select-none max-lg:mb-[4dvh] lg:mb-2"
          style={{
            bottom: window.innerHeight - (pos?.top ?? 0),
            left: pos?.left,
            width: pos?.width,
          }}
        >
          <ReactIcon content="🤙" />
          <ReactIcon content="💯" />
          <ReactIcon content="😂" />
          <ReactIcon content="😅" />
          <ReactIcon content="😳" />
          <ReactIcon content="🤔" />
          <ReactIcon content="🔥" />
          <ReactIcon content="🤡" />
          <ReactIcon content="🫂" />
          <ReactIcon content="😱" />
          <ReactIcon content="🤣" />
          <ReactIcon content="🤯" />
        </div>,
        document.body,
      )
    : undefined;
  return (
    <>
      <IconButton
        className={`rounded-full aspect-square${open ? " text-highlight" : ""}`}
        name="smile"
        size={25}
        onClick={() => setOpen((s) => !s)}
      />
      {px}
    </>
  );
}
