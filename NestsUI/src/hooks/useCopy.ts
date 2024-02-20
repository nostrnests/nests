import { useState } from "react";

export const useCopy = (timeout = 2000) => {
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async (text: string) => {
    setError(false);
    try {
      await copy(text);
      setCopied(true);
    } catch (error) {
      setError(true);
    }

    setTimeout(() => setCopied(false), timeout);
  };

  return { error, copied, copy };
};

export async function copy(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
  } else {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "absolute";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
  }
}
