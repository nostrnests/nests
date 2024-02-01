import { base64 } from "@scure/base";
import { EventBuilder, EventKind, EventSigner } from "@snort/system";

export class NestsApi {
  constructor(readonly url: string, readonly signer: EventSigner) {}

  async createRoom(): Promise<CreateRoomResponse> {
    return await this.#fetch<CreateRoomResponse>("GET", "/api/v1/nests");
  }

  async joinRoom(room: string) {
    return await this.#fetch<JoinRoomResponse>(
      "GET",
      `/api/v1/nests/join/${room}`
    );
  }

  async #fetch<R>(
    method: "GET" | "PUT" | "POST",
    path: string,
    body?: BodyInit
  ) {
    const url = `${this.url}${path}`;
    const builder = new EventBuilder();
    builder.tag(["u", url]);
    builder.tag(["method", method]);
    builder.kind(EventKind.HttpAuthentication);

    const ev = JSON.stringify(await builder.buildAndSign(this.signer));
    const rsp = await fetch(url, {
      method: method,
      body,
      headers: {
        authorization: `Nostr ${base64.encode(new TextEncoder().encode(ev))}`,
        accept: "application/json",
      },
    });
    if (rsp.ok) {
      return (await rsp.json()) as R;
    }

    throw new Error();
  }
}

export interface CreateRoomResponse {
  roomId: string;
  endpoints: Array<string>;
  token: string;
}

export interface JoinRoomResponse {
  token: string;
}