import { NostrLink, NostrPrefix, tryParseNostrLink } from "@snort/system";
import { useParams } from "react-router-dom";
import ProfilePage from "./profile";
import Room from "./room";
import { useEffect, useState } from "react";
import { fetchNip05Pubkey } from "@snort/shared";
import { useIntl } from "react-intl";

export default function NostrRoute() {
  const { id } = useParams();
  const { formatMessage } = useIntl();
  const [link, setLink] = useState<NostrLink | undefined>();
  const [error, setError] = useState("");

  async function loadLink(id?: string) {
    try {
      if (id?.startsWith("npub") || id?.startsWith("nprofile") || id?.startsWith("naddr") || id?.startsWith("nevent")) {
        const parseLink = tryParseNostrLink(id ?? "");
        if (parseLink) {
          setLink(parseLink);
        }
      } else if (id) {
        const [name, domain] = id.includes("@") ? id.split("@") : [id, "nostrnests.com"];
        const match = await fetchNip05Pubkey(name, domain);
        if (match) {
          setLink(NostrLink.publicKey(match));
        } else {
          throw new Error(
            formatMessage({
              defaultMessage: "Invalid nostr address",
            }),
          );
        }
      }
    } catch (e) {
      console.error(e);
      if (e instanceof Error) {
        setError(e.message);
      } else if (typeof e === "string") {
        setError(e);
      }
    }
  }

  useEffect(() => {
    loadLink(id);
  }, [id]);
  if (error) return <b className="text-red">{error}</b>;
  if (!link) return;

  switch (link.type) {
    case NostrPrefix.PublicKey:
    case NostrPrefix.Profile: {
      return <ProfilePage link={link} header={true} />;
    }
    case NostrPrefix.Address: {
      return <Room />;
    }
  }
}
