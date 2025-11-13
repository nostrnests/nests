import { useCallback, useContext, useMemo, useState } from "react";
import { PrimaryButton, SecondaryButton } from "../element/button";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { NestsApi } from "../api";
import { ApiUrl, DefaultRelays, ROOM_KIND } from "../const";
import { EventBuilder, NostrLink } from "@snort/system";
import { sanitizeRelayUrl, unixNow } from "@snort/shared";
import { SnortContext } from "@snort/system-react";
import RoomCard from "../element/room-card";
import { useLogin } from "../login";
import BannerEditor from "../element/banner-editor";
import { FormattedMessage, useIntl } from "react-intl";
import { updateRelays } from "../utils";
import Icon from "../icon";
import Collapsed from "../element/collapsed";

export default function NewRoom() {
  updateRelays(DefaultRelays);
  const system = useContext(SnortContext);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [time, setTime] = useState<string>();
  const [color, setColor] = useState<string>();
  const [image, setImage] = useState<string>();
  const [relayInput, setRelayInput] = useState("");
  const [relays, setRelays] = useState<Array<string>>([...DefaultRelays]);
  const [hls, setHls] = useState(false);
  const navigate = useNavigate();
  const login = useLogin();
  const { formatMessage } = useIntl();

  const buildEvent = useCallback(
    (id: string) => {
      const eb = new EventBuilder();
      eb.pubKey(login.pubkey ?? "00")
        .kind(ROOM_KIND)
        .tag(["d", id])
        .tag(["service", ApiUrl])
        .tag(["title", name])
        .tag(["summary", desc])
        .tag(["color", color ?? ""])
        .tag(["image", image ?? ""])
        .tag(["status", time ? "planned" : "live"])
        .tag(["starts", time ? String(Math.floor(new Date(time).getTime() / 1000)) : String(unixNow())])
        .tag(["relays", ...relays]);

      return eb;
    },
    [login.pubkey, name, desc, color, time, image, relays],
  );

  const dmeoRoom = useMemo(() => {
    return buildEvent("demo").build();
  }, [buildEvent]);

  async function createRoom() {
    if (!login.signer) return;
    const api = new NestsApi(ApiUrl, login.signer);
    const room = await api.createRoom(relays, hls);
    const eb = buildEvent(room.roomId);

    room.endpoints.forEach((e) => eb.tag(["streaming", e]));

    const ev = await eb.buildAndSign(login.signer);
    await Promise.all(relays.map((r) => system.pool.broadcastTo(r, ev)));

    const link = NostrLink.fromEvent(ev);
    navigate(`/${link.encode()}`, {
      state: {
        event: ev,
        token: room.token,
      },
    });
  }

  if (login.type === "none") return <Navigate to={"/login"} />;

  return (
    <div className="lg:w-140 max-lg:px-4 mx-auto flex flex-col gap-4 mt-10">
      <h1 className="text-center">
        <FormattedMessage defaultMessage="New Room" />
      </h1>
      <div>
        <div className="font-medium mb-2">
          <FormattedMessage defaultMessage="Room name" />
        </div>
        <input
          type="text"
          placeholder={formatMessage({
            defaultMessage: "Insert cool name here",
            description: "Placeholder text for room name",
          })}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full"
        />
      </div>
      <div>
        <div className="font-medium mb-2">
          <FormattedMessage defaultMessage="Scheduled Time (optional)" />
        </div>
        <input
          type="datetime-local"
          placeholder={formatMessage({ defaultMessage: "Time", description: "Date time input placeholder text" })}
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full"
        />
      </div>
      <div>
        <div className="font-medium mb-2">
          <FormattedMessage defaultMessage="Room Description (Optional 140 chars)" />
        </div>
        <input
          type="text"
          placeholder={formatMessage({
            defaultMessage: "Short description about the room",
            description: "Placeholder text for room description",
          })}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full"
          maxLength={140}
        />
      </div>
      <BannerEditor onImage={setImage} onColor={setColor} />
      <div>
        <Collapsed
          header={(open) => (
            <div className="flex gap-2 items-center font-medium mb-2">
              <FormattedMessage defaultMessage="Custom Relays (Optional)" />
              <Icon name="chevron" className={`${open ? "rotate-90" : "-rotate-90"} transition`} size={16} />
            </div>
          )}
        >
          <div className="flex flex-col gap-2">
            <p className="text-off-white">
              <FormattedMessage defaultMessage="If you'd like to broadcast only to specific relays, you can add those here." />
            </p>
            <div className="flex gap-2 items-center">
              <input
                className="grow"
                type="text"
                placeholder="wss://example.com"
                value={relayInput}
                onChange={(e) => setRelayInput(e.target.value)}
              />
              <SecondaryButton
                onClick={() => {
                  const cleaned = sanitizeRelayUrl(relayInput);
                  if (cleaned && (cleaned.startsWith("ws://") || cleaned.startsWith("wss://"))) {
                    setRelays([...relays, cleaned]);
                    setRelayInput("");
                  }
                }}
              >
                <FormattedMessage defaultMessage="Add" />
              </SecondaryButton>
            </div>
            {relays.map((a) => (
              <div key={a} className="flex gap-2 items-center">
                <div className="bg-foreground px-4 py-3 rounded-xl select-none grow text-off-white">{a}</div>
                <SecondaryButton className="text-delete" onClick={() => setRelays((s) => s.filter((b) => b !== a))}>
                  <FormattedMessage defaultMessage="Remove" />
                </SecondaryButton>
              </div>
            ))}
          </div>
        </Collapsed>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <p className="font-medium mb-2">
            <FormattedMessage defaultMessage="Create room video stream" />
          </p>
          <input type="checkbox" checked={hls} onChange={(e) => setHls(e.target.checked)} />
        </div>

        <Collapsed
          header={(open) => (
            <small className="flex gap-2 items-center">
              <FormattedMessage defaultMessage="What is this?" />
              <Icon name="chevron" className={`${open ? "rotate-90" : "-rotate-90"} transition`} size={16} />
            </small>
          )}
        >
          <small className="text-off-white">
            <FormattedMessage defaultMessage="Enabling this option will create a video stream of this nest, allowing people to watch the nest on zap.stream / Amethyst / nostrudel.ninja / sats.gg or any client that supports Live Activities (NIP-53), they will also be able to chat in the room while watching." />
          </small>
          <br />
          <small className="text-off-white">
            <FormattedMessage defaultMessage="If this option is disabled they will still be able to see the nest on those clients and chat but not hear the room audio." />
          </small>
        </Collapsed>
      </div>
      <RoomCard event={dmeoRoom} showDescription={true} />
      <div className="flex gap-2 justify-center">
        <Link to="/">
          <SecondaryButton>
            <FormattedMessage defaultMessage="Cancel" />
          </SecondaryButton>
        </Link>
        <PrimaryButton onClick={async () => await createRoom()}>
          <FormattedMessage defaultMessage="Create" />
        </PrimaryButton>
      </div>
    </div>
  );
}
