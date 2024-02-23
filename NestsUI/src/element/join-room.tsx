import { useLocation, useNavigate, useParams } from "react-router-dom";
import { parseNostrLink } from "@snort/system";
import { useNestsApi } from "../hooks/useNestsApi";
import Logo from "./logo";
import RoomCard from "./room-card";
import { useEventFeed } from "@snort/system-react";
import { PrimaryButton } from "./button";
import { useEffect } from "react";
import { FormattedMessage } from "react-intl";
import { removeUndefined, sanitizeRelayUrl } from "@snort/shared";
import { extractStreamInfo, updateRelays } from "../utils";
import { RoomState } from "../pages/room";

export function JoinRoom() {
  const { id } = useParams();
  const link = parseNostrLink(id!)!;
  if (link.relays) {
    updateRelays(link.relays);
  }
  const event = useEventFeed(link);
  const { service } = extractStreamInfo(event);
  const api = useNestsApi(service);
  const navigate = useNavigate();
  const location = useLocation();

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

  async function joinRoom() {
    if (!api) return;
    const { token } = await api.joinRoom(link.id);
    navigate(`/${link.encode()}`, {
      state: {
        event,
        token,
      } as RoomState,
      replace: true,
    });
  }

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const token = query.get("token");
    if (token && event) {
      navigate(location.pathname, {
        state: {
          event,
          token,
        },
        replace: true,
      });
    }
  }, [event, location, navigate]);

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
