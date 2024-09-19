import { EventKind, NostrEvent, NostrLink, RequestBuilder, parseZap } from "@snort/system";
import { useRequestBuilder, useUserProfile } from "@snort/system-react";
import { useMemo } from "react";
import Avatar from "./avatar";
import DisplayName from "./display-name";
import Icon from "../icon";
import { LIVE_CHAT } from "../const";
import { FormattedMessage } from "react-intl";
import classNames from "classnames";
import Text from "./text";
import { formatSats } from "../utils";

export default function ChatMessages({ link, className, ...props }: { link: NostrLink; className?: string }) {
  const sub = useMemo(() => {
    const rb = new RequestBuilder(`chat-messages:${link.id}`);
    rb.withOptions({ leaveOpen: true }).withFilter().kinds([LIVE_CHAT, EventKind.ZapReceipt]).replyToLink([link]);
    return rb;
  }, [link]);

  const messages = useRequestBuilder(sub);

  return (
    <div className={classNames("overflow-y-auto flex flex-col-reverse gap-3 px-5 grow", className)} {...props}>
      {messages.map((a) => {
        switch (a.kind) {
          case EventKind.ZapReceipt: {
            return <ChatZap event={a} key={a.id} />;
          }
          default: {
            return <ChatMessage event={a} key={a.id} />;
          }
        }
      })}
    </div>
  );
}

function ChatMessage({ event }: { event: NostrEvent }) {
  const profile = useUserProfile(event.pubkey);

  return (
    <div className="grid grid-cols-[32px_auto] gap-2">
      <Avatar pubkey={event.pubkey} size={32} link={true} />
      <div className="flex flex-col text-sm text-wrap overflow-wrap overflow-hidden">
        <div className="text-medium leading-8">
          <DisplayName pubkey={event.pubkey} profile={profile} />
        </div>
        <Text content={event.content} tags={event.tags} />
      </div>
    </div>
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
