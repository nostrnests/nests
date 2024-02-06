import { useMaybeRoomContext } from "@livekit/components-react";
import Icon from "../icon";

export default function ListenerCount({ n }: { n: number }) {
    const room = useMaybeRoomContext();

    return <div className="px-2 py-1 flex gap-1 items-center bg-white rounded-full text-black">
        <Icon name="people" />
        <span>
            {room?.numParticipants ?? n}
        </span>
    </div>
}