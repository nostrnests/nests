import { useState } from "react";
import { LNWallet, ZapTarget, Zapper } from "../zapper";
import DisplayName from "./display-name";
import Modal from "./modal";
import IconButton from "./icon-button";
import { PrimaryButton } from "./button";
import { useUserProfile } from "@snort/system-react";
import useEventBuilder from "../hooks/useEventBuilder";
import { EventPublisher } from "@snort/system";
import QrCode from "./qr";

const WebLnWallet = {
  payInvoice: async (pr: string) => {
    const res = await window.webln!.sendPayment(pr);
    return {
      ...res,
      isPaid: Boolean(res.preimage),
    };
  },
} as LNWallet;

export default function ZapFlow({ targets, onClose }: { targets: Array<ZapTarget>; onClose: () => void }) {
  const { system, signer, pubkey } = useEventBuilder();
  const target = targets[0];
  const profile = useUserProfile(target.value);
  const inc = 500;
  const [amount, setAmount] = useState(inc);
  const [comment, setComment] = useState("");
  const [invoice, setInvoice] = useState("");

  return (
    <Modal id="zap" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {target.type === "pubkey" && <DisplayName pubkey={target.value!} profile={profile} className="text-center" />}
        {invoice && <QrCode data={`lightning:${invoice}`} className="mx-auto" />}
        {!invoice && (
          <>
            <div className="grid grid-cols-[max-content_auto_max-content] items-center select-none">
              <IconButton
                name="chevron"
                className="rounded-full aspect-square"
                onClick={() => setAmount((v) => Math.max(inc, v - inc))}
              />
              <div className="text-center">
                <div className="text-3xl font-semibold">{(amount / 1000).toLocaleString()}K</div>
                <div className="text-sm">Sats</div>
              </div>
              <IconButton
                name="chevron"
                className="rounded-full aspect-square rotate-180"
                onClick={() => setAmount((v) => Math.min(1_000_000, v + inc))}
              />
            </div>
            <textarea placeholder="Personal note" value={comment} onChange={(e) => setComment(e.target.value)} />
            <PrimaryButton
              onClick={async () => {
                if (signer && pubkey) {
                  await window.webln?.enable();
                  const zapper = new Zapper(system, new EventPublisher(signer, pubkey));
                  await zapper.load(targets);
                  const res = await zapper.send(
                    window.webln ? WebLnWallet : undefined,
                    targets.map((a) => ({ ...a, memo: comment })),
                    amount,
                  );
                  if (!res[0].paid) {
                    setInvoice(res[0].pr);
                  }
                }
              }}
            >
              Zap
            </PrimaryButton>
          </>
        )}
      </div>
    </Modal>
  );
}
