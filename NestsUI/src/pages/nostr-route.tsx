import { NostrPrefix, tryParseNostrLink } from "@snort/system";
import { useParams } from "react-router-dom";
import ProfilePage from "./profile";
import Room from "./room";

export default function NostrRoute() {
  const { id } = useParams();
  const link = tryParseNostrLink(id ?? "");

  if (!link) return;

  switch (link.type) {
    case NostrPrefix.PublicKey:
    case NostrPrefix.Profile: {
      return <ProfilePage link={link} />;
    }
    case NostrPrefix.Address: {
      return <Room />;
    }
  }
}
