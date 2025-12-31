import { Link, useNavigate } from "react-router-dom";
import Button, { PrimaryButton, SecondaryButton } from "./button";
import {
  loginWith,
  generateNostrConnectParams,
  generateNostrConnectURI,
  loginWithNostrConnect,
  NostrConnectParams,
} from "../login";
import { FormattedMessage, useIntl } from "react-intl";
import { useState, useEffect, useCallback, useRef } from "react";
import { bech32ToHex, fetchNostrAddress, isHex } from "@snort/shared";
import { Nip46Signer } from "@snort/system";
import QrCode from "./qr";
import Spinner from "./spinner";

type LoginTab = "extension" | "connect" | "nsec";

export default function Login() {
  const [activeTab, setActiveTab] = useState<LoginTab>(() => {
    // Default to extension if available, otherwise connect
    return "nostr" in window ? "extension" : "connect";
  });
  const [username, setUsername] = useState("");
  const [bunkerUri, setBunkerUri] = useState("");
  const [showBunkerInput, setShowBunkerInput] = useState(false);
  const [error, setError] = useState("");
  const [connectParams, setConnectParams] = useState<NostrConnectParams | null>(null);
  const [connectUri, setConnectUri] = useState("");
  const [isWaitingForConnect, setIsWaitingForConnect] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { formatMessage } = useIntl();
  const navigate = useNavigate();

  const hasExtension = "nostr" in window;

  const errorCodes = {
    invalid: formatMessage({ defaultMessage: "Invalid login details", id: "7bWt93" }),
    notFound: formatMessage({ defaultMessage: "Nostr address not found", id: "ldIFD4" }),
    notBunker: formatMessage({ defaultMessage: "Address is not a nostr bunker", id: "v4Y2S4" }),
    connectionTimeout: formatMessage({ defaultMessage: "Connection timed out", id: "gsMTMh" }),
    connectionFailed: formatMessage({ defaultMessage: "Connection failed", id: "AyknBt" }),
  };

  // Generate nostrconnect params
  const generateConnectSession = useCallback(() => {
    const params = generateNostrConnectParams();
    const uri = generateNostrConnectURI(params, "Nests");
    setConnectParams(params);
    setConnectUri(uri);
    setError("");
  }, []);

  // Start listening for connection when params are set
  useEffect(() => {
    if (!connectParams || isWaitingForConnect) return;

    const startListening = async () => {
      setIsWaitingForConnect(true);
      abortControllerRef.current = new AbortController();

      // Set a timeout
      const timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, 120_000); // 2 minutes

      try {
        await loginWithNostrConnect(connectParams, abortControllerRef.current.signal);
        clearTimeout(timeoutId);
        navigate("/");
      } catch (e) {
        clearTimeout(timeoutId);
        if (e instanceof Error && e.message !== "Connection aborted") {
          setError(e.message || errorCodes.connectionFailed);
        } else if (e instanceof Error && e.message === "Connection aborted") {
          setError(errorCodes.connectionTimeout);
        }
        setIsWaitingForConnect(false);
      }
    };

    startListening();
  }, [connectParams, isWaitingForConnect, navigate, errorCodes.connectionFailed, errorCodes.connectionTimeout]);

  // Generate connect session when switching to connect tab
  useEffect(() => {
    if (activeTab === "connect" && !connectParams && !error) {
      generateConnectSession();
    }
  }, [activeTab, connectParams, error, generateConnectSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleRetry = useCallback(() => {
    abortControllerRef.current?.abort();
    setConnectParams(null);
    setConnectUri("");
    setIsWaitingForConnect(false);
    setError("");
    setTimeout(() => generateConnectSession(), 0);
  }, [generateConnectSession]);

  const handleCopyUri = async () => {
    await navigator.clipboard.writeText(connectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Nsec/bunker login
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

  async function resolveBunkerUrl(input: string) {
    if (input.includes("@")) {
      const [name, domain] = input.split("@");
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
      return input;
    }
  }

  async function doBunkerLogin(input?: string) {
    try {
      const url = await resolveBunkerUrl(input || username);
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

  async function handleManualBunkerLogin() {
    if (!bunkerUri.trim()) return;
    if (!bunkerUri.startsWith("bunker://")) {
      setError(errorCodes.invalid);
      return;
    }
    await doBunkerLogin(bunkerUri);
  }

  return (
    <div className="flex flex-col gap-6 items-center justify-center w-full max-w-md">
      <h1>
        <FormattedMessage defaultMessage="Sign in" id="odXmn8" />
      </h1>

      {/* Tabs */}
      <div className="flex w-full border-b border-foreground-2">
        {hasExtension && (
          <button
            onClick={() => setActiveTab("extension")}
            className={`flex-1 py-3 px-4 text-center text-lg ${
              activeTab === "extension"
                ? "border-b-2 border-primary text-primary font-semibold"
                : "text-foreground-2 hover:text-primary font-medium"
            }`}
          >
            <FormattedMessage defaultMessage="Extension" id="+iV+lb" />
          </button>
        )}
        <button
          onClick={() => setActiveTab("connect")}
          className={`flex-1 py-3 px-4 text-center text-lg ${
            activeTab === "connect"
              ? "border-b-2 border-primary text-primary font-semibold"
              : "text-foreground-2 hover:text-primary font-medium"
          }`}
        >
          <FormattedMessage defaultMessage="Connect" id="a2xj0Q" />
        </button>
        <button
          onClick={() => setActiveTab("nsec")}
          className={`flex-1 py-3 px-4 text-center text-lg ${
            activeTab === "nsec"
              ? "border-b-2 border-primary text-primary font-semibold"
              : "text-foreground-2 hover:text-primary font-medium"
          }`}
        >
          <FormattedMessage defaultMessage="Nsec" id="ZThfyD" />
        </button>
      </div>

      {/* Tab content */}
      <div className="w-full min-h-[280px]">
        {/* Extension Tab */}
        {activeTab === "extension" && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-foreground-2 text-center">
              <FormattedMessage
                defaultMessage="Sign in using your browser extension (Alby, nos2x, etc.)"
                id="rWCW3v"
              />
            </p>
            <PrimaryButton
              onClick={async () => {
                try {
                  await loginWith("nip7");
                  navigate("/");
                } catch (e) {
                  if (e instanceof Error) {
                    setError(e.message);
                  }
                }
              }}
            >
              <FormattedMessage defaultMessage="Sign in with extension" id="QcNbCg" />
            </PrimaryButton>
            {error && <b className="text-delete">{error}</b>}
          </div>
        )}

        {/* Connect Tab */}
        {activeTab === "connect" && (
          <div className="flex flex-col items-center gap-4">
            {error ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <p className="text-delete text-center">{error}</p>
                <SecondaryButton onClick={handleRetry}>
                  <FormattedMessage defaultMessage="Try Again" id="gqH4cW" />
                </SecondaryButton>
              </div>
            ) : connectUri ? (
              <>
                <div className="bg-white p-4 rounded-xl">
                  <QrCode data={connectUri} width={200} height={200} />
                </div>
                <div className="flex items-center gap-2 text-foreground-2">
                  {isWaitingForConnect ? (
                    <>
                      <Spinner className="w-4 h-4" />
                      <span>
                        <FormattedMessage defaultMessage="Waiting for connection..." id="X0Nuq5" />
                      </span>
                    </>
                  ) : (
                    <span>
                      <FormattedMessage defaultMessage="Scan with your signer app" id="D3pCPn" />
                    </span>
                  )}
                </div>
                <SecondaryButton onClick={handleCopyUri}>
                  {copied ? (
                    <FormattedMessage defaultMessage="Copied!" id="szuHw0" />
                  ) : (
                    <FormattedMessage defaultMessage="Copy Connection String" id="ikhYUY" />
                  )}
                </SecondaryButton>

                {/* Manual bunker input */}
                <div className="w-full pt-4 border-t border-foreground-2">
                  <button
                    onClick={() => setShowBunkerInput(!showBunkerInput)}
                    className="flex items-center justify-center gap-2 w-full text-sm text-foreground-3 hover:text-foreground py-2"
                  >
                    <span>
                      <FormattedMessage defaultMessage="Manual bunker connection" id="Bfifzx" />
                    </span>
                    <span>{showBunkerInput ? "▲" : "▼"}</span>
                  </button>
                  {showBunkerInput && (
                    <div className="flex flex-col gap-3 mt-3">
                      <input
                        type="text"
                        className="w-full"
                        placeholder="bunker://..."
                        value={bunkerUri}
                        onChange={(e) => setBunkerUri(e.target.value)}
                      />
                      <SecondaryButton onClick={handleManualBunkerLogin} disabled={!bunkerUri.trim()}>
                        <FormattedMessage defaultMessage="Connect with Bunker" id="A2mL5b" />
                      </SecondaryButton>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <Spinner className="w-8 h-8" />
              </div>
            )}
          </div>
        )}

        {/* Nsec Tab */}
        {activeTab === "nsec" && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 w-full">
              <input
                type={username.startsWith("nsec") ? "password" : "text"}
                className="grow"
                placeholder={formatMessage({ defaultMessage: "nsec / user@nsec.app", id: "tMCYLt" })}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <Button className="rounded-xl bg-primary" onClick={doLogin}>
                <FormattedMessage defaultMessage="Login" id="r2Jjms" />
              </Button>
            </div>
            {error && <b className="text-delete">{error}</b>}
          </div>
        )}
      </div>

      <Link to="/sign-up" className="text-highlight">
        <FormattedMessage defaultMessage="Create a nostr account" id="qUVdL3" />
      </Link>
    </div>
  );
}
