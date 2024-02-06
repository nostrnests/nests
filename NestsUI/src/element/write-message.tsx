import { EventBuilder, EventKind, NostrLink } from "@snort/system";
import { PrimaryButton } from "./button";
import { useState } from "react";
import useEventBuilder from "../hooks/useEventBuilder";
import IconButton from "./icon-button";
import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { useNavigate } from "react-router-dom";
import { useHand } from "../login";

export default function WriteMessage({ link }: { link: NostrLink }) {
    const room = useRoomContext();
    const localParticipant = useLocalParticipant();
    const [msg, setMsg] = useState("");
    const { system, signer } = useEventBuilder();
    const navigate = useNavigate();
    const hand = useHand(link);

    async function sendMessage() {
        if (!signer) return;
        const builder = new EventBuilder();
        builder.content(msg)
            .kind(1311 as EventKind)
            .tag(link.toEventTag()!);

        const ev = await builder.buildAndSign(signer);
        await system.BroadcastEvent(ev);
        setMsg("");
    }

    async function toggleMute() {
        room.localParticipant.setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled);
    }

    return <>
        <div className="flex justify-evenly py-3">
            <IconButton className="rounded-full aspect-square bg-foreground-2" name="exit" size={25} onClick={() => navigate("/")} />
            <IconButton className={`rounded-full aspect-square${hand.active ? " text-primary" : ""}`} name="hand" size={25} onClick={async () => {
                await hand.toggleHand();
            }} />
            {room.localParticipant.audioTracks.size > 0 &&
                <IconButton className="rounded-full aspect-square" name={localParticipant.isMicrophoneEnabled ? "mic" : "mic-off"} size={25} onClick={toggleMute} />}
            <IconButton className="rounded-full aspect-square" name="smile" size={25} />
            <IconButton className="rounded-full aspect-square" name="dots" size={25} />
        </div>
        <div className="flex bg-foreground-2 rounded-full py-1 px-2 pl-4 items-center">
            <input type="text" className="grow bg-foreground-2 text-white" placeholder="Comment" value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => {
                if (e.key == "Enter") {
                    sendMessage();
                }
            }} />
            <PrimaryButton onClick={sendMessage}>
                Send
            </PrimaryButton>
        </div>
    </>
}