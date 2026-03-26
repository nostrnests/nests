import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { Zap, UserPlus, UserMinus, VolumeOff } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthor } from "@/hooks/useAuthor";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useFollowing } from "@/hooks/useFollowing";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useRoomReactions } from "@/hooks/useRoomReactions";
import { ZapDialog } from "./ZapDialog";
import { genUserName } from "@/lib/genUserName";
import { isEmoji, getEmojiMaskUrl } from "@/lib/ditto-theme";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { NostrEvent } from "@nostrify/nostrify";
import type { Event } from "nostr-tools";

const QUICK_REACTIONS = ["🤙", "💯", "🔥", "😂", "❤️", "👏"];

function ChatReactions({ reactions, onReact }: { reactions?: MessageReactions; onReact: (emoji: string) => void }) {
  if (!reactions) return null;

  const emojiEntries = Array.from(reactions.emojis.entries());
  const hasEmojis = emojiEntries.length > 0;
  const hasZaps = reactions.zapTotal > 0;

  if (!hasEmojis && !hasZaps) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {emojiEntries.map(([emoji, count]) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-secondary/60 hover:bg-secondary text-xs transition-colors cursor-pointer"
        >
          <span>{emoji}</span>
          {count > 1 && <span className="text-muted-foreground">{count}</span>}
        </button>
      ))}
      {hasZaps && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-xs text-yellow-500">
          <Zap className="h-3 w-3" />
          {reactions.zapTotal >= 1000 ? `${(reactions.zapTotal / 1000).toFixed(reactions.zapTotal >= 10000 ? 0 : 1)}k` : reactions.zapTotal}
          {reactions.zapCount > 1 && <span className="text-yellow-500/60">({reactions.zapCount})</span>}
        </span>
      )}
    </div>
  );
}

interface MessageReactions {
  /** Grouped emoji counts: emoji -> count */
  emojis: Map<string, number>;
  /** Total zap amount in sats */
  zapTotal: number;
  /** Number of zaps */
  zapCount: number;
}

