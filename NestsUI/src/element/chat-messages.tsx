import { EventKind, NostrEvent, NostrLink, RequestBuilder } from "@snort/system";
import { useRequestBuilder, useUserProfile } from "@snort/system-react";
import { useMemo } from "react";
import Avatar from "./avatar";
import { hexToBech32 } from "@snort/shared";

export default function ChatMessages({ link }: { link: NostrLink }) {
    const sub = useMemo(() => {
        const rb = new RequestBuilder(`chat-messages:${link.id}`);
        rb.withOptions({ leaveOpen: true })
            .withFilter()
            .kinds([1311 as EventKind])
            .replyToLink([link])
            .limit(200);

        return rb;
    }, [link]);

    const messages = useRequestBuilder(sub);

    return <div className="flex flex-col-reverse gap-3 px-5">
        {messages.map(a => <ChatMessage event={a} key={a.id} />)}
    </div>
}

function ChatMessage({ event }: { event: NostrEvent }) {
    const profile = useUserProfile(event.pubkey);

    return <div className="grid grid-cols-[32px_auto] gap-2">
        <Avatar pubkey={event.pubkey} size={32} />
        <div className="flex flex-col text-sm">
            <div className="text-medium leading-8">
                {profile?.display_name ?? profile?.name ?? hexToBech32("nput", event.pubkey).slice(0, 12)}
            </div>
            {event.content}
        </div>
    </div>
}