import { EventBuilder, EventKind, NostrLink } from "@snort/system";
import Button, { PrimaryButton } from "./button";
import { RefObject, useMemo, useRef, useState } from "react";
import useEventBuilder from "../hooks/useEventBuilder";
import IconButton from "./icon-button";
import { Link } from "react-router-dom";
import { useHand, useLogin } from "../login";
import { createPortal } from "react-dom";
import classNames from "classnames";
import { RoomOptionsButton } from "./room-menu-bar";
import { LIVE_CHAT, ParticipantRole } from "../const";
import { useNostrRoom } from "../hooks/nostr-room-context";
import { FormattedMessage, useIntl } from "react-intl";
import { useWallet } from "../wallet";
import WalletBalance from "./wallet-balance";
import { useLocalParticipant } from "../transport";

export default function WriteMessage({ link, className }: { link: NostrLink; className?: string }) {
  const [msg, setMsg] = useState("");
  const login = useLogin();
  const [sending, setSending] = useState(false);
  const { system, signer } = useEventBuilder();
  const { formatMessage } = useIntl();

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
  const { isMicEnabled, isPublishing, setMicEnabled, unpublishMicrophone } = useLocalParticipant();
  const hand = useHand(link);
  const refMenu = useRef<HTMLDivElement | null>(null);
  const wallet = useWallet();
  const login = useLogin();
  const { leaveRoom, event } = useNostrRoom();

  // Check if user is a speaker/admin/host in the room event (not just actively publishing)
  const isSpeaker = useMemo(() => {
    if (!login.pubkey || !event) return false;
    if (event.pubkey === login.pubkey) return true; // host
    return event.tags.some(
      (t) => t[0] === "p" && t[1] === login.pubkey && 
        (t[3] === ParticipantRole.SPEAKER || t[3] === ParticipantRole.ADMIN),
    );
  }, [event, login.pubkey]);

  function toggleMute() {
    setMicEnabled(!isMicEnabled);
  }

  function handleExit() {
    if (isSpeaker) {
      // Leave the stage: stop publishing audio and stay in room as listener
      unpublishMicrophone();
    } else {
      // Not on stage -- leave the room entirely
      leaveRoom();
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
          className={`rounded-full aspect-square ${isSpeaker ? "bg-foreground-2" : "bg-delete"}`}
          name="exit"
          size={25}
          onClick={handleExit}
          title={isSpeaker ? "Leave Stage" : "Leave Room"}
        />
        <IconButton
          className={`rounded-full aspect-square${hand.active ? " text-primary" : ""}`}
          name="hand"
          size={25}
          onClick={async () => {
            await hand.toggleHand();
          }}
        />
        {isPublishing && (
          <IconButton
            className={`relative rounded-full overflow-hidden aspect-square${isMicEnabled ? " text-highlight" : ""}`}
            name={isMicEnabled ? "mic" : "mic-off"}
            size={25}
            onClick={toggleMute}
          />
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
