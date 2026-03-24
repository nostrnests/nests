import { EventKind } from "@snort/system";

/**
 * Default Nostr relays to connect and publish to
 */
export const DefaultRelays = [
  "wss://relay.snort.social",
  "wss://nos.lol",
  "wss://relay.damus.io",
  "wss://relay.ditto.pub",
  "wss://relay.primal.net",
];

/**
 * Default MoQ relay servers.
 * Used when a user has no kind:10112 MoQ server list published.
 */
export const DefaultMoQServers = [
  import.meta.env.VITE_MOQ_RELAY_URL || "https://moq.nostrnests.com",
];

/**
 * Default MoQ auth service URL.
 * Paired with the default MoQ relay.
 */
export const DefaultMoQAuthUrl = import.meta.env.VITE_MOQ_AUTH_URL || "https://moq-auth.nostrnests.com";

/**
 * Color palette colors for room cards
 */
export const ColorPalette = [
  "gradient-1",
  "gradient-2",
  "gradient-3",
  "gradient-4",
  "gradient-5",
  "gradient-6",
  "gradient-7",
  "gradient-8",
  "gradient-9",
  "gradient-10",
  "gradient-11",
] as const;

/**
 * Nests room event kind (NIP-53 variant)
 */
export const ROOM_KIND = 30_312 as EventKind;

/**
 * Room presence event kind
 */
export const ROOM_PRESENCE = 10_312 as EventKind;

/**
 * Live chat kind (NIP-53)
 */
export const LIVE_CHAT = 1311 as EventKind;

/**
 * MoQ server list kind (NIP-51 standard list).
 * Users publish this to advertise their preferred MoQ relay servers.
 */
export const MOQ_SERVER_LIST = 10_112 as EventKind;

/**
 * Admin command kind.
 * Used by room hosts/admins to send mute/unmute/kick commands.
 */
export const ADMIN_COMMAND = 4_312 as EventKind;

/**
 * Room participant roles as used in p-tag markers.
 */
export const ParticipantRole = {
  HOST: "host",
  ADMIN: "admin",
  SPEAKER: "speaker",
} as const;

export type ParticipantRole = (typeof ParticipantRole)[keyof typeof ParticipantRole];
