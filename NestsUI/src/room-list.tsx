import { EventKind, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";
import RoomCard from "./element/room-card";
import Button from "./element/button";
import Logo from "./element/logo";

export default function RoomList() {
    const sub = useMemo(() => {
        const rb = new RequestBuilder("rooms");
        rb.withFilter()
            .kinds([EventKind.LiveEvent])

        return rb;
    }, []);

    const events = useRequestBuilder(sub);

    return <>
        <div className="flex justify-between px-10 pt-8 pb-1 items-center">
            <Logo />
            <div>
                <Button>
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