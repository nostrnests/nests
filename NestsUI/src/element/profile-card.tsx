import { hexToBech32 } from "@snort/shared"
import { CachedMetadata } from "@snort/system"
import Avatar from "./avatar"
import { PrimaryButton } from "./button"
import { useNestsApi } from "../hooks/useNestsApi"
import { useEnsureRoom } from "@livekit/components-react"

export default function ProfileCard({ pubkey, profile }: { pubkey: string, profile?: CachedMetadata }) {
    const api = useNestsApi();
    const room = useEnsureRoom();

    async function bringToStage() {
        await api.updatePermissions(room.name, pubkey, true);
    }

    return <>
        <div className="flex justify-between items-center">
            <div className="flex gap-2 items-center">
                <Avatar pubkey={pubkey} size={40} />
                <div>
                    {profile?.display_name ?? profile?.name ?? hexToBech32("npub", pubkey).slice(0, 12)}
                </div>
            </div>
            <PrimaryButton>
                Follow
            </PrimaryButton>
        </div>
        <p>
            {profile?.about}
        </p>
        <div>
            <PrimaryButton onClick={bringToStage}>
                Bring to Stage
            </PrimaryButton>
        </div>
    </>
}