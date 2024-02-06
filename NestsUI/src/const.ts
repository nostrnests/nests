/**
 * Nests API host base path
 */
export const ApiUrl = "http://localhost:5070";

/**
 * Default relays to connect and publish to
 */
//export const DefaultRelays = ["wss://relay.snort.social", "wss://nos.lol", "wss://relay.damus.io"];
export const DefaultRelays = ["ws://localhost:7777"]

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
