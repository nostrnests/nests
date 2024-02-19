import { Link, useNavigate } from "react-router-dom";
import { PrimaryButton } from "./button";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { Nip46Signer } from "@snort/system";
import { fetchNostrAddress } from "@snort/shared";
import { loginWith } from "../login";

const Bunker = "nsec.app";
export default function SignUp() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  async function createAccount() {
    const nip5 = await fetchNostrAddress("_", Bunker);
    const bunkerPubkey = nip5?.names["_"];
    if (!bunkerPubkey) {
      throw new Error("Not a valid bunker");
    }

    const bunkerRelays = nip5.nip46?.[bunkerPubkey];
    if (!bunkerRelays) {
      throw new Error("Not a valid bunker");
    }

    const bunker = new Nip46Signer(`bunker://${bunkerPubkey}?relay=${encodeURIComponent(bunkerRelays[0])}`);
    bunker.on("oauth", (url) => {
      window.open(url, "Bunker", "width=600,height=800,popup=yes");
    });
    await bunker.createAccount(username, Bunker, email);
    await loginWith("nip46", bunker);
    navigate(-1);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-center">
        <FormattedMessage defaultMessage="Create an account" />
      </h1>
      <div className="flex gap-2 items-center bg-foreground-2 rounded-xl">
        <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />@
        {Bunker}
      </div>
      <input type="text" placeholder="Recovery email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <PrimaryButton onClick={createAccount}>
        <FormattedMessage defaultMessage="Create account" />
      </PrimaryButton>
      <p className="text-center">
        <FormattedMessage defaultMessage="Already have an account" />
        <Link to="/login" className="text-highlight">
          <FormattedMessage defaultMessage="Sign in" />
        </Link>
      </p>
    </div>
  );
}
