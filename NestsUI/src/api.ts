import { base64 } from "@scure/base";
import { EventBuilder, EventKind, Nip7Signer } from "@snort/system";
import { ApiHost } from "./const";

export async function getToken(room: string) {
  const url = `${ApiHost}/api/v1/nests/auth?room=${room}`;
  const signer = new Nip7Signer();
  await signer.init();

  const builder = new EventBuilder();
  builder.tag(["u", url]);
  builder.tag(["method", "GET"]);
  builder.kind(EventKind.HttpAuthentication);

  const ev = JSON.stringify(await builder.buildAndSign(signer));
  const rsp = await fetch(url, {
    headers: {
      authorization: `Nostr ${base64.encode(new TextEncoder().encode(ev))}`,
      accept: "application/json",
    },
  });
  if (rsp.ok) {
    return (await rsp.json()) as { token: string };
  }
}
