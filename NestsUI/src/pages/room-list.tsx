import { EventKind, NostrEvent, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";
import RoomCard from "../element/room-card";
import { PrimaryButton } from "../element/button";
import { Link } from "react-router-dom";

export default function RoomList() {
  const sub = useMemo(() => {
    const rb = new RequestBuilder("rooms");
    rb.withFilter().kinds([30_312 as EventKind]);

    return rb;
  }, []);

  const events = useRequestBuilder(sub);

  return (
    <div className="mx-auto w-[35rem] flex flex-col gap-8">
      <RoomListList events={events} showCreateWhenEmpty={true} />
    </div>
  );
}

export function RoomListList({
  events,
  showCreateWhenEmpty,
}: {
  events: Array<NostrEvent>;
  showCreateWhenEmpty: boolean;
}) {
  const liveRooms = events.filter((a) => {
    const status = a.tags.find((a) => a[0] === "status")?.[1];
    return status === "live";
  });
  const plannedRooms = events.filter((a) => {
    const status = a.tags.find((a) => a[0] === "status")?.[1];
    return status === "planned";
  });
  return (
    <>
      {(liveRooms.length > 0 || showCreateWhenEmpty) && <h1 className="text-3xl font-semibold">Active Rooms</h1>}
      <div className="flex flex-col gap-6">
        {liveRooms.map((a) => (
          <RoomCard event={a} key={a.id} join={true} />
        ))}
        {liveRooms.length === 0 && showCreateWhenEmpty && (
          <div className="px-6 py-4 rounded-3xl flex flex-col gap-3 bg-foreground flex flex-col gap-2">
            There are no active rooms yet.
            <Link to="/new">
              <PrimaryButton>Start a new room</PrimaryButton>
            </Link>
          </div>
        )}
      </div>
      {(showCreateWhenEmpty || plannedRooms.length > 0) && <h1 className="text-3xl font-semibold">Scheduled</h1>}
      <div className="flex flex-col gap-6">
        {plannedRooms.map((a) => (
          <RoomCard event={a} key={a.id} join={true} />
        ))}
        {plannedRooms.length === 0 && showCreateWhenEmpty && (
          <div className="px-6 py-4 rounded-3xl flex flex-col gap-3 bg-foreground flex flex-col gap-2">
            There are no scheduled rooms right now.
            <Link to="/new">
              <PrimaryButton>Schedule a room</PrimaryButton>
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
