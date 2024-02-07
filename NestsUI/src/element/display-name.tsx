import { hexToBech32 } from "@snort/shared";
import { CachedMetadata } from "@snort/system";

export default function DisplayName({ pubkey, profile }: { pubkey: string; profile?: CachedMetadata }) {
  return <span>{profile?.display_name ?? profile?.name ?? hexToBech32("npub", pubkey).slice(0, 12)}</span>;
}
