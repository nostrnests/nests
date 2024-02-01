import { NostrEvent, NostrLink } from "@snort/system";
import ListenerCount from "./listener-count";
import Avatar from "./avatar";
import { useUserProfile } from "@snort/system-react";
import { hexToBech32 } from "@snort/shared";
import { Link, useNavigate } from "react-router-dom";
import { AvatarStack } from "./avatar-stack";
import classNames from "classnames";
import { useNestsApi } from "../hooks/useNestsApi";
import useRoomPresence from "../hooks/useRoomPresence";

export default function RoomCard({ event, inRoom, className, link, join }: { event: NostrEvent, inRoom?: boolean, className?: string, link?: boolean, join?: boolean }) {
    const profile = useUserProfile(event.pubkey);
    const title = event.tags.find(a => a[0] === "title")?.[1];
    const navigate = useNavigate();
    const api = useNestsApi();

    const eventLink = NostrLink.fromEvent(event);
    const presence = useRoomPresence(eventLink);
    console.debug(presence);

    async function joinRoom() {
        const id = event.tags.find(a => a[0] === "d")?.[1];
        if (id) {
            const { token } = await api.joinRoom(id);
            navigate(`/room/${NostrLink.fromEvent(event).encode()}`, {
                state: {
                    event: event,
                    token
                }
            });
        }
    }

    const inner = () => {
        return <div className={classNames("px-6 py-4 rounded-3xl flex flex-col gap-3 bg-gradient-1", { "pt-20": inRoom, "cursor-pointer": (link ?? true) || join }, className)} onClick={() => {
            if (join) {
                joinRoom();
            }
        }}>
            <div className="flex justify-between">
                <ListenerCount n={presence.length} />
                {!inRoom && <div>
                    <AvatarStack>
                        {presence.map(a => <Avatar pubkey={a.pubkey} outline={2} size={32} />)}
                    </AvatarStack>
                </div>}
            </div>
            <div className="text-2xl font-semibold">
                {title}
            </div>
            {!inRoom && <div className="flex gap-2 items-center">
                <Avatar pubkey={event.pubkey} outline={2} size={32} />
                Hosted by {profile?.display_name ?? profile?.name ?? hexToBech32("npub", event.pubkey)}
            </div>}
        </div>
    }

    if ((link ?? true) && !join) {
        return <Link to={`/room/${NostrLink.fromEvent(event).encode()}`} state={{ event }}>
            {inner()}
        </Link>
    }
    return inner();
}