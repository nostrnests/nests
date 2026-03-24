import type { NostrEvent } from "@nostrify/nostrify";

export interface DittoTheme {
  colors: {
    background: string;
    text: string;
    primary: string;
  };
  font?: { family: string; url?: string };
  background?: { url: string; mode: "cover" | "tile"; mime?: string };
  title?: string;
  description?: string;
}

/** Parse a kind:16767 or kind:36767 event into a DittoTheme. */
export function parseDittoThemeEvent(event: NostrEvent): DittoTheme | null {
  return parseThemeTags(event.tags);
}

/** Parse inline theme tags (c, f, bg) from any event's tag array. */
export function parseThemeTags(tags: string[][]): DittoTheme | null {
  const colors: Partial<DittoTheme["colors"]> = {};
  let font: DittoTheme["font"] | undefined;
  let background: DittoTheme["background"] | undefined;
  let title: string | undefined;
  let description: string | undefined;

  for (const tag of tags) {
    if (tag[0] === "c" && tag[1] && tag[2]) {
      const hex = tag[1];
      const role = tag[2];
      if (role === "background") colors.background = hex;
      else if (role === "text") colors.text = hex;
      else if (role === "primary") colors.primary = hex;
    } else if (tag[0] === "f" && tag[1]) {
      font = { family: tag[1], url: tag[2] };
    } else if (tag[0] === "bg" && tag[1]) {
      const bgData: { url?: string; mode?: string; mime?: string } = {};
      for (const val of tag.slice(1)) {
        if (val.startsWith("url ")) bgData.url = val.slice(4);
        else if (val.startsWith("mode ")) bgData.mode = val.slice(5);
        else if (val.startsWith("m ")) bgData.mime = val.slice(2);
      }
      if (bgData.url) {
        background = {
          url: bgData.url,
          mode: bgData.mode === "tile" ? "tile" : "cover",
          mime: bgData.mime,
        };
      }
    } else if (tag[0] === "title" && tag[1]) {
      title = tag[1];
    } else if (tag[0] === "description" && tag[1]) {
      description = tag[1];
    }
  }

  if (!colors.background || !colors.text || !colors.primary) return null;

  return {
    colors: colors as DittoTheme["colors"],
    font,
    background,
    title,
    description,
  };
}

/** Convert hex color (#rrggbb) to bare HSL string (e.g. "210 50% 60%") for shadcn CSS vars. */
export function hexToHSL(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return `0 0% ${Math.round(l * 100)}%`;
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let hue: number;
  if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) hue = ((b - r) / d + 2) * 60;
  else hue = ((r - g) / d + 4) * 60;

  return `${Math.round(hue)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Adjust HSL lightness by a delta. Input: bare HSL string, delta: -100 to 100. */
function adjustLightness(hsl: string, delta: number): string {
  const parts = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!parts) return hsl;
  const l = Math.max(0, Math.min(100, parseInt(parts[3]) + delta));
  return `${parts[1]} ${parts[2]}% ${l}%`;
}

/** Convert a DittoTheme to CSS custom property overrides for shadcn. */
export function themeToCSS(theme: DittoTheme): Record<string, string> {
  const bg = hexToHSL(theme.colors.background);
  const fg = hexToHSL(theme.colors.text);
  const primary = hexToHSL(theme.colors.primary);

  const vars: Record<string, string> = {
    "--background": bg,
    "--foreground": fg,
    "--card": adjustLightness(bg, 3),
    "--card-foreground": fg,
    "--popover": adjustLightness(bg, 3),
    "--popover-foreground": fg,
    "--primary": primary,
    "--primary-foreground": fg,
    "--secondary": adjustLightness(bg, 8),
    "--secondary-foreground": fg,
    "--muted": adjustLightness(bg, 10),
    "--muted-foreground": adjustLightness(fg, -30),
    "--accent": primary,
    "--accent-foreground": fg,
    "--border": adjustLightness(bg, 10),
    "--input": adjustLightness(bg, 12),
    "--ring": primary,
  };

  if (theme.font) {
    vars["fontFamily"] = theme.font.family;
  }

  return vars;
}

/** Check if a string is likely an emoji (short, contains non-ASCII). */
export function isEmoji(value: string | undefined): boolean {
  if (!value || value.length === 0 || value.length > 20) return false;
  // Must contain at least one non-ASCII character
  // eslint-disable-next-line no-control-regex
  return /[^\x00-\x7F]/.test(value);
}

/** In-memory cache: emoji string -> mask data URL. */
const emojiMaskCache = new Map<string, string>();

/**
 * Render an emoji onto a canvas and produce a PNG data-URL alpha mask
 * for use as CSS `mask-image`. Works with ANY emoji.
 * Ported from ditto-mew's avatarShape.ts.
 */
export function getEmojiMaskUrl(emoji: string): string {
  const cached = emojiMaskCache.get(emoji);
  if (cached) return cached;

  const fontSize = 512;
  const scratch = fontSize * 1.5;
  const c1 = document.createElement("canvas");
  c1.width = scratch;
  c1.height = scratch;
  const ctx1 = c1.getContext("2d");
  if (!ctx1) return "";

  ctx1.textAlign = "center";
  ctx1.textBaseline = "middle";
  ctx1.font = `${fontSize}px serif`;
  ctx1.fillText(emoji, scratch / 2, scratch / 2);

  // Find tight bounding box
  const ALPHA_THRESHOLD = 25;
  const { data: px, width: sw, height: sh } = ctx1.getImageData(0, 0, scratch, scratch);
  let t = sh, b = 0, l = sw, r = 0;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      if (px[(y * sw + x) * 4 + 3] > ALPHA_THRESHOLD) {
        if (y < t) t = y;
        if (y > b) b = y;
        if (x < l) l = x;
        if (x > r) r = x;
      }
    }
  }
  if (r < l || b < t) return "";

  // Square the bounding box
  let cropW = r - l + 1;
  let cropH = b - t + 1;
  if (cropW > cropH) {
    const diff = cropW - cropH;
    t -= Math.floor(diff / 2);
    cropH = cropW;
  } else if (cropH > cropW) {
    const diff = cropH - cropW;
    l -= Math.floor(diff / 2);
    cropW = cropH;
  }
  if (t < 0) t = 0;
  if (l < 0) l = 0;

  // Redraw cropped region onto output canvas
  const out = 256;
  const c2 = document.createElement("canvas");
  c2.width = out;
  c2.height = out;
  const ctx2 = c2.getContext("2d");
  if (!ctx2) return "";

  ctx2.drawImage(c1, l, t, cropW, cropH, 0, 0, out, out);

  // Convert to alpha mask (white + original alpha)
  const img = ctx2.getImageData(0, 0, out, out);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255;
    d[i + 1] = 255;
    d[i + 2] = 255;
  }
  ctx2.putImageData(img, 0, 0);

  const url = c2.toDataURL("image/png");
  emojiMaskCache.set(emoji, url);
  return url;
}

/** Generate a 3-color swatch preview for a theme. */
export function getThemeSwatchColors(theme: DittoTheme): [string, string, string] {
  return [theme.colors.background, theme.colors.primary, theme.colors.text];
}
