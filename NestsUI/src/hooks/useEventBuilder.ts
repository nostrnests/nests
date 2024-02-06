import { SnortContext } from "@snort/system-react";
import { useContext } from "react";
import { useLogin } from "../login";

export default function useEventBuilder() {
  const system = useContext(SnortContext);
  const login = useLogin();

  return { system, signer: login.signer };
}
