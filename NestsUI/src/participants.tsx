import { useParticipants } from "@livekit/components-react";
import { useUserProfile } from "@snort/system-react";
import { LocalParticipant, RemoteParticipant } from "livekit-client";

export default function NostrParticipants() {
    const participants = useParticipants();

    return <div className="flex flex-wrap gap-4 p-2">
        {participants.map(a => {
            return <NostrParticipant p={a} key={a.sid} />
        })}
    </div>
}

function NostrParticipant({ p }: { p: RemoteParticipant | LocalParticipant }) {
    const profile = useUserProfile(p.identity);
    return <div className="flex items-center flex-col gap-2">
        <img className={`w-20 h-20 aspect-square rounded-full${p.isSpeaking ? " outline outline-2" : ""}`} src={profile?.picture}></img>
        <div>
            {profile?.display_name ?? profile?.name}
        </div>
    </div>
}