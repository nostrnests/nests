import { useCallback, useContext, useMemo, useState } from "react";
import Button, { PrimaryButton } from "./element/button";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { NestsApi } from "./api";
import { ApiUrl, ColorPalette, DefaultRelays } from "./const";
import { EventBuilder, EventKind, NostrLink } from "@snort/system";
import { unixNow } from "@snort/shared";
import { SnortContext } from "@snort/system-react";
import RoomCard from "./element/room-card";
import { useLogin } from "./login";
import { openFile } from "./upload";
import nostrBuildUpload from "./upload/nostrbuild";
import Spinner from "./element/spinner";


/*
{
  "kind": 30312,
  "tags": [
    ["d", "<unique identifier>"],
    ["title", "<name of the event>"],
    ["summary", "<description>"],
    ["image", "<preview image url>"],
    ["t", "hashtag"],
    ["streaming", "<url>"],
    ["recording", "<url>"], // used to place the edited video once the activity is over
    ["starts", "<unix timestamp in seconds>"],
    ["ends", "<unix timestamp in seconds>"],
    ["status", "<planned, live, ended>"],
    ["current_participants", "<number>"],
    ["total_participants", "<number>"],
    ["p", "aaaa", "wss://provider1.com/", "host"],
    ["p", "bbbb", "wss://provider2.com/nostr", "speaker"],
    ["p", "cccc", "wss://provider3.com/nostr", "speaker"],
    ["p", "dddd", "wss://provider4.com/nostr", "speaker"],
    ["relays", "wss://one.com", "wss://two.com", ...],
    ["service", "https://nostrnests.com/api/v1/nests"],
  ],
  "content": "",
  ...
}
*/

type ColorType = typeof ColorPalette[number];
export default function NewRoom() {
    const system = useContext(SnortContext);
    const [bgType, setBgType] = useState<"color" | "image">("color");
    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const [time, setTime] = useState<string>();
    const [image, setImage] = useState<string>();
    const [imageProcessing, setImageProcessing] = useState(false);
    const [color, setColor] = useState<ColorType>(ColorPalette[0]);
    const navigate = useNavigate();
    const login = useLogin();

    const buildEvent = useCallback((id: string) => {
        const eb = new EventBuilder();
        eb
            .pubKey(login.pubkey ?? "00")
            .kind(30_312 as EventKind)
            .tag(["d", id])
            .tag(["service", ApiUrl])
            .tag(["title", name])
            .tag(["summary", desc])
            .tag(["color", color])
            .tag(["image", image ?? ""])
            .tag(["status", time ? "planned" : "live"])
            .tag(["starts", time ? String(Math.floor(new Date(time).getTime() / 1000)) : String(unixNow())])
            .tag(["relays", ...DefaultRelays]);

        return eb;
    }, [login.pubkey, name, desc, color, time, image])

    const dmeoRoom = useMemo(() => {
        return buildEvent("demo").build();
    }, [buildEvent]);

    async function createRoom() {
        if (!login.signer) return;
        const api = new NestsApi(ApiUrl, login.signer);
        const room = await api.createRoom();

        const eb = buildEvent(room.roomId);
        room.endpoints.forEach(e => eb.tag(["streaming", e]));

        const ev = await eb.buildAndSign(login.signer);
        await system.BroadcastEvent(ev);

        const link = NostrLink.fromEvent(ev);
        navigate(`/${link.encode()}`, {
            state: {
                event: ev,
                token: room.token
            }
        });
    }

    if (login.type === "none")
        return <Navigate to={"/login"} />

    return <div className="w-[35rem] mx-auto flex flex-col gap-4 mt-10">
        <h1 className="text-center">
            New Room
        </h1>
        <div>
            <div className="font-medium mb-2">
                Room name
            </div>
            <input type="text" placeholder="Insert cool name here" value={name} onChange={e => setName(e.target.value)} className="w-full" />
        </div>
        <div>
            <div className="font-medium mb-2">
                Scheduled Time (optional)
            </div>
            <input type="datetime-local" placeholder="Time" value={time} onChange={e => setTime(e.target.value)} className="w-full" />
        </div>
        <div>
            <div className="font-medium mb-2">
                Room Description (Optional 140 chars)
            </div>
            <input type="text" placeholder="Discussing macro and other boring stuff" value={desc} onChange={e => setDesc(e.target.value)} className="w-full" />
        </div>
        <div>
            <div className="font-medium mb-2">
                Banner Color or Image
            </div>
            <div className="flex gap-1 mb-2">
                <div className={`${bgType === "color" ? "bg-primary " : ""}rounded-full px-3 py-1 cursor-pointer`} onClick={() => {
                    setBgType("color");
                    setImage(undefined);
                }}>
                    Color
                </div>
                <div className={`${bgType === "image" ? "bg-primary " : ""}rounded-full px-3 py-1 cursor-pointer`} onClick={() => setBgType("image")}>
                    Image
                </div>
            </div>
            {bgType === "color" && <div className="flex gap-4 flex-wrap">
                {ColorPalette.map(a => <div className={`w-8 h-8 rounded-full cursor-pointer${a === color ? " outline outline-2" : ""} bg-${a}`} key={a} onClick={() => setColor(a as ColorType)}></div>)}
            </div>}
            {bgType === "image" && <div className="outline outline-1 outline-dashed cursor-pointer rounded-xl text-primary flex justify-center overflow-hidden" onClick={async () => {
                setImageProcessing(true);
                try {
                    const f = await openFile();
                    if (f) {
                        const res = await nostrBuildUpload(f, login.signer);
                        if (res.url) {
                            setImage(res.url);
                        }
                    }
                } finally {
                    setImageProcessing(false);
                }
            }}>
                {image && !imageProcessing && <img src={image} />}
                {!image && !imageProcessing && <span className="leading-10">Select image</span>}
                {imageProcessing && <Spinner size={30} />}
            </div>}
        </div>
        <RoomCard event={dmeoRoom} />
        <div className="flex gap-2 justify-center">
            <Link to="/">
                <Button className="rounded-full bg-foreground-2">
                    Cancel
                </Button>
            </Link>
            <PrimaryButton onClick={async () => await createRoom()}>
                Create
            </PrimaryButton>
        </div>
    </div>
}