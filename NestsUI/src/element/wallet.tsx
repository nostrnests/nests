import { FormattedMessage, FormattedNumber } from "react-intl";
import Icon from "../icon";
import { PrimaryButton } from "./button";
import { Link } from "react-router-dom";
import { Wallets, useWallet } from "../wallet";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import { NostrConnectWallet, WalletKind } from "@snort/wallet";

export default function Wallet() {
  const [connect, setConnect] = useState<string>();
  const [error, setError] = useState<string>();
  const [balance, setBalance] = useState(0);
  const wallet = useWallet();
  useEffect(() => {
    if (wallet.wallet?.isReady()) {
      wallet.wallet?.getBalance().then((b) => {
        setBalance(b);
      });
    }
  }, [wallet]);

  function connectWallet() {
    return (
      <>
        <hr className="bg-foreground-3" />
        <h4>
          <FormattedMessage defaultMessage="Nostr Wallet Connect" />
        </h4>
        <FormattedMessage defaultMessage="Connect a wallet to send instant payments" />
        <input
          type="text"
          onChange={(e) => setConnect(e.target.value)}
          className="bg-foreground-2"
          placeholder="nostr+walletconnect:"
        />
        <PrimaryButton
          onClick={async () => {
            if (connect) {
              try {
                const c = new NostrConnectWallet(connect);
                const info = await c.getInfo();
                Wallets.add({
                  id: uuid(),
                  kind: WalletKind.NWC,
                  data: connect,
                  active: true,
                  info,
                });
                setConnect(undefined);
              } catch (e) {
                if (e instanceof Error) {
                  setError(e.message);
                } else {
                  setError("Connect error, please check your NWC string");
                }
              }
            }
          }}
        >
          <FormattedMessage defaultMessage="Connect" />
        </PrimaryButton>
        {error && <b className="text-delete">{error}</b>}
        <p>
          <FormattedMessage
            defaultMessage="Using Alby? Go to {link} to get your NWC config. Or see {other_link}"
            values={{
              link: (
                <Link to="https://nwc.getalby.com" className="underline">
                  nwc.getalby.com
                </Link>
              ),
              other_link: (
                <Link to="https://nostr.com" className="underline">
                  additional help
                </Link>
              ),
            }}
          />
        </p>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3 bg-foreground-3 rounded-2xl px-6 py-4">
      <h3>{wallet.wallet ? wallet.config?.info.alias : <FormattedMessage defaultMessage="My Wallet" />}</h3>
      <div className="flex gap-2 items-center">
        <Icon name="sats" size={24} />
        <FormattedMessage
          defaultMessage="{n} sats"
          values={{
            n: (
              <span className="text-xl font-medium">
                <FormattedNumber value={balance} />
              </span>
            ),
          }}
        />
      </div>
      {!wallet.wallet && connectWallet()}
    </div>
  );
}
