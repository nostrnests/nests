import { FormattedMessage, useIntl } from "react-intl";
import { PrimaryButton, SecondaryButton } from "./button";
import { EventPublisher, NostrEvent, NostrLink } from "@snort/system";
import { useCopy } from "../hooks/useCopy";
import Icon from "../icon";
import useEventBuilder from "../hooks/useEventBuilder";
import { useState } from "react";
import { extractStreamInfo } from "../utils";
import { useUserProfile } from "@snort/system-react";
import { getDisplayName } from "./display-name";
import { hexToBech32 } from "@snort/shared";

export default function ShareModal({ event, onClose }: { event: NostrEvent; onClose: () => void }) {
  const link = NostrLink.fromEvent(event);
  const { formatMessage } = useIntl();
  const { copy, copied } = useCopy();
  const { system, signer, pubkey } = useEventBuilder();
  const { title, status, starts, ends, id } = extractStreamInfo(event);
  const profile = useUserProfile(event.pubkey);

  const url = `${window.location.protocol}//${window.location.host}/${link.encode()}`;

  function noteTemplate() {
    switch (status) {
      case "live": {
        return formatMessage(
          { defaultMessage: '"{title}" nest is live! Come join 🤗\n{url}' },
          {
            title,
            url,
          },
        );
      }
      case "planned": {
        return formatMessage(
          { defaultMessage: '{title}\n{url}' },
          {
            title,
            url
          },
        );
      }
    }
  }
  const [note, setNote] = useState(noteTemplate());

  async function iCal() {
    const ical = await import("ical-generator");
    const calendar = ical.default({
      name: "nostrnests.com"
    });
    calendar.method(ical.ICalCalendarMethod.REQUEST);
    calendar.createEvent({
      id,
      start: new Date(Number(starts) * 1000),
      end: ends ? new Date(Number(ends) * 1000) : null,
      summary: title,
      organizer: {
        name: getDisplayName(profile, event.pubkey),
        email: `nostr:${hexToBech32("npub", event.pubkey)}`
      },
      url
    });

    const evBlob = new Blob([calendar.toString()], {
      type: "text/calendar; charset=utf-8"
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(evBlob);
    a.download = `${title}.ics`;
    a.click();
  }

  return (
    <>
      <h2 className="text-center mb-4">
        <FormattedMessage defaultMessage="Share Room" />
      </h2>
      <div className="flex flex-col gap-4">
        <textarea rows={5} value={note} onChange={(e) => setNote(e.target.value)} />
        <PrimaryButton
          onClick={async () => {
            if (!signer || !pubkey || !note) return;

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
          <SecondaryButton onClick={iCal}>
            <FormattedMessage defaultMessage="iCal" />
          </SecondaryButton>
        </div>
      </div>
    </>
  );
}
