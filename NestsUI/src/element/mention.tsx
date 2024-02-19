import { NostrLink } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import DisplayName from "./display-name";

export default function Mention({ link }: { link: NostrLink }) {
    const profile = useUserProfile(link.id);
    return <DisplayName pubkey={link.id} profile={profile} />
}