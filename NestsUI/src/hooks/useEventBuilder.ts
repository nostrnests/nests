import { Nip7Signer } from "@snort/system";
import { SnortContext } from "@snort/system-react";
import { useContext } from "react";

export default function useEventBuilder() {
  const system = useContext(SnortContext);
  const signer = new Nip7Signer();

  return { system, signer };
}
