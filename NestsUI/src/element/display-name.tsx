import { hexToBech32 } from "@snort/shared";
import { CachedMetadata } from "@snort/system";
import { HTMLProps } from "react";

export default function DisplayName({
  pubkey,
  profile,
  ...props
}: { pubkey: string; profile?: CachedMetadata } & HTMLProps<HTMLSpanElement>) {
  return <span {...props}>{profile?.display_name ?? profile?.name ?? hexToBech32("npub", pubkey).slice(0, 12)}</span>;
}
