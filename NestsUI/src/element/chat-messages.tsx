import { EventBuilder, EventKind, NostrEvent, NostrLink, RequestBuilder, parseZap } from "@snort/system";
import { useRequestBuilder, useUserProfile } from "@snort/system-react";
import { useMemo, useState } from "react";
import Avatar from "./avatar";
import DisplayName from "./display-name";
import Icon from "../icon";
import { LIVE_CHAT } from "../const";
import { FormattedMessage } from "react-intl";
import classNames from "classnames";
import Text from "./text";
import { formatSats } from "../utils";
import useEventBuilder from "../hooks/useEventBuilder";
import ZapFlow from "./zap-modal";
import { useNostrRoom } from "../hooks/nostr-room-context";
import { ProfilePageContent } from "../pages/profile";
import useMuteList from "../hooks/useMuteList";
import { useLogin } from "../login";
import Modal from "./modal";
import { PrimaryButton, SecondaryButton } from "./button";

export default function ChatMessages({ link, className, ...props }: { link: NostrLink; className?: string }) {
  const nostrRoom = useNostrRoom();
  const login = useLogin();
  const hostPubkey = nostrRoom.event?.pubkey;

  // Fetch user's mute list and room host's mute list
  const { allMutes, isMuted, mute, unmute } = useMuteList(hostPubkey ? [hostPubkey] : undefined);

  const sub = useMemo(() => {
    const rb = new RequestBuilder(`chat-messages:${link.id}`);
    rb.withOptions({ leaveOpen: true }).withFilter().kinds([LIVE_CHAT, EventKind.ZapReceipt]).replyToLink([link]);
    return rb;
  }, [link]);

  const messages = useRequestBuilder(sub);

  // Filter out messages from muted users (user's mutes + host's mutes)
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      // For zap receipts, check the sender
      if (m.kind === EventKind.ZapReceipt) {
        const zap = parseZap(m);
        return !allMutes.has(zap.sender ?? m.pubkey);
      }
      // For regular messages, check the pubkey
      return !allMutes.has(m.pubkey);
    });
  }, [messages, allMutes]);

  // Get all chat message IDs for reaction/zap subscription
  const chatMessageIds = useMemo(() => {
    return filteredMessages.filter((m) => m.kind === LIVE_CHAT).map((m) => m.id);
  }, [filteredMessages]);

  // Subscribe to reactions and zaps for chat messages
  const reactionsSub = useMemo(() => {
    const rb = new RequestBuilder(`chat-reactions:${link.id}`);
    if (chatMessageIds.length > 0) {
      rb.withOptions({ leaveOpen: true })
        .withFilter()
        .kinds([EventKind.Reaction, EventKind.ZapReceipt])
        .tag("e", chatMessageIds);
    }
    return rb;
  }, [link.id, chatMessageIds]);

  const reactionsAndZaps = useRequestBuilder(reactionsSub);

  // Group reactions and zaps by message ID
  const reactionsByMessage = useMemo(() => {
    const map = new Map<string, NostrEvent[]>();
    for (const event of reactionsAndZaps) {
      const eTag = event.tags.find((t) => t[0] === "e");
      if (eTag) {
        const msgId = eTag[1];
        if (!map.has(msgId)) {
          map.set(msgId, []);
        }
        map.get(msgId)!.push(event);
      }
    }
    return map;
  }, [reactionsAndZaps]);

  return (
    <div className={classNames("overflow-y-auto flex flex-col-reverse gap-3 px-5 grow", className)} {...props}>
      {filteredMessages.map((a) => {
        switch (a.kind) {
          case EventKind.ZapReceipt: {
            return <ChatZap event={a} key={a.id} />;
          }
          default: {
            return (
              <ChatMessage
                event={a}
                key={a.id}
                reactions={reactionsByMessage.get(a.id) ?? []}
                isMuted={isMuted(a.pubkey)}
                onMute={() => mute(a.pubkey)}
                onUnmute={() => unmute(a.pubkey)}
                canMute={login.type !== "none" && a.pubkey !== login.pubkey}
              />
            );
          }
        }
      })}
    </div>
  );
}

