import { FormattedMessage, useIntl } from "react-intl";
import { PrimaryButton, SecondaryButton } from "./button";
import { EventPublisher, NostrEvent, NostrLink } from "@snort/system";
import { useNostrRoom } from "../hooks/nostr-room-context";
import { useCopy } from "../hooks/useCopy";
import Icon from "../icon";
import useEventBuilder from "../hooks/useEventBuilder";
import { useState } from "react";

export default function ShareModal({ event, onClose }: { event: NostrEvent; onClose: () => void }) {
  const link = NostrLink.fromEvent(event);
  const { formatMessage } = useIntl();
  const roomContext = useNostrRoom();
  const { copy, copied } = useCopy();
  const { system, signer, pubkey } = useEventBuilder();

  const url = `${window.location.protocol}//${window.location.host}/${link.encode()}`;

  const formattedDefaultMsg = formatMessage(
    { defaultMessage: '"{room_name}" nest is live! Come join 🤗\n{url}' },
    {
      room_name: roomContext.event.tags.find((a) => a[0] === "title")?.[1],
      url,
    },
  );
  const [note, setNote] = useState(formattedDefaultMsg);

  return (
    <>
      <h2 className="text-center mb-4">
        <FormattedMessage defaultMessage="Share Room" />
      </h2>
      <div className="flex flex-col gap-4">
        <textarea rows={5} value={note} onChange={(e) => setNote(e.target.value)} />
        <PrimaryButton
          onClick={async () => {
            if (!signer || !pubkey) return;

            const eb = new EventPublisher(signer, pubkey);
            const ev = await eb.note(note);

            await system.BroadcastEvent(ev);
            onClose();
          }}
        >
          <FormattedMessage defaultMessage="Broadcast to Nostr" />
        </PrimaryButton>
        <hr />
        <div className="flex gap-2">
          <SecondaryButton
            onClick={async () => {
              await copy(url);
            }}
          >
            <div className="flex gap-2 items-center">
              <Icon name={copied ? "check" : "copy-solid"} />
              <FormattedMessage defaultMessage="Copy URL" />
            </div>
          </SecondaryButton>
        </div>
      </div>
    </>
  );
}
