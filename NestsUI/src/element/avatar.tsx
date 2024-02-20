import { hexToBech32 } from "@snort/shared";
import { useUserProfile } from "@snort/system-react";
import classNames from "classnames";
import { Link } from "react-router-dom";

export default function Avatar({
  pubkey,
  size,
  className,
  outline,
  link,
}: {
  pubkey: string;
  size?: number;
  className?: string;
  outline?: number;
  link: boolean;
}) {
  const profile = useUserProfile(pubkey.startsWith("guest") ? undefined: pubkey);
  function getAvatar() {
    if ((profile?.picture?.length ?? 0) > 0) {
      return profile?.picture;
    }
    return `https://robohash.v0l.io/${pubkey}.png`;
  }
  const inner = (
    <img
      width={size ?? 20}
      height={size ?? 20}
      className={classNames(
        `aspect-square rounded-full object-cover`,
        className,
        outline ? `outline outline-${outline}` : undefined,
      )}
      src={getAvatar()}
    ></img>
  );
  if (link) {
    return <Link to={`/${hexToBech32("npub", pubkey)}`}>{inner}</Link>;
  }
  return inner;
}