function ChatMessage({
  event,
  reactions,
  isMuted,
  onMute,
  onUnmute,
  canMute,
}: {
  event: NostrEvent;
  reactions: NostrEvent[];
  isMuted: boolean;
  onMute: () => void;
  onUnmute: () => void;
  canMute: boolean;
}) {
  const profile = useUserProfile(event.pubkey);
  const [showActions, setShowActions] = useState(false);
  const nostrRoom = useNostrRoom();

  // Separate reactions and zaps
  const emojiReactions = reactions.filter((r) => r.kind === EventKind.Reaction);
  const zaps = reactions.filter((r) => r.kind === EventKind.ZapReceipt);

  // Count emoji reactions
  const reactionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of emojiReactions) {
      const emoji = r.content;
      if (emoji && emoji !== "+" && emoji !== "-") {
        counts.set(emoji, (counts.get(emoji) || 0) + 1);
      }
    }
    return counts;
  }, [emojiReactions]);

  // Calculate total zap amount
  const totalZapAmount = useMemo(() => {
    return zaps.reduce((total, z) => {
      const parsed = parseZap(z);
      return total + parsed.amount;
    }, 0);
  }, [zaps]);

  function openProfile() {
    nostrRoom.setFlyout(
      <ProfilePageContent link={NostrLink.publicKey(event.pubkey)} flyout={true} showEnded={false} />
    );
  }

  return (
    <div
      className="grid grid-cols-[32px_auto] gap-2 group relative"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={() => setShowActions((s) => !s)}
    >
      <div onClick={(e) => { e.stopPropagation(); openProfile(); }} className="cursor-pointer">
        <Avatar pubkey={event.pubkey} size={32} link={false} />
      </div>
      <div className="flex flex-col text-sm break-words overflow-hidden min-w-0">
        <div
          className="text-medium leading-8 cursor-pointer hover:text-primary w-fit"
          onClick={(e) => { e.stopPropagation(); openProfile(); }}
        >
          <DisplayName pubkey={event.pubkey} profile={profile} />
        </div>
        <Text content={event.content} tags={event.tags} />
        {/* Reactions and zaps display */}
        {(reactionCounts.size > 0 || totalZapAmount > 0) && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Array.from(reactionCounts.entries()).map(([emoji, count]) => (
              <span
                key={emoji}
                className="bg-foreground-2 rounded-full px-2 py-0.5 text-xs flex items-center gap-1"
              >
                <span>{emoji}</span>
                {count > 1 && <span className="text-foreground-3">{count}</span>}
              </span>
            ))}
            {totalZapAmount > 0 && (
              <span className="bg-foreground-2 rounded-full px-2 py-0.5 text-xs flex items-center gap-1 text-bitcoin">
                <Icon name="zap" size={12} />
                <span>{formatSats(totalZapAmount)}</span>
              </span>
            )}
          </div>
        )}
      </div>
      {showActions && (
        <ChatMessageActions
          event={event}
          profile={profile}
          onClose={() => setShowActions(false)}
          isMuted={isMuted}
          onMute={onMute}
          onUnmute={onUnmute}
          canMute={canMute}
        />
      )}
    </div>
  );
}

