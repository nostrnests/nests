import { useState } from "react";
import { Navigate } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import { PrimaryButton, SecondaryButton } from "../element/button";
import Icon from "../icon";
import IconButton from "../element/icon-button";
import { useLogin } from "../login";
import { useMoqServerList } from "../hooks/useMoqServerList";
import { DefaultMoQServers } from "../const";

export default function Settings() {
  const login = useLogin();

  if (login.type === "none") return <Navigate to="/login" />;

  return (
    <div className="lg:w-140 max-lg:px-4 mx-auto flex flex-col gap-8 mt-10 mb-20">
      <h1 className="text-center">
        <FormattedMessage defaultMessage="Settings" />
      </h1>
      <MoqServerSettings />
    </div>
  );
}

function MoqServerSettings() {
  const { servers, hasPublished, dirty, addServer, removeServer, moveServer, save, saving } = useMoqServerList();
  const [input, setInput] = useState("");

  function handleAdd() {
    let url = input.trim();
    if (!url) return;

    // Ensure it has a protocol
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }

    try {
      new URL(url); // validate
      addServer(url);
      setInput("");
    } catch {
      // invalid URL, ignore
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="mb-1">
          <FormattedMessage defaultMessage="Audio Servers" />
        </h2>
        <p className="text-off-white text-sm">
          <FormattedMessage defaultMessage="MoQ relay servers used for audio in your rooms. When you create a room, the first available server is used. Anyone can run a Nests audio server." />
        </p>
      </div>

      {!hasPublished && (
        <div className="bg-foreground-2 rounded-xl p-4 text-sm text-off-white">
          <FormattedMessage defaultMessage="You haven't published an audio server list yet. The defaults below will be used. Save to publish your preferences to Nostr." />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {servers.map((server, i) => (
          <div
            key={server}
            className="flex gap-2 items-center bg-foreground px-4 py-3 rounded-xl"
          >
            <div className="flex flex-col gap-1 mr-1">
              <button
                className="text-off-white hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-default"
                disabled={i === 0}
                onClick={() => moveServer(i, i - 1)}
              >
                <Icon name="chevron" size={14} className="rotate-180" />
              </button>
              <button
                className="text-off-white hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-default"
                disabled={i === servers.length - 1}
                onClick={() => moveServer(i, i + 1)}
              >
                <Icon name="chevron" size={14} />
              </button>
            </div>
            <div className="grow select-none">
              <span className="text-off-white">{server}</span>
              {i === 0 && (
                <span className="ml-2 text-xs text-primary font-medium">
                  <FormattedMessage defaultMessage="Primary" />
                </span>
              )}
              {DefaultMoQServers.includes(server) && (
                <span className="ml-2 text-xs text-off-white opacity-50">
                  <FormattedMessage defaultMessage="(default)" />
                </span>
              )}
            </div>
            <IconButton
              name="trash"
              size={18}
              className="text-delete hover:text-delete/80 cursor-pointer"
              onClick={() => removeServer(server)}
            />
          </div>
        ))}
        {servers.length === 0 && (
          <div className="text-center text-off-white py-4">
            <FormattedMessage defaultMessage="No servers configured. Add one below or defaults will be used when creating rooms." />
          </div>
        )}
      </div>

      <div className="flex gap-2 items-center">
        <input
          className="grow"
          type="text"
          placeholder="https://moq.example.com"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
        />
        <SecondaryButton onClick={handleAdd}>
          <FormattedMessage defaultMessage="Add" />
        </SecondaryButton>
      </div>

      {dirty && (
        <PrimaryButton onClick={save} loading={saving}>
          <FormattedMessage defaultMessage="Save to Nostr" />
        </PrimaryButton>
      )}
    </div>
  );
}
