import { base64 } from "@scure/base";
import { EventBuilder, EventKind, EventSigner } from "@snort/system";

export class NestsApi {
  constructor(
    readonly url: string,
    readonly signer?: EventSigner,
  ) {}

  async createRoom(): Promise<CreateRoomResponse> {
    return await this.#fetch<CreateRoomResponse>("GET", true, "/api/v1/nests");
  }

  async joinRoom(room: string) {
    if (this.signer) {
      return await this.#fetch<JoinRoomResponse>("GET", true, `/api/v1/nests/${room}`);
    } else {
      return await this.#fetch<JoinRoomResponse>("GET", false, `/api/v1/nests/${room}/guest`);
    }
  }

  /**
   * Update a participants permissions (roomAdmin required)
   * @param room
   * @param identity
   * @param canPublish
   * @returns
   */
  async updatePermissions(room: string, identity: string, canPublish: boolean) {
    return await this.#fetch(
      "POST",
      true,
      `/api/v1/nests/${room}/permissions`,
      JSON.stringify({
        participant: identity,
        can_publish: canPublish,
      }),
    );
  }

  async #fetch<R>(method: "GET" | "PUT" | "POST", auth: boolean, path: string, body?: BodyInit) {
    const url = `${this.url}${path}`;
    const headers: HeadersInit = {
      accept: "application/json",
      "content-type": "application/json",
    };
    if (auth) {
      if (!this.signer) {
        throw new Error("No signer, cannot auth");
      }
      const builder = new EventBuilder();
      builder.tag(["u", url]);
      builder.tag(["method", method]);
      builder.kind(EventKind.HttpAuthentication);

      const ev = JSON.stringify(await builder.buildAndSign(this.signer));
      headers["authorization"] = `Nostr ${base64.encode(new TextEncoder().encode(ev))}`;
    }
    const rsp = await fetch(url, {
      method: method,
      body,
      headers,
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
