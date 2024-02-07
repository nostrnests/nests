import { NostrEvent } from "@snort/system";

export interface UploadResult {
  url?: string;
  error?: string;

  /**
   * NIP-94 File Header
   */
  header?: NostrEvent;

  /**
   * Media metadata
   */
  metadata?: {
    blurhash?: string;
    width?: number;
    height?: number;
    hash?: string;
  };
}

export async function openFile(): Promise<File | undefined> {
  return new Promise((resolve) => {
    const elm = document.createElement("input");
    let lock = false;
    elm.type = "file";
    const handleInput = (e: Event) => {
      lock = true;
      const elm = e.target as HTMLInputElement;
      if ((elm.files?.length ?? 0) > 0) {
        resolve(elm.files![0]);
      } else {
        resolve(undefined);
      }
    };

    elm.onchange = (e) => handleInput(e);
    elm.click();
    window.addEventListener(
      "focus",
      () => {
        setTimeout(() => {
          if (!lock) {
            resolve(undefined);
          }
        }, 300);
      },
      { once: true },
    );
  });
}
