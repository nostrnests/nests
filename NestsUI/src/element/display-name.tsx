import { hexToBech32 } from "@snort/shared";
import { CachedMetadata } from "@snort/system";
import { HTMLProps } from "react";

export default function DisplayName({
  pubkey,
  profile,
  ...props
}: { pubkey: string; profile?: CachedMetadata } & HTMLProps<HTMLSpanElement>) {
  const getName = () => {
    if ((profile?.display_name?.length ?? 0) > 0) {
      return profile?.display_name;
    } else if ((profile?.name?.length ?? 0) > 0) {
      return profile?.name;
    }
    return hexToBech32("npub", pubkey).slice(0, 12);
  };
  return <span {...props}>{getName()}</span>;
}
