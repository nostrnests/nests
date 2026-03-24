import { base64 } from "@scure/base";
import { EventBuilder, EventKind, type EventSigner } from "@snort/system";

/**
 * Authenticate with a moq-auth service using NIP-98.
 *
 * @param authUrl - The moq-auth service URL (e.g., "https://moq-auth.example.com")
 * @param signer - Nostr event signer
 * @param namespace - MoQ namespace to request access to
 * @param publish - Whether to request publish rights
 * @returns JWT token for moq-relay
 */
export async function authenticateWithMoqRelay(
  authUrl: string,
  signer: EventSigner,
  namespace: string,
  publish: boolean,
): Promise<string> {
  const url = `${authUrl}/auth`;

  // Build NIP-98 auth event
  const builder = new EventBuilder();
  builder.tag(["u", url]);
  builder.tag(["method", "POST"]);
  builder.kind(EventKind.HttpAuthentication);
  const ev = JSON.stringify(await builder.buildAndSign(signer));
  const authHeader = `Nostr ${base64.encode(new TextEncoder().encode(ev))}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify({
      namespace,
      publish,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`moq-auth failed (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as { token: string };
  return data.token;
}
