import { EventExt, NostrEvent, NostrLink, NostrPrefix } from "@snort/system";
import { ReactNode, useState } from "react";
import Button, { PrimaryButton, SecondaryButton } from "./button";
import useEventBuilder from "../hooks/useEventBuilder";
import { unixNow } from "@snort/shared";
import { useNavigate } from "react-router-dom";
import BannerEditor from "./banner-editor";
import { FormattedMessage, useIntl } from "react-intl";
import { useNostrRoom } from "../hooks/nostr-room-context";
import Mention from "./mention";
import Avatar from "./avatar";
import IconButton from "./icon-button";
import { useNestsApi } from "../hooks/useNestsApi";

type EditTab = "room" | "admin";

export default function EditRoom({ event, onClose }: { event: NostrEvent; onClose: () => void }) {
  const [tab, setTab] = useState<EditTab>("room");

  function renderTab() {
    switch (tab) {
      case "room": {
        return <EditRoomDetails event={event} onClose={onClose} />;
      }
      case "admin": {
        return <EditRoomAdmin />;
      }
    }
  }

  function tabElement(id: EditTab, name: ReactNode) {
    return (
      <div
        onClick={() => setTab(id)}
        className={`${tab === id ? "font-bold text-highlight " : " "}bg-foreground-2 rounded-full px-4 py-2 cursor-pointer`}
      >
        {name}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2>
        <FormattedMessage defaultMessage="Room Settings" />
      </h2>
      <div className="flex gap-2">
        {tabElement("room", <FormattedMessage defaultMessage="Details" />)}
        {tabElement("admin", <FormattedMessage defaultMessage="Permissions" />)}
      </div>
      {renderTab()}
    </div>
  );
}

function EditRoomDetails({ event, onClose }: { event: NostrEvent; onClose: () => void }) {
  const [name, setName] = useState(event.tags.find((a) => a[0] === "title")?.[1] ?? "");
  const [desc, setDesc] = useState(event.tags.find((a) => a[0] === "description")?.[1] ?? "");
  const [color, setColor] = useState(event.tags.find((a) => a[0] === "color")?.[1]);
  const [image, setImage] = useState(event.tags.find((a) => a[0] === "image")?.[1]);
  const { system, signer } = useEventBuilder();
  const navigate = useNavigate();
  const { formatMessage } = useIntl();

  return (
    <>
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
      <BannerEditor onImage={setImage} onColor={setColor} initialColor={color} initialImage={image} />
      <PrimaryButton
        onClick={async () => {
          const updateOrAddTag = (tag: string, value: string) => {
            const oldTag = event.tags.find((a) => a[0] === tag);
            if (oldTag) {
              oldTag[1] = value;
            } else {
              event.tags.push([tag, value]);
            }
          };
          updateOrAddTag("title", name);
          updateOrAddTag("summary", desc);
          updateOrAddTag("color", color ?? "");
          updateOrAddTag("image", image ?? "");

          event.created_at = unixNow();
          event.id = EventExt.createId(event);
          const signed = await signer?.sign(event);
          console.debug(signed);
          if (signed) {
            await system.BroadcastEvent(signed);
            onClose();
          }
        }}
      >
        <FormattedMessage defaultMessage="Save" />
      </PrimaryButton>
      <SecondaryButton onClick={onClose}>
        <FormattedMessage defaultMessage="Cancel" />
      </SecondaryButton>
      <hr />
      <Button
        className="bg-delete rounded-full"
        onClick={async () => {
          const status = event.tags.find((a) => a[0] === "status")!;
          if (status[1] !== "ended") {
            status[1] = "ended";
            event.tags.push(["ends", unixNow().toString()]);
            event.created_at = unixNow();
            event.id = EventExt.createId(event);
            const signed = await signer?.sign(event);
            console.debug(signed);
            if (signed) {
              await system.BroadcastEvent(signed);
              navigate("/");
            }
          }
        }}
      >
        <FormattedMessage defaultMessage="Close Room" />
      </Button>
    </>
  );
}

function EditRoomAdmin() {
  const roomContext = useNostrRoom();
  const api = useNestsApi();
  const link = NostrLink.fromEvent(roomContext.event);
  return (
    <>
      <h2>
        <FormattedMessage defaultMessage="Admins" />
      </h2>
      <div className="flex flex-col gap-2">
        {roomContext.info?.admins
          .filter((a) => a !== roomContext.event.pubkey)
          .map((a) => (
            <div key={`admin-${a}`} className="flex justify-between items-center bg-foreground-2 py-3 px-4 rounded-2xl">
              <div className="flex gap-2 items-center">
                <Avatar pubkey={a} link={false} size={40} />
                <Mention link={new NostrLink(NostrPrefix.PublicKey, a)} />
              </div>
              <IconButton
                name="trash"
                className="rounded-xl !bg-delete"
                onClick={async () => {
                  await api.updatePermissions(link.id, a, {
                    is_admin: false,
                  });
                }}
              />
            </div>
          ))}
      </div>
      <h2>
        <FormattedMessage defaultMessage="Speakers" />
      </h2>
      <div className="flex flex-col gap-2">
        {roomContext.info?.speakers.map((a) => (
          <div key={`speaker-${a}`} className="flex justify-between items-center bg-foreground-2 py-3 px-4 rounded-2xl">
            <div className="flex gap-2 items-center">
              <Avatar pubkey={a} link={false} size={40} />
              <Mention link={new NostrLink(NostrPrefix.PublicKey, a)} />
            </div>
            <IconButton
              name="trash"
              className="rounded-xl !bg-delete"
              onClick={async () => {
                await api.updatePermissions(link.id, a, {
                  can_publish: false,
                });
              }}
            />
          </div>
        ))}
      </div>
    </>
  );
}
