import { EventBuilder, EventKind, NostrLink } from "@snort/system";
import Button, { PrimaryButton } from "./button";
import { RefObject, useRef, useState } from "react";
import useEventBuilder from "../hooks/useEventBuilder";
import IconButton from "./icon-button";
import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { useNavigate } from "react-router-dom";
import { useHand, useLogin } from "../login";
import { createPortal } from "react-dom";

export default function WriteMessage({ link }: { link: NostrLink }) {
  const room = useRoomContext();
  const localParticipant = useLocalParticipant();
  const [msg, setMsg] = useState("");
  const login = useLogin();
  const { system, signer } = useEventBuilder();
  const navigate = useNavigate();
  const hand = useHand(link);
  const refMenu = useRef<HTMLDivElement | null>(null);

  async function sendMessage() {
    if (!signer) return;
    const builder = new EventBuilder();
    builder
      .content(msg)
      .kind(1311 as EventKind)
      .tag(link.toEventTag()!);

    const ev = await builder.buildAndSign(signer);
    await system.BroadcastEvent(ev);
    setMsg("");
  }

  async function toggleMute() {
    room.localParticipant.setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled);
  }

  if (login.type === "none") return <div>Please login to chat</div>;
  return (
    <>
      <div className="flex justify-evenly py-3" ref={refMenu}>
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
        <IconButton className="rounded-full aspect-square" name="dots" size={25} />
      </div>
      <div className="flex bg-foreground-2 rounded-full py-1 px-2 pl-4 items-center">
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
        <PrimaryButton onClick={sendMessage}>Send</PrimaryButton>
      </div>
    </>
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