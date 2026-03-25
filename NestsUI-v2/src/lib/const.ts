/**
 * Nests application constants.
 */

/** Nests room event kind (NIP-53 variant) */
export const ROOM_KIND = 30312;

/** Room presence event kind */
export const ROOM_PRESENCE = 10312;

/** Live chat kind (NIP-53) */
export const LIVE_CHAT = 1311;

/** MoQ server list kind (NIP-51 standard list) */
export const MOQ_SERVER_LIST = 10112;

/** Admin command kind (mute/kick) */
export const ADMIN_COMMAND = 4312;

/** Ditto profile theme (active theme per user) */
export const DITTO_PROFILE_THEME = 16767;

/** Ditto shareable theme */
export const DITTO_THEME = 36767;

/** Room participant roles as used in p-tag markers */
export const ParticipantRole = {
  HOST: "host",
  ADMIN: "admin",
  SPEAKER: "speaker",
} as const;

export type ParticipantRole = (typeof ParticipantRole)[keyof typeof ParticipantRole];

/** Default Nostr relays */
export const DefaultRelays = [
  "wss://relay.snort.social",
  "wss://nos.lol",
  "wss://relay.damus.io",
  "wss://relay.ditto.pub",
  "wss://relay.primal.net",
];

/** Default MoQ relay servers (used when user has no kind:10112 list) */
export const DefaultMoQServers = [
  import.meta.env.VITE_MOQ_RELAY_URL || "https://moq.nostrnests.com:4443",
];

/** Default MoQ auth service URL */
export const DefaultMoQAuthUrl = import.meta.env.VITE_MOQ_AUTH_URL || "https://moq-auth.nostrnests.com";

/** Color palette for room cards */
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
