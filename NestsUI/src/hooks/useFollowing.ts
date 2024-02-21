import { useLogin } from "../login";
import { EventPublisher } from "@snort/system";
import useEventBuilder from "./useEventBuilder";

export default function useFollowing() {
  const login = useLogin();
  const { system, signer } = useEventBuilder();

  const updateFollows = async (f: Array<[string, string]>) => {
    if (!signer || !login.pubkey) return;
    const pub = new EventPublisher(signer, login.pubkey);
    return await pub.contactList(f, login.relays);
  };

  return {
    follows: login.follows,
    isFollowing: (pk: string) => {
      return login.follows.some((a) => a[0] === "p" && a[1] === pk);
    },
    follow: async (pk: string) => {
      const ev = await updateFollows([...login.follows, ["p", pk]]);
      if (ev) {
        await system.BroadcastEvent(ev);
      }
    },
    unfollow: async (pk: string) => {
      const ev = await updateFollows([...login.follows.filter((a) => a[1] !== pk)]);
      if (ev) {
        await system.BroadcastEvent(ev);
      }
    },
  };
}
