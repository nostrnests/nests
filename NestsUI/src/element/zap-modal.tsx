import { useEffect, useState } from "react";
import DisplayName from "./display-name";
import Modal from "./modal";
import IconButton from "./icon-button";
import { PrimaryButton } from "./button";
import { useUserProfile } from "@snort/system-react";
import useEventBuilder from "../hooks/useEventBuilder";
import { EventPublisher } from "@snort/system";
import QrCode from "./qr";
import { FormattedMessage, useIntl } from "react-intl";
import Copy from "./copy";
import { useWallet } from "../wallet";
import { ZapTarget, Zapper } from "@snort/wallet";

export default function ZapFlow({ targets, onClose }: { targets: Array<ZapTarget>; onClose: () => void }) {
  const { system, signer, pubkey } = useEventBuilder();
  const target = targets[0];
  const profile = useUserProfile(target.value);
  const inc = 500;
  const [amount, setAmount] = useState(inc);
  const [customAmount, setCustomAmount] = useState<number>();
  const [comment, setComment] = useState("");
  const [invoice, setInvoice] = useState("");
  const { formatMessage } = useIntl();
  const wallet = useWallet();

  useEffect(() => {
    if (customAmount !== undefined) {
      setAmount(customAmount - (customAmount % inc));
    }
  }, [customAmount]);

  function formatAmount(n: number) {
    if (n === 1_000_000) {
      return "1M";
    } else {
      return `${(n / 1000).toLocaleString()}K`;
    }
  }
  return (
    <Modal id="zap" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {target.type === "pubkey" && <DisplayName pubkey={target.value!} profile={profile} className="text-center" />}
        {invoice && (
          <div className="flex flex-col items-center justify-center gap-4">
            <QrCode data={`lightning:${invoice}`} link={`lightning:${invoice}`} />
            <Copy text={invoice} className="text-sm" />
          </div>
        )}
        {!invoice && (
          <>
            <div className={`grid grid-cols-[max-content_auto_max-content] items-center select-none`}>
              <IconButton
                name="chevron"
                className="rounded-full aspect-square"
                onClick={() => setAmount((v) => Math.max(inc, v - inc))}
              />
              <div className="text-center">
                <FormattedMessage
                  defaultMessage="<lg>{n}</lg> <sm>Sats</sm>"
                  values={{
                    lg: (c) => <span className="text-3xl font-semibold">{c}</span>,
                    sm: (c) => <span className="text-sm">{c}</span>,
                    n: customAmount ? customAmount.toLocaleString() : formatAmount(amount),
                  }}
                />
              </div>
              <IconButton
                name="chevron"
                className="rounded-full aspect-square rotate-180"
                onClick={() => setAmount((v) => Math.min(1_000_000, v + inc))}
              />
            </div>
            <input
              placeholder={formatMessage({ defaultMessage: "Custom amount", description: "Custom amount for zaps" })}
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value ? Number(e.target.value) : undefined)}
            />
            <textarea
              placeholder={formatMessage({ defaultMessage: "Personal note" })}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <PrimaryButton
              onClick={async () => {
                if (signer && pubkey) {
                  const zapper = new Zapper(system, new EventPublisher(signer, pubkey));
                  await zapper.load(targets);
                  const res = await zapper.send(
                    wallet.wallet,
                    targets.map((a) => ({ ...a, memo: comment })),
                    customAmount !== undefined ? customAmount : amount,
                  );
                  if (!res[0].paid) {
                    setInvoice(res[0].pr);
                  } else {
                    onClose();
                  }
                }
              }}
            >
              <FormattedMessage defaultMessage="Zap" />
            </PrimaryButton>
          </>
        )}
      </div>
    </Modal>
  );
}
