import { useUserProfile } from "@snort/system-react";
import classNames from "classnames";

export default function Avatar({ pubkey, size, className, outline }: { pubkey: string, size?: number, className?: string, outline?: number }) {
    const profile = useUserProfile(pubkey);
    function getAvatar() {
        if ((profile?.picture?.length ?? 0) > 0) {
            return profile?.picture;
        }
        return `https://robohash.v0l.io/${pubkey}.png`;
    }
    return <img width={size ?? 20} height={size ?? 20} className={classNames(`aspect-square rounded-full`, className, outline ? `outline outline-${outline}` : undefined)} src={getAvatar()}></img>
}