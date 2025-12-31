import { useState } from "react";
import DisplayName from "./display-name";
import Modal from "./modal";
import { PrimaryButton } from "./button";
import { useUserProfile } from "@snort/system-react";
import useEventBuilder from "../hooks/useEventBuilder";
import { EventPublisher } from "@snort/system";
import QrCode from "./qr";
import { FormattedMessage, useIntl } from "react-intl";
import Copy from "./copy";
import { useWallet } from "../wallet";
import { ZapTarget, Zapper } from "@snort/wallet";
import classNames from "classnames";

const PRESET_AMOUNTS = [21, 100, 500, 1000, 5000, 10000];

export default function ZapFlow({ targets, onClose }: { targets: Array<ZapTarget>; onClose: () => void }) {
  const { system, signer, pubkey } = useEventBuilder();
  const target = targets[0];
  const profile = useUserProfile(target.value);
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isCustom, setIsCustom] = useState(false);
  const [comment, setComment] = useState("");
  const [invoice, setInvoice] = useState("");
  const { formatMessage } = useIntl();
  const wallet = useWallet();

  const finalAmount = isCustom ? (parseInt(customAmount) || 0) : selectedAmount;

  function formatPresetAmount(n: number) {
    if (n >= 1000) {
      return `${(n / 1000).toLocaleString()}k`;
    }
    return n.toLocaleString();
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
            {/* Selected amount display */}
            <div className="text-center py-2">
              <span className="text-3xl font-semibold">{finalAmount.toLocaleString()}</span>
              <span className="text-sm ml-2">sats</span>
            </div>

            {/* Preset amounts grid */}
            <div className="grid grid-cols-3 gap-2">
              {PRESET_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => {
                    setSelectedAmount(amount);
                    setIsCustom(false);
                    setCustomAmount("");
                  }}
                  className={classNames(
                    "py-3 px-4 rounded-xl font-medium transition-colors",
                    selectedAmount === amount && !isCustom
                      ? "bg-primary text-white"
                      : "bg-foreground-2 hover:bg-foreground"
                  )}
                >
                  {formatPresetAmount(amount)}
                </button>
              ))}
            </div>

            {/* Custom amount input */}
            <div className="flex gap-2">
              <input
                type="number"
                className="grow"
                placeholder={formatMessage({ defaultMessage: "Custom amount", description: "Custom amount for zaps" })}
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setIsCustom(true);
                }}
                onFocus={() => setIsCustom(true)}
              />
            </div>

            {/* Comment */}
            <textarea
              placeholder={formatMessage({ defaultMessage: "Personal note" })}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />

            <PrimaryButton
              disabled={finalAmount <= 0}
              onClick={async () => {
                if (signer && pubkey && finalAmount > 0) {
                  const zapper = new Zapper(system, new EventPublisher(signer, pubkey));
                  await zapper.load(targets);
                  const res = await zapper.send(
                    wallet.wallet,
                    targets.map((a) => ({ ...a, memo: comment })),
                    finalAmount,
                  );
                  if (!res[0].paid) {
                    setInvoice(res[0].pr);
                  } else {
                    onClose();
                  }
                }
              }}
            >
              <FormattedMessage defaultMessage="Zap" /> {finalAmount.toLocaleString()} sats
            </PrimaryButton>
          </>
        )}
      </div>
    </Modal>
  );
}
