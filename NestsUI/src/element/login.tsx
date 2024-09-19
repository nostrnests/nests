import { Link, useNavigate } from "react-router-dom";
import Button, { PrimaryButton } from "./button";
import { loginWith } from "../login";
import { FormattedMessage, useIntl } from "react-intl";
import { useState } from "react";
import { bech32ToHex, fetchNostrAddress, isHex } from "@snort/shared";
import { Nip46Signer } from "@snort/system";

export default function Login() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const { formatMessage } = useIntl();
  const navigate = useNavigate();

  const errorCodes = {
    invalid: formatMessage({ defaultMessage: "Invalid login details" }),
    notFound: formatMessage({ defaultMessage: "Nostr address not found" }),
    notBunker: formatMessage({ defaultMessage: "Address is not a nostr bunker" }),
  };

  async function doLogin() {
    setError("");
    if (username.startsWith("nsec1")) {
      await doNsecLogin();
    } else if (username.includes("@")) {
      await doBunkerLogin();
    } else if (username.startsWith("bunker://")) {
      await doBunkerLogin();
    } else {
      setError(errorCodes.invalid);
    }
  }

  async function doNsecLogin() {
    try {
      const hexKey = bech32ToHex(username);
      if (hexKey.length !== 64 || !isHex(hexKey)) {
        setError(errorCodes.invalid);
        return;
      }
      await loginWith("nsec", hexKey);
      navigate("/");
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      }
    }
  }

  async function resolveBunkerUrl() {
    if (username.includes("@")) {
      const [name, domain] = username.split("@");
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
      return `bunker://${pubkey}?${bunkerRelays.map((a) => `relay=${encodeURIComponent(a)}`).join("&")}`;
    } else {
      return username;
    }
  }
  async function doBunkerLogin() {
    try {
      const url = await resolveBunkerUrl();
      if (!url) return;

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
      } else if (typeof e === "string") {
        setError(e);
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
          type={username.startsWith("nsec") ? "password" : "text"}
          className="grow"
          placeholder={formatMessage({ defaultMessage: "nsec / user@nsec.app" })}
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
