import { useState } from "react";

export const useCopy = (timeout = 2000) => {
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyInternal = async (text: string) => {
    setError(false);
    try {
      await copy(text);
      setCopied(true);
    } catch (error) {
      setError(true);
    }

    setTimeout(() => setCopied(false), timeout);
  };

  return { error, copied, copy: copyInternal };
};

export async function copy(text: string) {
  const fallbackCopy = async () => {
    console.debug("Trying fallback copy");
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "absolute";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();
    await document.execCommand("copy");
    textArea.remove();
  };

  try {
    const allowed = await navigator.permissions.query({
      name: "clipboard-write" as PermissionName,
    });
    console.debug(allowed);
    if (allowed.state === "granted" || allowed.state === "prompt") {
      await navigator.clipboard.writeText(text);
    } else {
      await fallbackCopy();
    }
  } catch (e) {
    console.error(e);
    await fallbackCopy();
  }
}
