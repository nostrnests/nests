/**
 * Simple base64 encode/decode utilities.
 * Avoids pulling in @scure/base for this tiny service.
 */
export const base64 = {
  decode(str: string): Uint8Array {
    // Handle both standard and URL-safe base64
    const normalized = str.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  },

  encode(bytes: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  },
};
