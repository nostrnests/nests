import { NostrLink, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";
import { DefaultRelays, ROOM_KIND, ROOM_PRESENCE } from "../const";
import { useLogin } from "../login";
import RoomCard from "./room-card";
import { FormattedMessage } from "react-intl";
import { unixNow } from "@snort/shared";
import { PRESENCE_TIME } from "../hooks/usePresence";
import { useNostrRoom } from "../hooks/nostr-room-context";
import { snortSystem } from "../main";

export default function LobbyFlyoutContent() {
  const login = useLogin();
  const { event: currentRoom, setLobbyOpen } = useNostrRoom();

  // Connect to default relays for lobby
  useMemo(() => {
    DefaultRelays.forEach((r) => snortSystem.ConnectToRelay(r, { read: true, write: true }));
  }, []);

  const sub = useMemo(() => {
    const rb = new RequestBuilder(`lobby-flyout:${login.lobbyType}`);
    const fx = rb
      .withOptions({ leaveOpen: true })
      .withFilter()
      .kinds([ROOM_KIND])
      .since(unixNow() - 60 * 60 * 24 * 7);
    if (login.lobbyType === "following" && login.follows) {
      fx.authors(login.follows.filter((a) => a[0] === "p").map((a) => a[1]));
    }

    return rb;
  }, [login.follows, login.lobbyType]);

  const events = useRequestBuilder(sub);

  // Subscribe to presence for all rooms
  const subPresence = useMemo(() => {
    const rb = new RequestBuilder("presence:lobby-flyout");
    if (events.length > 0) {
      const fx = rb
        .withOptions({ leaveOpen: true })
        .withFilter()
        .kinds([ROOM_PRESENCE])
        .since(unixNow() - PRESENCE_TIME * 10);
      fx.replyToLink(events.map((a) => NostrLink.fromEvent(a)));
    }
    return rb;
  }, [events]);

  const roomPresence = useRequestBuilder(subPresence);

  const getTag = (a: typeof events[0], key: string) => a.tags.find((t) => t[0] === key)?.[1];

  const eventsWithPresence = useMemo(() => {
    return events
      .filter((a) => {
        const hasLivekit = a.tags.some(
          (t) => t[0] === "streaming" && (t[1].startsWith("ws+livekit://") || t[1].startsWith("wss+livekit://")),
        );
        const hasServiceTag = a.tags.some((t) => t[0] === "service" && t[1].startsWith("http"));
        // Exclude the current room
        return hasLivekit && hasServiceTag && a.id !== currentRoom.id;
      })
      .map((a) => {
        const aLink = NostrLink.fromEvent(a);
        const pres = roomPresence.filter((b) => aLink.isReplyToThis(b));
        return {
          event: a,
          presence: pres.filter((p) => p.created_at >= unixNow() - PRESENCE_TIME * 1.2),
        };
      })
      .sort((a, b) => (a.presence.length > b.presence.length ? -1 : 1));
  }, [events, roomPresence, currentRoom.id]);

  const liveRooms = eventsWithPresence.filter((a) => {
    const status = getTag(a.event, "status");
    return status === "live" && a.presence.length > 0;
  });

  const plannedRooms = eventsWithPresence
    .filter((a) => {
      const status = getTag(a.event, "status");
      const starts = Number(getTag(a.event, "starts"));
      return status === "planned" && starts + 60 * 60 > unixNow();
    })
    .sort((a, b) => {
      const aStart = Number(getTag(a.event, "starts"));
      const bStart = Number(getTag(b.event, "starts"));
      return aStart > bStart ? 1 : -1;
    });

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      <h2 className="text-xl font-semibold">
        <FormattedMessage defaultMessage="Lobby" />
      </h2>
      <div className="flex flex-col gap-4 overflow-y-auto flex-1">
        {liveRooms.length > 0 && (
          <>
            <h3 className="text-lg font-medium text-foreground-3">
              <FormattedMessage defaultMessage="Active Rooms" />
            </h3>
            {liveRooms.map((a) => (
              <RoomCard
                event={a.event}
                key={a.event.id}
                join={true}
                presenceEvents={a.presence}
                inRoom={false}
                compact={true}
                onJoin={() => setLobbyOpen(false)}
              />
            ))}
          </>
        )}
        {plannedRooms.length > 0 && (
          <>
            <h3 className="text-lg font-medium text-foreground-3">
              <FormattedMessage defaultMessage="Scheduled" />
            </h3>
            {plannedRooms.map((a) => (
              <RoomCard
                event={a.event}
                key={a.event.id}
                join={true}
                presenceEvents={a.presence}
                inRoom={false}
                compact={true}
                onJoin={() => setLobbyOpen(false)}
              />
            ))}
          </>
        )}
        {liveRooms.length === 0 && plannedRooms.length === 0 && (
          <div className="text-foreground-3 text-center py-8">
            <FormattedMessage defaultMessage="No other rooms available" />
          </div>
        )}
      </div>
    </div>
  );
}