function ChatMessage({ event, roomATag, reactions, onLocalReaction }: { event: NostrEvent; roomATag: string; reactions?: MessageReactions; onLocalReaction?: (messageId: string, emoji: string) => void }) {
  const { user } = useCurrentUser();
  const author = useAuthor(event.pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.display_name ?? metadata?.name ?? genUserName(event.pubkey);
  const { isFollowing, follow, unfollow } = useFollowing();
  const { mutate: createEvent } = useNostrPublish();

  const isSelf = user?.pubkey === event.pubkey;
  const following = isFollowing(event.pubkey);
  const lightningAddress = metadata?.lud16 ?? metadata?.lud06;
  const authorEvent = author.data?.event as Event | undefined;

  // Avatar shape from kind:0 metadata
  const avatarMask = useMemo(() => {
    try {
      const parsed = JSON.parse(author.data?.event?.content ?? "{}");
      if (!isEmoji(parsed.shape)) return undefined;
      const url = getEmojiMaskUrl(parsed.shape);
      return url || undefined;
    } catch {
      return undefined;
    }
  }, [author.data?.event?.content]);

  const sendReaction = (emoji: string) => {
    if (!user) return;
    // Only add to chat message reactions, NOT the flying overlay
    onLocalReaction?.(event.id, emoji);
    createEvent({
      kind: 7,
      content: emoji,
      tags: [
        ["a", roomATag],
        ["e", event.id],
        ["p", event.pubkey],
      ],
      created_at: Math.floor(Date.now() / 1000),
    });
  };

  return (
    <div className="group relative flex gap-2 md:gap-2.5 py-1.5 md:py-2 px-3 hover:bg-secondary/30 rounded-lg transition-colors">
      <div className="shrink-0 mt-0.5">
        <Avatar
          className={cn("h-6 w-6 md:h-7 md:w-7", !avatarMask && "rounded-full")}
          style={avatarMask ? {
            WebkitMaskImage: `url(${avatarMask})`,
            maskImage: `url(${avatarMask})`,
            WebkitMaskSize: "cover",
            maskSize: "cover",
            borderRadius: 0,
          } : undefined}
        >
          <AvatarImage src={metadata?.picture} alt={displayName} />
          <AvatarFallback className="text-[10px] bg-secondary">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {displayName}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatDistanceToNow(new Date(event.created_at * 1000), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-foreground/80 break-words whitespace-pre-wrap">
          {event.content}
        </p>

        {/* Reactions & zaps */}
        <ChatReactions reactions={reactions} onReact={sendReaction} />
      </div>

      {/* Hover action bar — quick reactions + actions inline */}
      {user && (
        <div className="absolute top-1 right-1 hidden group-hover:flex items-center bg-card border border-border rounded-lg shadow-md px-0.5 py-0.5">
          {/* Quick reaction emojis */}
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendReaction(emoji)}
              className="h-6 w-6 flex items-center justify-center text-sm rounded hover:bg-secondary transition-colors cursor-pointer"
            >
              {emoji}
            </button>
          ))}

          {/* Separator */}
          <div className="w-px h-4 bg-border mx-0.5" />

          {/* Zap */}
          {!isSelf && lightningAddress && authorEvent && (
            <ZapDialog target={authorEvent}>
              <button className="h-6 w-6 flex items-center justify-center rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-yellow-500">
                <Zap className="h-3.5 w-3.5" />
              </button>
            </ZapDialog>
          )}

          {/* Follow / Unfollow */}
          {!isSelf && (
            <button
              className={cn(
                "h-6 w-6 flex items-center justify-center rounded hover:bg-secondary transition-colors",
                following ? "text-primary hover:text-muted-foreground" : "text-muted-foreground hover:text-primary",
              )}
              onClick={() => following ? unfollow(event.pubkey) : follow(event.pubkey)}
            >
              {following ? <UserMinus className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
            </button>
          )}

          {/* Mute */}
          {!isSelf && (
            <button
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-destructive"
              onClick={() => {
                createEvent({
                  kind: 10000,
                  content: "",
                  tags: [["p", event.pubkey]],
                  created_at: Math.floor(Date.now() / 1000),
                });
              }}
            >
              <VolumeOff className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface ChatMessagesProps {
  roomATag: string;
}

/** Track optimistic local reactions per message. */
interface LocalReaction {
  messageId: string;
  emoji: string;
}

export function ChatMessages({ roomATag }: ChatMessagesProps) {
  const { data: messages = [], isLoading } = useChatMessages(roomATag);
  const { data: allReactions = [] } = useRoomReactions(roomATag);
  const [localReactions, setLocalReactions] = useState<LocalReaction[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Exposed via context-like callback for child ChatMessage components
  const addLocalChatReaction = useCallback((messageId: string, emoji: string) => {
    setLocalReactions((prev) => [...prev, { messageId, emoji }]);
  }, []);

  // Build per-message reaction maps (computed every render to ensure freshness)
  const messageReactions = new Map<string, MessageReactions>();

  for (const r of allReactions) {
    const targetId = r.tags.find(([t]) => t === "e")?.[1];
    if (!targetId) continue;

    if (!messageReactions.has(targetId)) {
      messageReactions.set(targetId, { emojis: new Map(), zapTotal: 0, zapCount: 0 });
    }
    const entry = messageReactions.get(targetId)!;

    if (r.kind === 7 && r.content) {
      entry.emojis.set(r.content, (entry.emojis.get(r.content) ?? 0) + 1);
    } else if (r.kind === 9735) {
      const bolt11 = r.tags.find(([t]) => t === "bolt11")?.[1];
      if (bolt11) {
        const amount = parseBolt11Amount(bolt11);
        if (amount > 0) {
          entry.zapTotal += amount;
          entry.zapCount += 1;
        }
      }
    }
  }

  // Merge local optimistic reactions (only for messages not yet confirmed by relay)
  for (const lr of localReactions) {
    const existing = messageReactions.get(lr.messageId);
    if (existing) {
      // Relay already has reactions for this message — skip local to avoid double-counting
      continue;
    }
    messageReactions.set(lr.messageId, { emojis: new Map(), zapTotal: 0, zapCount: 0 });
    const entry = messageReactions.get(lr.messageId)!;
    entry.emojis.set(lr.emoji, (entry.emojis.get(lr.emoji) ?? 0) + 1);
  }

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Loading messages...
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm px-4 text-center">
        No messages yet. Say something!
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1" ref={scrollRef}>
      <div className="flex flex-col py-1 md:py-2">
        {messages.map((event) => (
          <ChatMessage key={event.id} event={event} roomATag={roomATag} reactions={messageReactions.get(event.id)} onLocalReaction={addLocalChatReaction} />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

/** Parse sats amount from a bolt11 invoice string. */
function parseBolt11Amount(bolt11: string): number {
  const lower = bolt11.toLowerCase();
  // Match amount after "lnbc" — e.g. lnbc10u, lnbc1500n, lnbc100p
  const match = lower.match(/^lnbc(\d+)([munp]?)/);
  if (!match) return 0;
  const num = parseInt(match[1]);
  const multiplier = match[2];
  switch (multiplier) {
    case "m": return num * 100000; // milli-btc -> sats
    case "u": return num * 100;    // micro-btc -> sats
    case "n": return num / 10;     // nano-btc -> sats
    case "p": return num / 10000;  // pico-btc -> sats
    default: return num * 100000000; // btc -> sats
  }
}
