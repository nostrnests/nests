import { EventBuilder, EventKind, NostrLink } from "@snort/system";
import Button, { PrimaryButton } from "./button";
import { ReactNode, RefObject, useEffect, useRef, useState } from "react";
import useEventBuilder from "../hooks/useEventBuilder";
import IconButton from "./icon-button";
import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { useNavigate } from "react-router-dom";
import { useHand, useLogin } from "../login";
import { createPortal } from "react-dom";
import classNames from "classnames";
import Icon from "../icon";
import { hexToBech32 } from "@snort/shared";
import { useIsAdmin } from "../hooks/useIsAdmin";
import { useNestsApi } from "../hooks/useNestsApi";

export default function WriteMessage({ link, className }: { link: NostrLink; className?: string }) {
  const [msg, setMsg] = useState("");
  const login = useLogin();
  const [sending, setSending] = useState(false);
  const { system, signer } = useEventBuilder();

  async function sendMessage() {
    if (!signer || msg.length === 0) return;
    setSending(true);
    const builder = new EventBuilder();
    builder
      .content(msg)
      .kind(1311 as EventKind)
      .tag(link.toEventTag()!);

    const ev = await builder.buildAndSign(signer);
    setMsg("");
    await system.BroadcastEvent(ev);
    setSending(false);
  }

  if (login.type === "none") return <div>Please login to chat</div>;
  return (
    <>
      <MenuBar link={link} />
      <div className={classNames("flex bg-foreground-2 rounded-full py-1 px-2 pl-4 items-center", className)}>
        <input
          type="text"
          className="grow bg-foreground-2 text-white"
          placeholder="Comment"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => {
            if (e.key == "Enter") {
              sendMessage();
            }
          }}
        />
        <PrimaryButton onClick={sendMessage} loading={sending}>Send</PrimaryButton>
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
            className={`rounded-full aspect-square${localParticipant.isMicrophoneEnabled ? " text-highlight" : ""}`}
            name={localParticipant.isMicrophoneEnabled ? "mic" : "mic-off"}
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
        className="hover:bg-foreground transition cursor-pointer rounded-full aspect-square flex items-center justify-center"
        onClick={async () => await sendReactions(content)}
      >
        {content}
      </Button>
    );
  }

  const px = open
    ? createPortal(
      <div
        className="absolute bg-foreground-2 p-3 grid grid-cols-6 gap-4 text-3xl rounded-2xl select-none"
        style={{
          bottom: window.innerHeight - (pos?.top ?? 0) + 5,
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

function RoomOptionsButton({ link }: { link: NostrLink }) {
  const [open, setOpen] = useState(false);
  const login = useLogin();
  const ref = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(230);
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const localParticipant = useLocalParticipant();
  const api = useNestsApi();

  const menuItem = (icon: string, text: ReactNode, onClick: () => void, className?: string) => {
    return (
      <div
        className={classNames(
          "flex items-center gap-3 px-4 py-3 first:pt-4 last:pb-4 hover:bg-foreground hover:text-primary transition cursor-pointer select-none",
          className,
        )}
        onClick={onClick}
      >
        <Icon name={icon} />
        <div>{text}</div>
      </div>
    );
  };

  useEffect(() => {
    const t = setInterval(() => {
      const elm = menuRef.current;
      if (!elm) return;
      if (elm.offsetWidth !== 0) {
        setW(elm.offsetWidth);
      }
    }, 100);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <IconButton
        className={`rounded-full aspect-square${open ? " text-highlight" : ""}`}
        name="dots"
        size={25}
        ref={ref}
        onClick={() => setOpen((s) => !s)}
      />
      {open &&
        ref.current &&
        createPortal(
          <div
            className="absolute bg-foreground-2 flex flex-col rounded-2xl select-none overflow-hidden whitespace-nowrap"
            ref={menuRef}
            style={{
              bottom: window.innerHeight - ref.current.getBoundingClientRect().top + 15,
              left: Math.min(window.innerWidth - w, ref.current.getBoundingClientRect().left),
            }}
          >
            {login.pubkey &&
              menuItem("person", "Profile", () => {
                navigate(`/${hexToBech32("npub", login.pubkey)}`);
              })}
            {menuItem("copy", "Copy Room Link", () => {
              window.navigator.clipboard.writeText(
                `${window.location.protocol}//${window.location.host}/${link.encode()}`,
              );
              setOpen(false);
            })}
            {localParticipant.microphoneTrack &&
              login.pubkey &&
              menuItem("exit", "Leave Stage", async () => {
                await api.updatePermissions(link.id, login.pubkey!, { can_publish: false });
                setOpen(false);
              })}
            {isAdmin && menuItem("audio", "Stream Audio", () => { })}
            {isAdmin && menuItem("rec", "Start Room Recording", () => { })}
            {isAdmin && menuItem("folder", "Room Recordings", () => { }, "opacity-50 cursor-not-allowed")}
          </div>,
          document.body,
        )}
    </>
  );
}
