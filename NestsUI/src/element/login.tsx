import { Link, useNavigate } from "react-router-dom";
import Button, { PrimaryButton } from "./button";
import { loginWith } from "../login";
import { FormattedMessage, useIntl } from "react-intl";
import { useState } from "react";
import { fetchNostrAddress } from "@snort/shared";
import { Nip46Signer } from "@snort/system";

export default function Login() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const { formatMessage } = useIntl();
  const navigate = useNavigate();

  const errorCodes = {
    invalid: formatMessage({ defaultMessage: "Not a valid nostr address" }),
    notFound: formatMessage({ defaultMessage: "Nostr address not found" }),
    notBunker: formatMessage({ defaultMessage: "Address is not a nostr bunker" }),
  };

  async function doLogin() {
    setError("");
    if (!username.includes("@")) {
      setError(errorCodes.invalid);
      return;
    }

    const [name, domain] = username.split("@");
    try {
      const nip5 = await fetchNostrAddress(name, domain);
      if (!nip5) {
        setError(errorCodes.invalid);
        return;
      }
      const [, pubkey] = Object.entries(nip5.names).find(([k]) => k.toLowerCase() === name.toLowerCase()) ?? [
        undefined,
        undefined,
      ];
      if (!pubkey) {
        setError(errorCodes.notFound);
        return;
      }
      const bunkerRelays = nip5.nip46?.[pubkey];
      if (!bunkerRelays) {
        setError(errorCodes.notBunker);
        return;
      }

      const url = `bunker://${pubkey}?${bunkerRelays.map((a) => `relay=${encodeURIComponent(a)}`).join("&")}`;
      const bunker = new Nip46Signer(url);
      bunker.on("oauth", (url) => {
        window.open(url, undefined, "width=600,height=800,popup=yes");
      });
      await bunker.init();
      loginWith("nip46", bunker);
      navigate("/");
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 items-center justify-center">
      <h1>
        <FormattedMessage defaultMessage="Sign in" />
      </h1>
      <div className="flex gap-2 w-full">
        <input
          type="text"
          className="grow"
          placeholder={formatMessage({ defaultMessage: "Nostr Address" })}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Button className="rounded-xl bg-primary" onClick={doLogin}>
          <FormattedMessage defaultMessage="Login" />
        </Button>
      </div>
      {error && <b className="text-delete">{error}</b>}
      <PrimaryButton
        onClick={async () => {
          await loginWith("nip7");
          navigate("/");
        }}
      >
        <FormattedMessage defaultMessage="Sign in with extension" />
      </PrimaryButton>
      <Link to="/sign-up" className="text-highlight">
        <FormattedMessage defaultMessage="Create a nostr account" />
      </Link>
    </div>
  );
}
