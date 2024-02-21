import { EventBuilder, EventKind, NostrLink } from "@snort/system";
import Button, { PrimaryButton } from "./button";
import { RefObject, useRef, useState } from "react";
import useEventBuilder from "../hooks/useEventBuilder";
import IconButton from "./icon-button";
import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { Link, useNavigate } from "react-router-dom";
import { useHand, useLogin } from "../login";
import { createPortal } from "react-dom";
import classNames from "classnames";
import { RoomOptionsButton } from "./room-menu-bar";
import { LIVE_CHAT } from "../const";
import { FormattedMessage, useIntl } from "react-intl";
import { Track } from "livekit-client";
import VuBar from "./vu";

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
  const room = useRoomContext();
  const localParticipant = useLocalParticipant();
  const navigate = useNavigate();
  const hand = useHand(link);
  const refMenu = useRef<HTMLDivElement | null>(null);

  async function toggleMute() {
    room.localParticipant.setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled);
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
      <div className={classNames(desktopClasses, "flex justify-evenly py-3 gap-4")} ref={refMenu}>
        <IconButton
          className="rounded-full aspect-square bg-foreground-2"
          name="exit"
          size={25}
          onClick={() => navigate("/")}
        />
        <IconButton
          className={`rounded-full aspect-square${hand.active ? " text-primary" : ""}`}
          name="hand"
          size={25}
          onClick={async () => {
            await hand.toggleHand();
          }}
        />
        {room.localParticipant.audioTracks.size > 0 && (
          <IconButton
            className={`relative rounded-full overflow-hidden aspect-square${localParticipant.isMicrophoneEnabled ? " text-highlight" : ""}`}
            name={localParticipant.isMicrophoneEnabled ? "mic" : "mic-off"}
            size={25}
            onClick={toggleMute}
          >
            <VuBar
              track={room.localParticipant.getTrack(Track.Source.Microphone)?.audioTrack?.mediaStreamTrack}
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
      <Button className="cursor-pointer" onClick={async () => await sendReactions(content)}>
        {content}
      </Button>
    );
  }

  const px = open
    ? createPortal(
        <div
          className="absolute bg-foreground-2 p-3 grid grid-cols-6 text-2xl rounded-2xl select-none w-[20rem] max-lg:mb-[4dvh] lg:mb-2"
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
          <ReactIcon content="🤩" />
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
