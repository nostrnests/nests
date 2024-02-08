import { useCallback, useContext, useMemo, useState } from "react";
import Button, { PrimaryButton } from "../element/button";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { NestsApi } from "../api";
import { ApiUrl, DefaultRelays } from "../const";
import { EventBuilder, EventKind, NostrLink } from "@snort/system";
import { unixNow } from "@snort/shared";
import { SnortContext } from "@snort/system-react";
import RoomCard from "../element/room-card";
import { useLogin } from "../login";
import BannerEditor from "../element/banner-editor";

export default function NewRoom() {
  const system = useContext(SnortContext);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [time, setTime] = useState<string>();
  const [color, setColor] = useState<string>();
  const [image, setImage] = useState<string>();
  const navigate = useNavigate();
  const login = useLogin();

  const buildEvent = useCallback(
    (id: string) => {
      const eb = new EventBuilder();
      eb.pubKey(login.pubkey ?? "00")
        .kind(30_312 as EventKind)
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
      <h1 className="text-center">New Room</h1>
      <div>
        <div className="font-medium mb-2">Room name</div>
        <input
          type="text"
          placeholder="Insert cool name here"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full"
        />
      </div>
      <div>
        <div className="font-medium mb-2">Scheduled Time (optional)</div>
        <input
          type="datetime-local"
          placeholder="Time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full"
        />
      </div>
      <div>
        <div className="font-medium mb-2">Room Description (Optional 140 chars)</div>
        <input
          type="text"
          placeholder="Discussing macro and other boring stuff"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full"
        />
      </div>
      <BannerEditor onImage={setImage} onColor={setColor} />
      <RoomCard event={dmeoRoom} />
      <div className="flex gap-2 justify-center">
        <Link to="/">
          <Button className="rounded-full bg-foreground-2">Cancel</Button>
        </Link>
        <PrimaryButton onClick={async () => await createRoom()}>Create</PrimaryButton>
      </div>
    </div>
  );
}
