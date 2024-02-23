import { removeUndefined, sanitizeRelayUrl } from "@snort/shared";
import { snortSystem } from "./main";
import { NostrEvent } from "@snort/system";

export function updateRelays(relays: Array<string>) {
  relays = removeUndefined(relays.map((a) => sanitizeRelayUrl(a)));
  console.debug("Connecting to relays for room", relays);
  relays.forEach((a) => snortSystem.ConnectToRelay(a, { read: true, write: true }));

  const removing = [...snortSystem.pool].filter(([k]) => !relays.some((b) => b === k)).map(([k]) => k);
  console.debug("Disconnecting relays for room", removing);
  removing.forEach((a) => snortSystem.DisconnectRelay(a));
}

export function debounce(time: number, fn: () => void): () => void {
  const t = setTimeout(fn, time);
  return () => clearTimeout(t);
}

export function updateOrAddTag(event: NostrEvent, tag: string, value: string) {
  const oldTag = event.tags.find((a) => a[0] === tag);
  if (oldTag) {
    oldTag[1] = value;
  } else {
    event.tags.push([tag, value]);
  }
}

interface StreamInfo {
  id?: string;
  title?: string;
  summary?: string;
  image?: string;
  status?: string;
  stream?: Array<string>;
  recording?: string;
  contentWarning?: string;
  tags?: Array<string>;
  goal?: string;
  participants?: string;
  starts?: string;
  ends?: string;
  service?: string;
  color?: string;
}

export function extractStreamInfo(ev?: NostrEvent) {
  const ret = {} as StreamInfo;
  const matchTag = (tag: Array<string>, k: string, into: (v: string) => void) => {
    if (tag[0] === k) {
      into(tag[1]);
    }
  };

  for (const t of ev?.tags ?? []) {
    matchTag(t, "d", (v) => (ret.id = v));
    matchTag(t, "title", (v) => (ret.title = v));
    matchTag(t, "summary", (v) => (ret.summary = v));
    matchTag(t, "image", (v) => (ret.image = v));
    matchTag(t, "status", (v) => (ret.status = v));
    matchTag(t, "streaming", (v) => {
      ret.stream ??= [];
      ret.stream.push(v);
    });
    matchTag(t, "recording", (v) => (ret.recording = v));
    matchTag(t, "content-warning", (v) => (ret.contentWarning = v));
    matchTag(t, "current_participants", (v) => (ret.participants = v));
    matchTag(t, "goal", (v) => (ret.goal = v));
    matchTag(t, "starts", (v) => (ret.starts = v));
    matchTag(t, "ends", (v) => (ret.ends = v));
    matchTag(t, "service", (v) => (ret.service = v));
    matchTag(t, "color", (v) => (ret.color = v));
  }
  ret.tags = ev?.tags.filter((a) => a[0] === "t").map((a) => a[1]) ?? [];

  return ret;
}
