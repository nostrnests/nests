import { useLocation, useNavigate, useParams } from "react-router-dom";
import { EventKind, NostrLink, parseNostrLink, RequestBuilder } from "@snort/system";
import Logo from "./logo";
import RoomCard from "./room-card";
import { useEventFeed, useRequestBuilder } from "@snort/system-react";
import { PrimaryButton } from "./button";
import { useEffect, useMemo } from "react";
import { FormattedMessage } from "react-intl";
import { removeUndefined, sanitizeRelayUrl } from "@snort/shared";
import { updateRelays } from "../utils";
import { RoomState } from "../pages/room";
import { ROOM_KIND } from "../const";

// Old room kind for backwards compatibility with old naddr links
const OLD_ROOM_KIND = 30_311 as EventKind;

export function JoinRoom() {
  const { id } = useParams();
  const link = parseNostrLink(id!)!;
  if (link.relays) {
    updateRelays(link.relays);
  }

  // Try to fetch with the original link
  const originalEvent = useEventFeed(link);

  // If the link has an old kind, also try fetching with the new kind
  const isOldKind = link.kind === OLD_ROOM_KIND;
  const newKindSub = useMemo(() => {
    const rb = new RequestBuilder(`room-migrate:${link.id}`);
    if (isOldKind && link.author && link.id) {
      rb.withFilter()
        .kinds([ROOM_KIND])
        .authors([link.author])
        .tag("d", [link.id]);
    }
    return rb;
  }, [isOldKind, link.author, link.id]);

  const newKindResults = useRequestBuilder(newKindSub);
  const newKindEvent = newKindResults.length > 0 ? newKindResults[0] : undefined;

  // Use whichever event we found
  const event = originalEvent ?? newKindEvent;

  const navigate = useNavigate();
  const location = useLocation();

  // If we found the event with the new kind, redirect to the new naddr
  useEffect(() => {
    if (!originalEvent && newKindEvent) {
      const newLink = NostrLink.fromEvent(newKindEvent);
      navigate(`/${newLink.encode()}`, { replace: true });
    }
  }, [originalEvent, newKindEvent, navigate]);

  useEffect(() => {
    if (event) {
      const relays = removeUndefined(
        event.tags
          .find((a) => a[0] === "relays")
          ?.slice(1)
          .map((a) => sanitizeRelayUrl(a)) ?? [],
      );
      if (relays.length > 0) {
        updateRelays(relays);
      }
    }
  }, [event]);

  function joinRoom() {
    if (!event) return;
    const eventLink = NostrLink.fromEvent(event);
    // No backend API call needed - just navigate to the room
    // The room page will handle MoQ relay connection directly
    navigate(`/${eventLink.encode()}`, {
      state: {
        event,
      } as RoomState,
      replace: true,
    });
  }

  useEffect(() => {
    // Auto-join if event is available and we navigated here directly
    const query = new URLSearchParams(location.search);
    if (event && query.has("autojoin")) {
      joinRoom();
    }
  }, [event, location]);

  if (!event)
    return (
      <h1>
        <FormattedMessage defaultMessage="Room not found" />
      </h1>
    );
  return (
    <div className="w-screen h-[100dvh] flex-col flex items-center justify-center gap-[10dvh]">
      <Logo />
      <RoomCard event={event} className="lg:w-[35rem] cursor-default" link={false} showDescription={true} />
      <PrimaryButton className="px-6 py-4 w-40 text-lg" onClick={joinRoom}>
        <FormattedMessage defaultMessage="Join" />
      </PrimaryButton>
    </div>
  );
}
