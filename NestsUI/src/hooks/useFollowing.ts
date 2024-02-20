import { useEffect, useMemo, useState } from "react";
import { useLogin } from "../login";
import { EventKind, EventPublisher, RequestBuilder, parseRelaysFromKind } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import useEventBuilder from "./useEventBuilder";

export default function useFollowing() {
    const { pubkey } = useLogin();
    const [follows, setFollows] = useState<Array<[string, string]>>([]);
    const { system, signer } = useEventBuilder();

    const sub = useMemo(() => {
        if (pubkey) {
            const rb = new RequestBuilder(`follows:${pubkey.slice(0, 12)}`);
            rb.withFilter()
                .authors([pubkey])
                .kinds([EventKind.ContactList, EventKind.Relays]);

            return rb;
        }
    }, [pubkey]);

    const contacts = useRequestBuilder(sub);
    const relays = useMemo(() => {
        if (contacts.length > 0) {
            const fromEvent = contacts.reduce((acc, v) => acc.created_at > v.created_at ? acc : v, contacts[0]);
            return parseRelaysFromKind(fromEvent);
        }
    }, [contacts]);

    useEffect(() => {
        if (contacts.length > 0) {
            const pTags = contacts[0].tags.filter(a => a[0] === "p");
            setFollows(pTags as Array<[string, string]>);
        }
    }, [contacts]);

    const updateFollows = async (f: Array<[string, string]>) => {
        if (!signer || !pubkey) return;
        const pub = new EventPublisher(signer, pubkey);
        return await pub.contactList(f, relays ? Object.fromEntries(relays.map(a => [a.url, a.settings])) : undefined);
    };
    return {
        follows,
        isFollowing: (pk: string) => {
            return follows.some(a => a[0] === "p" && a[1] === pk);
        },
        follow: async (pk: string) => {
            const ev = await updateFollows([...follows, ["p", pk]]);
            if (ev) {
                await system.BroadcastEvent(ev);
            }
        },
        unfollow: async (pk: string) => {
            const ev = await updateFollows([...follows.filter(a => a[1] !== pk)]);
            if (ev) {
                await system.BroadcastEvent(ev);
            }
        }
    };
}