import { useState } from "react";
import ZapFlow from "./zap-modal";
import { NostrEvent, NostrLink } from "@snort/system";
import Icon from "../icon";
import classNames from "classnames";

export default function ZapButton({
  pubkey,
  event,
  iconClass,
  iconSize,
}: {
  pubkey: string;
  event?: NostrEvent;
  iconClass?: string;
  iconSize?: number;
}) {
  const [zapping, setZapping] = useState(false);
  return (
    <>
      {zapping && (
        <ZapFlow
          onClose={() => setZapping(false)}
          targets={[
            {
              type: "pubkey",
              weight: 1,
              value: pubkey,
              zap: {
                pubkey: pubkey,
                anon: false,
                event: event ? NostrLink.fromEvent(event) : undefined,
              },
            },
          ]}
        />
      )}
      <Icon
        name="zap"
        className={classNames("text-primary", iconClass)}
        size={iconSize ?? 32}
        onClick={() => setZapping(true)}
      />
    </>
  );
}
