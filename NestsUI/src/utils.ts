import { removeUndefined, sanitizeRelayUrl } from "@snort/shared";
import { snortSystem } from "./main";

export function updateRelays(relays: Array<string>) {
  relays = removeUndefined(relays.map((a) => sanitizeRelayUrl(a)));
  console.debug("Connecting to relays for room", relays);
  relays.forEach((a) => snortSystem.ConnectToRelay(a, { read: true, write: true }));

  const removing = [...snortSystem.pool].filter(([k]) => !relays.some((b) => b === k)).map(([k]) => k);
  console.debug("Disconnecting relays for room", removing);
  removing.forEach((a) => snortSystem.DisconnectRelay(a));
}
