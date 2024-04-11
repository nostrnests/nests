import { NostrEvent, NostrLink, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useEffect, useMemo, useState } from "react";
import RoomCard from "./room-card";
import { PrimaryButton } from "./button";
import { Link } from "react-router-dom";
import { ROOM_PRESENCE } from "../const";
import { FormattedMessage } from "react-intl";
import { unixNow } from "@snort/shared";
import { PRESENCE_TIME } from "../hooks/usePresence";
import { useLogin } from "../login";
import Modal from "./modal";
import { debounce, extractStreamInfo, updateOrAddTag } from "../utils";
import IconButton from "./icon-button";
import useEventModifier from "../hooks/useEventModifier";

export function RoomListList({
  events,
  showCreateWhenEmpty,
  showEmptyRooms,
  showEnded,
  notifyLeftOpen,
}: {
  events: Array<NostrEvent>;
  showCreateWhenEmpty: boolean;
  showEmptyRooms?: boolean;
  showEnded?: boolean;
  notifyLeftOpen?: boolean;
}) {
  const login = useLogin();
  const modifier = useEventModifier();
  const subPresence = useMemo(() => {
    if (events.length > 0) {
      const rb = new RequestBuilder("presence:room-list");
      const fx = rb
        .withOptions({ leaveOpen: true })
        .withFilter()
        .kinds([ROOM_PRESENCE])
        .since(unixNow() - PRESENCE_TIME * 10);
      fx.replyToLink(events.map((a) => NostrLink.fromEvent(a)));

      return rb;
    }
  }, [events]);

  const roomPresence = useRequestBuilder(subPresence);

  const getTag = (a: NostrEvent, key: string) => a.tags.find((a) => a[0] === key)?.[1];
  const eventsWithPresence = useMemo(() => {
    return events
      .filter((a) => {
        const hasLivekit = a.tags.some(
          (a) => a[0] === "streaming" && (a[1].startsWith("ws+livekit://") || a[1].startsWith("wss+livekit://")),
        );
        const hasServiceTag = a.tags.some((a) => a[0] === "service" && a[1].startsWith("http"));
        return hasLivekit && hasServiceTag;
      })
      .map((a) => {
        const aLink = NostrLink.fromEvent(a);
        const pres = roomPresence.filter((b) => aLink.isReplyToThis(b));
        return {
          event: a,
          presence: pres.filter((a) => a.created_at >= unixNow() - PRESENCE_TIME * 1.2),
        };
      })
      .sort((a, b) => (a.presence.length > b.presence.length ? -1 : 1));
  }, [events, roomPresence]);

  const liveRooms = eventsWithPresence.filter((a) => {
    const status = getTag(a.event, "status");
    return status === "live" && (showEmptyRooms || a.presence.length > 0);
  });
  const mineLeftOpen = eventsWithPresence.filter((a) => {
    const status = getTag(a.event, "status");
    return a.event.pubkey === login.pubkey && status === "live" && a.presence.length === 0;
  });
  const [closeMine, setCloseMine] = useState(false);
  useEffect(() => {
    return debounce(2000, () => {
      if (mineLeftOpen.length > 0) {
        setCloseMine(true);
      } else {
        setCloseMine(false);
      }
    });
  }, [mineLeftOpen]);
  const plannedRooms = eventsWithPresence.filter((a) => {
    const status = getTag(a.event, "status");
    const starts = Number(getTag(a.event, "starts"));
    return status === "planned" && starts + 60 * 60 > unixNow();
  }).sort((a, b) => {
    const aStart = Number(getTag(a.event, "starts"));
    const bStart = Number(getTag(b.event, "starts"));
    return aStart > bStart ? 1 : -1;
  });
  const endedRooms = eventsWithPresence.filter((a) => {
    const status = getTag(a.event, "status");
    return status === "ended" && showEnded;
  });
  return (
    <>
      {notifyLeftOpen && mineLeftOpen.length > 0 && closeMine && (
        <Modal id="close-left-open" onClose={() => setCloseMine(false)}>
          <div>
            <h2>
              <FormattedMessage defaultMessage="Rooms left open" />
            </h2>
            <p className="my-2">
              <FormattedMessage defaultMessage="Please close the following rooms:" />
            </p>
            <div className="flex flex-col gap-2">
              {mineLeftOpen.map((a) => {
                const { title } = extractStreamInfo(a.event);
                return (
                  <div className="px-3 py-4 rounded-xl bg-foreground-2 flex justify-between items-center">
                    <div className="text-2xl font-medium">{title}</div>
                    <IconButton
                      name="trash"
                      className="text-delete bg-foreground-2-hover rounded-xl"
                      onClick={async () => {
                        updateOrAddTag(a.event, "ends", unixNow().toString());
                        updateOrAddTag(a.event, "status", "ended");
                        await modifier.update(a.event);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}
      {(liveRooms.length > 0 || showCreateWhenEmpty) && (
        <h1 className="text-3xl font-semibold">
          <FormattedMessage defaultMessage="Active Rooms" />
        </h1>
      )}
      <div className="flex flex-col gap-6">
        {liveRooms.map((a) => (
          <RoomCard event={a.event} key={a.event.id} join={true} presenceEvents={a.presence} inRoom={false} />
        ))}
        {liveRooms.length === 0 && showCreateWhenEmpty && (
          <div className="px-6 py-4 rounded-3xl flex flex-col gap-3 bg-foreground flex flex-col gap-2">
            <FormattedMessage defaultMessage="There are no active rooms yet." />
            <Link to="/new">
              <PrimaryButton>
                <FormattedMessage defaultMessage="Start a new room" />
              </PrimaryButton>
            </Link>
          </div>
        )}
      </div>
      {(showCreateWhenEmpty || plannedRooms.length > 0) && (
        <h1 className="text-3xl font-semibold">
          <FormattedMessage defaultMessage="Scheduled" />
        </h1>
      )}
      <div className="flex flex-col gap-6">
        {plannedRooms.map((a) => (
          <RoomCard event={a.event} key={a.event.id} join={true} presenceEvents={a.presence} inRoom={false} />
        ))}
        {plannedRooms.length === 0 && showCreateWhenEmpty && (
          <div className="px-6 py-4 rounded-3xl flex flex-col gap-3 bg-foreground flex flex-col gap-2">
            <FormattedMessage defaultMessage="There are no scheduled rooms right now." />
            <Link to="/new">
              <PrimaryButton>
                <FormattedMessage defaultMessage="Schedule a room" />
              </PrimaryButton>
            </Link>
          </div>
        )}
      </div>
      {endedRooms.length > 0 && (
        <h1 className="text-3xl font-semibold">
          <FormattedMessage defaultMessage="Ended" />
        </h1>
      )}
      <div className="flex flex-col gap-6">
        {endedRooms.map((a) => (
          <RoomCard event={a.event} key={a.event.id} join={true} presenceEvents={a.presence} inRoom={false} />
        ))}
      </div>
    </>
  );
}
