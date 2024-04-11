import { useState, useEffect } from "react";
import { FormattedNumber } from "react-intl";
import Icon from "../icon";
import { useWallet } from "../wallet";

export default function WalletBalance() {
  const [balance, setBalance] = useState(0);
  const wallet = useWallet();
  useEffect(() => {
    if (wallet.wallet?.isReady()) {
      wallet.wallet?.getBalance().then((b) => {
        setBalance(b);
      });
    }
  }, [wallet]);

  return (
    <div className="flex items-center gap-2">
      <Icon name="sats" size={18} />
      <FormattedNumber value={balance} />
    </div>
  );
}
