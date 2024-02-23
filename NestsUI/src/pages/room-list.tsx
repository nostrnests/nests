import { RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";
import { DefaultRelays, ROOM_KIND } from "../const";
import { updateRelays } from "../utils";
import { useLogin } from "../login";
import { RoomListList } from "../element/room-list-list";

export default function RoomList() {
  const login = useLogin();
  const sub = useMemo(() => {
    updateRelays(DefaultRelays);
    const rb = new RequestBuilder(`rooms:${login.lobbyType}`);
    const fx = rb.withOptions({ leaveOpen: true }).withFilter().kinds([ROOM_KIND]);
    if (login.lobbyType === "following" && login.follows) {
      fx.authors(login.follows.filter((a) => a[0] === "p").map((a) => a[1]));
    }

    return rb;
  }, [login.follows, login.lobbyType]);

  const events = useRequestBuilder(sub);
  return (
    <div className="lg:mx-auto max-lg:px-4 lg:w-[35rem] flex flex-col gap-8">
      <RoomListList events={events} showCreateWhenEmpty={true} notifyLeftOpen={true} />
    </div>
  );
}
