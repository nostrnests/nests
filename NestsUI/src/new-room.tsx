import { useContext, useState } from "react";
import Button from "./element/button";
import { useNavigate } from "react-router-dom";
import { NestsApi } from "./api";
import { ApiUrl, DefaultRelays } from "./const";
import { EventBuilder, EventKind, Nip7Signer, NostrLink } from "@snort/system";
import { unixNow } from "@snort/shared";
import { SnortContext } from "@snort/system-react";

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

export default function NewRoom() {
    const system = useContext(SnortContext);
    const [name, setName] = useState("");
    const navigate = useNavigate();
    const signer = new Nip7Signer();
    const api = new NestsApi(ApiUrl, signer);

    async function createRoom() {
        const room = await api.createRoom();

        const eb = new EventBuilder();
        eb.kind(EventKind.LiveEvent)
            .tag(["d", room.roomId])
            .tag(["service", ApiUrl])
            .tag(["title", name])
            .tag(["status", "live"])
            .tag(["starts", String(unixNow())])
            .tag(["relays", ...DefaultRelays]);

        room.endpoints.forEach(e => eb.tag(["streaming", e]));

        const ev = await eb.buildAndSign(signer);
        await system.BroadcastEvent(ev);        

        const link = NostrLink.fromEvent(ev);
        navigate(`/room/${link.encode()}`, {
            state: {
                event: ev,
                token: room.token
            }
        });
    }

    return <div className="w-64 p-2 flex flex-col gap-4 items-center">
        <div className="text-3xl">
            Create Room
        </div>
        <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
        <Button onClick={async () => await createRoom()}>
            Join
        </Button>
    </div>
}