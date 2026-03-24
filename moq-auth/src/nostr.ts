import { schnorr } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

/**
 * Minimal Nostr event structure for NIP-98 verification.
 */
export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

/**
 * Compute the event ID (sha256 of serialized event).
 */
function computeEventId(event: NostrEvent): string {
  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
  return bytesToHex(sha256(new TextEncoder().encode(serialized)));
}

/**
 * Verify a Nostr event signature.
 * Returns true if the event ID matches and the schnorr signature is valid.
 */
export function verifyEvent(event: NostrEvent): boolean {
  const computedId = computeEventId(event);
  if (computedId !== event.id) {
    return false;
  }
  try {
    return schnorr.verify(event.sig, event.id, event.pubkey);
  } catch {
    return false;
  }
}

/**
 * Get a tag value from a Nostr event by tag name.
 * Returns the first value (index 1) of the first matching tag, or undefined.
 */
export function getTagValue(event: NostrEvent, name: string): string | undefined {
  const tag = event.tags.find((t) => t[0] === name);
  return tag?.[1];
}

/**
 * NIP-98 HTTP Auth event kind.
 */
export const NIP98_KIND = 27235;

/**
 * Maximum age of a NIP-98 event in seconds.
 */
const MAX_EVENT_AGE_SECONDS = 120;

/**
 * Validate a NIP-98 HTTP authentication event.
 *
 * Checks:
 * - Valid signature
 * - Correct kind (27235)
 * - Timestamp within 120 seconds
 * - URL path matches
 * - HTTP method matches
 *
 * Returns the pubkey on success, throws on failure.
 */
export function validateNip98(
  event: NostrEvent,
  expectedUrl: string,
  expectedMethod: string,
): string {
  // Verify signature
  if (!verifyEvent(event)) {
    throw new AuthError("Invalid event signature");
  }

  // Check kind
  if (event.kind !== NIP98_KIND) {
    throw new AuthError(`Invalid event kind: expected ${NIP98_KIND}, got ${event.kind}`);
  }

  // Check timestamp
  const now = Math.floor(Date.now() / 1000);
  const age = Math.abs(now - event.created_at);
  if (age > MAX_EVENT_AGE_SECONDS) {
    throw new AuthError(`Event too old: ${age}s (max ${MAX_EVENT_AGE_SECONDS}s)`);
  }

  // Check URL
  const eventUrl = getTagValue(event, "u");
  if (!eventUrl) {
    throw new AuthError("Missing 'u' tag");
  }

  // Compare URL paths (ignore host differences for flexibility)
  const expectedPath = new URL(expectedUrl).pathname;
  const eventPath = new URL(eventUrl).pathname;
  if (expectedPath !== eventPath) {
    throw new AuthError(`URL path mismatch: expected ${expectedPath}, got ${eventPath}`);
  }

  // Check method
  const eventMethod = getTagValue(event, "method");
  if (!eventMethod) {
    throw new AuthError("Missing 'method' tag");
  }
  if (eventMethod.toUpperCase() !== expectedMethod.toUpperCase()) {
    throw new AuthError(`Method mismatch: expected ${expectedMethod}, got ${eventMethod}`);
  }

  return event.pubkey;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
