import { hexToBech32, unwrap } from "@snort/shared";
import { CachedMetadata } from "@snort/system";
import { HTMLProps } from "react";

export const getDisplayName = (profile: CachedMetadata | undefined, pubkey: string) => {
  if ((profile?.display_name?.length ?? 0) > 0) {
    return unwrap(profile?.display_name);
  } else if ((profile?.name?.length ?? 0) > 0) {
    return unwrap(profile?.name);
  }
  return hexToBech32("npub", pubkey).slice(0, 12);
};
export default function DisplayName({
  pubkey,
  profile,
  ...props
}: { pubkey: string; profile?: CachedMetadata } & HTMLProps<HTMLSpanElement>) {
  return <span {...props}>{getDisplayName(profile, pubkey)}</span>;
}