function ChatMessageActions({
  event,
  profile,
  onClose,
  isMuted,
  onMute,
  onUnmute,
  canMute,
}: {
  event: NostrEvent;
  profile: ReturnType<typeof useUserProfile>;
  onClose: () => void;
  isMuted: boolean;
  onMute: () => void;
  onUnmute: () => void;
  canMute: boolean;
}) {
  const { system, signer } = useEventBuilder();
  const [showZap, setShowZap] = useState(false);
  const [showMuteConfirm, setShowMuteConfirm] = useState(false);

  const hasLightningAddress = profile?.lud16 || profile?.lud06;
  const quickReactions = ["🤙", "💯", "😂", "🔥", "🫂"];

  async function sendReaction(content: string) {
    if (!signer) return;

    const link = NostrLink.fromEvent(event);
    const eb = new EventBuilder()
      .kind(EventKind.Reaction)
      .content(content)
      .tag(link.toEventTag()!)
      .tag(["p", event.pubkey]);

    const ev = await eb.buildAndSign(signer);
    await system.BroadcastEvent(ev);
    onClose();
  }

  function handleMuteClick() {
    if (isMuted) {
      // Unmute doesn't need confirmation
      onUnmute();
      onClose();
    } else {
      // Show confirmation for mute
      setShowMuteConfirm(true);
    }
  }

  function confirmMute() {
    onMute();
    setShowMuteConfirm(false);
    onClose();
  }

  return (
    <>
      {showZap && (
        <ZapFlow
          onClose={() => {
            setShowZap(false);
            onClose();
          }}
          targets={[
            {
              type: "pubkey",
              weight: 1,
              value: event.pubkey,
              zap: {
                pubkey: event.pubkey,
                anon: false,
                event: NostrLink.fromEvent(event),
              },
            },
          ]}
        />
      )}
      {showMuteConfirm && (
        <Modal id="mute-confirm" onClose={() => setShowMuteConfirm(false)}>
          <div className="flex flex-col gap-4 items-center">
            <h2 className="text-xl font-semibold">
              <FormattedMessage defaultMessage="Mute User" />
            </h2>
            <div className="flex items-center gap-3">
              <Avatar pubkey={event.pubkey} size={48} link={false} />
              <DisplayName pubkey={event.pubkey} profile={profile} className="font-medium" />
            </div>
            <p className="text-foreground-2 text-center">
              <FormattedMessage defaultMessage="You won't see chat messages from this user. This will be saved to your public mute list." />
            </p>
            <div className="flex gap-3 w-full">
              <SecondaryButton className="flex-1" onClick={() => setShowMuteConfirm(false)}>
                <FormattedMessage defaultMessage="Cancel" />
              </SecondaryButton>
              <PrimaryButton className="flex-1 !bg-delete hover:!bg-delete/90" onClick={confirmMute}>
                <FormattedMessage defaultMessage="Mute" />
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      )}
      <div
        className="absolute right-0 top-0 flex items-center gap-1 bg-foreground-2 rounded-full px-2 py-1 shadow-lg z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {quickReactions.map((emoji) => (
          <button
            key={emoji}
            className="hover:bg-foreground rounded p-1 text-lg transition-colors"
            onClick={() => sendReaction(emoji)}
          >
            {emoji}
          </button>
        ))}
        {hasLightningAddress && (
          <button
            className="hover:bg-foreground rounded p-1 transition-colors"
            onClick={() => setShowZap(true)}
          >
            <Icon name="zap" size={20} className="text-primary" />
          </button>
        )}
        {canMute && (
          <button
            className="hover:bg-foreground rounded p-1 transition-colors"
            onClick={handleMuteClick}
            title={isMuted ? "Unmute user" : "Mute user"}
          >
            <Icon
              name={isMuted ? "user-plus" : "user-x"}
              size={20}
              className={isMuted ? "text-primary" : "text-delete"}
            />
          </button>
        )}
      </div>
    </>
  );
}

function ChatZap({ event }: { event: NostrEvent }) {
  const zap = parseZap(event);
  const senderProfile = useUserProfile(zap.sender);
  const targetProfile = useUserProfile(zap.receiver);
  return (
    <div className="rounded-2xl px-3 py-4 bg-foreground-2">
      <div className="flex gap-2 items-center">
        <Avatar
          pubkey={zap.sender ?? event.pubkey}
          link={false}
          size={32}
          className="outline outline-2 outline-bitcoin"
        />
        <Icon name="zap" className="text-bitcoin" />
        <span>
          <FormattedMessage
            defaultMessage="{sender} zapped {receiver} {amount} sats"
            values={{
              sender: (
                <DisplayName
                  pubkey={zap.sender ?? event.pubkey}
                  profile={senderProfile}
                  className="text-bitcoin font-bold"
                />
              ),
              receiver: <DisplayName pubkey={zap.receiver ?? event.pubkey} profile={targetProfile} />,
              amount: <span className="text-bitcoin font-bold">{formatSats(zap.amount)}</span>,
            }}
          />
        </span>
      </div>
      {zap.content && <div className="mt-2">{zap.content}</div>}
    </div>
  );
}
