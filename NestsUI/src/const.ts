/**
 * Nests API host base path
 */

import { EventKind } from "@snort/system";

//export const ApiUrl = "";
export const ApiUrl = import.meta.env.VITE_API_URL || "https://nostrnests.com";

/**
 * Default relays to connect and publish to
 */
export const DefaultRelays = ["wss://relay.snort.social", "wss://nos.lol", "wss://relay.damus.io", "wss://nostr.land"];
//export const DefaultRelays = ["ws://host.docker.internal:7777"];

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
 * Nests room event kind
 */
export const ROOM_KIND = 30_311 as EventKind;

/**
 * Room presence event kind
 */
export const ROOM_PRESENCE = 10_312 as EventKind;

/**
 * Live chat kind
 */
export const LIVE_CHAT = 1311 as EventKind;
