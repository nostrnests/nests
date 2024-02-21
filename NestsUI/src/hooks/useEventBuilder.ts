import { SnortContext } from "@snort/system-react";
import { useContext } from "react";
import { useLogin } from "../login";
import { EventPublisher } from "@snort/system";

export default function useEventBuilder() {
  const system = useContext(SnortContext);
  const login = useLogin();

  return {
    system,
    signer: login.signer,
    pubkey: login.pubkey,
    publisher: login.signer && login.pubkey ? new EventPublisher(login.signer, login.pubkey) : undefined
  };
}
