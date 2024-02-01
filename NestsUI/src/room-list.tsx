import { EventBuilder, EventKind, NostrLink, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";
import RoomCard from "./element/room-card";
import Button from "./element/button";
import Logo from "./element/logo";
import { unixNow } from "@snort/shared";
import { ApiUrl, DefaultRelays } from "./const";
import { useNestsApi } from "./hooks/useNestsApi";
import useEventBuilder from "./hooks/useEventBuilder";
import { useNavigate } from "react-router-dom";

export default function RoomList() {
    const sub = useMemo(() => {
        const rb = new RequestBuilder("rooms");
        rb.withFilter()
            .kinds([30_312 as EventKind])

        return rb;
    }, []);

    const navigate = useNavigate();
    const events = useRequestBuilder(sub);
    const api = useNestsApi();
    const { system, signer } = useEventBuilder();

    async function createRoom() {
        const room = await api.createRoom();

        const builder = new EventBuilder();
        builder.kind(30_312 as EventKind)
            .tag(["d", room.roomId])
            .tag(["service", ApiUrl])
            .tag(["title", window.prompt("Enter room name") ?? "test"])
            .tag(["status", "live"])
            .tag(["starts", String(unixNow())])
            .tag(["relays", ...DefaultRelays]);

        room.endpoints.forEach(e => builder.tag(["streaming", e]));

        const ev = await builder.buildAndSign(signer);
        await system.BroadcastEvent(ev);

        const link = NostrLink.fromEvent(ev);
        navigate(`/room/${link.encode()}`, {
            state: {
                event: ev,
                token: room.token
            }
        });
    }

    return <>
        <div className="flex justify-between px-10 pt-8 pb-1 items-center">
            <Logo />
            <div>
                <Button onClick={createRoom}>
                    New Room
                </Button>
            </div>
        </div>
        <div className="mx-auto w-[35rem] flex flex-col gap-8">
            <h1 className="text-3xl font-semibold">
                Active Rooms
            </h1>
            <div className="flex flex-col gap-6">
                {events.map(a => <RoomCard event={a} key={a.id} join={true} />)}
            </div>
        </div>
    </>
}