import type { DittoTheme } from "./ditto-theme";

export interface ThemePreset {
  key: string;
  label: string;
  emoji: string;
  theme: DittoTheme;
}

/** HSL string to hex (for presets defined in HSL). */
function hslToHex(hsl: string): string {
  const parts = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!parts) return "#000000";
  const h = parseInt(parts[1]) / 360;
  const s = parseInt(parts[2]) / 100;
  const l = parseInt(parts[3]) / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function preset(
  key: string,
  label: string,
  emoji: string,
  bg: string,
  text: string,
  primary: string,
  font?: { family: string; url?: string },
  background?: { url: string; mode: "cover" | "tile"; mime?: string },
): ThemePreset {
  return {
    key,
    label,
    emoji,
    theme: {
      colors: { background: hslToHex(bg), text: hslToHex(text), primary: hslToHex(primary) },
      font,
      background,
      title: label,
    },
  };
}

export const themePresets: ThemePreset[] = [
  preset("toxic", "Toxic", "☢️", "130 30% 7%", "120 40% 92%", "128 70% 42%", { family: "JetBrains Mono" }),
  preset("pink", "Pink", "🌸", "330 100% 96%", "330 30% 10%", "330 90% 60%", { family: "Comfortaa" }, {
    url: "https://blossom.ditto.pub/2c9d4fe206f39b81655eab559998a89e1dca12f4db81c10fd8f472c69fe9c68a.jpeg", mode: "cover",
  }),
  preset("skater", "Skater", "🛹", "0 0% 42%", "0 0% 100%", "80 100% 50%", { family: "Rubik Maps" }, {
    url: "https://blossom.primal.net/9c4262aaa53d8feae41b3b6206647e25c6f388d9e836fb3e8abcf9be72be493e.png", mode: "cover",
  }),
  preset("kawaii", "Kawaii", "🌸", "340 60% 95%", "345 30% 35%", "340 100% 76%", { family: "Cherry Bomb One" }, {
    url: "https://blossom.ditto.pub/4e11a3ca749f9cc8989b61cb9efe78682533d2836eccaf4bccf104dd7b583e09.png", mode: "cover",
  }),
  preset("grunge", "Grunge", "🖤", "276 40% 8%", "0 0% 75%", "328 100% 54%", { family: "Lacquer" }, {
    url: "https://blossom.primal.net/9fa0f1f7cd7da344f3e1db6ecfbdbeb2bb0763d3eaccbc0f5368871d0421b50b.png", mode: "cover",
  }),
  preset("mspaint", "MS Paint", "🖥️", "200 20% 95%", "0 0% 10%", "240 100% 50%", { family: "Silkscreen" }, {
    url: "https://blossom.ditto.pub/946fedd46ec6b283472c0b3a102817ff414a6d640517df5c679bb63830ef21bf.png", mode: "cover",
  }),
  preset("retropop", "Retro Pop", "💿", "244 100% 92%", "40 40% 10%", "260 50% 70%", { family: "Bungee Shade" }, {
    url: "https://blossom.ditto.pub/3832abebc944668c4c0bd34309b0dfe120054671e20ca8c8e9abbb24114c972e.png", mode: "cover",
  }),
  preset("bubblegum", "Bubblegum", "🍬", "0 0% 100%", "285 25% 31%", "279 100% 50%", { family: "Barriecito" }, {
    url: "https://blossom.ditto.pub/edd3139e0c4d60b96dcf54edbe7410b1f58d9e5753c8d481fe9bb6812aca00d4.png", mode: "cover",
  }),
  preset("gamer", "Gamer", "⚡", "140 60% 4%", "120 100% 50%", "195 100% 50%", { family: "Press Start 2P" }, {
    url: "https://blossom.ditto.pub/c5597382d7da762dcce32b5b5dbbd95a719faee5cad7c356df1956648b58be69.png", mode: "cover",
  }),
  preset("cottage", "Cottage", "🌿", "100 25% 92%", "100 20% 12%", "43 80% 55%", { family: "Lora" }, {
    url: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1920&q=80", mode: "cover",
  }),
  preset("midnight", "Midnight", "🌃", "0 0% 9%", "0 0% 95%", "190 100% 50%", { family: "Inter" }, {
    url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1920&q=80", mode: "cover",
  }),
  preset("galaxy", "Galaxy", "🌌", "260 40% 8%", "220 30% 95%", "270 80% 65%", { family: "DM Sans" }, {
    url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=80", mode: "cover",
  }),
  preset("ocean", "Ocean", "🌊", "195 50% 12%", "185 30% 92%", "175 70% 50%", { family: "Nunito" }, {
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80", mode: "cover",
  }),
  preset("forest", "Forest", "🌲", "150 30% 10%", "120 20% 90%", "150 60% 45%", { family: "Merriweather" }, {
    url: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80", mode: "cover",
  }),
  preset("clearsky", "Clear Sky", "✨", "228 37% 8%", "185 100% 72%", "300 100% 60%", { family: "Comfortaa" }, {
    url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80", mode: "cover",
  }),
  preset("silenttorii", "Silent Torii", "⛩️", "0 7% 22%", "0 0% 100%", "3 62% 50%", { family: "DM Sans" }, {
    url: "https://blossom.ditto.pub/7a609544b62918264b6cfd1f05ae38f9ed9a7922465a4ecc2edbb1a769f887d0.jpeg", mode: "cover",
  }),
  preset("sunset", "Sunset", "🌅", "20 40% 96%", "15 30% 12%", "15 85% 55%", { family: "Lora" }),
  preset("sky", "Sky", "☁️", "200 60% 88%", "220 30% 15%", "280 55% 65%", { family: "Nunito" }, {
    url: "https://images.unsplash.com/photo-1517483000871-1dbf64a6e1c6?w=1920&q=80", mode: "cover",
  }),
];
