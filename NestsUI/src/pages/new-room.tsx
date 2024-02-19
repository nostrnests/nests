import { useCallback, useContext, useMemo, useState } from "react";
import { PrimaryButton, SecondaryButton } from "../element/button";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { NestsApi } from "../api";
import { ApiUrl, DefaultRelays, ROOM_KIND } from "../const";
import { EventBuilder, NostrLink } from "@snort/system";
import { unixNow } from "@snort/shared";
import { SnortContext } from "@snort/system-react";
import RoomCard from "../element/room-card";
import { useLogin } from "../login";
import BannerEditor from "../element/banner-editor";
import { FormattedMessage, useIntl } from "react-intl";

export default function NewRoom() {
  const system = useContext(SnortContext);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [time, setTime] = useState<string>();
  const [color, setColor] = useState<string>();
  const [image, setImage] = useState<string>();
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
        .tag(["relays", ...DefaultRelays]);

      return eb;
    },
    [login.pubkey, name, desc, color, time, image],
  );

  const dmeoRoom = useMemo(() => {
    return buildEvent("demo").build();
  }, [buildEvent]);

  async function createRoom() {
    if (!login.signer) return;
    const api = new NestsApi(ApiUrl, login.signer);
    const room = await api.createRoom();

    const eb = buildEvent(room.roomId);
    room.endpoints.forEach((e) => eb.tag(["streaming", e]));

    const ev = await eb.buildAndSign(login.signer);
    await system.BroadcastEvent(ev);

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
    <div className="lg:w-[35rem] max-lg:px-4 mx-auto flex flex-col gap-4 mt-10">
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
      <RoomCard event={dmeoRoom} />
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
