import { base64 } from "@scure/base";
import { EventBuilder, EventKind, EventSigner } from "@snort/system";

export interface RoomInfo {
  host: string;
  speakers: Array<string>;
  admins: Array<string>;
  link: string;
  recording: boolean;
}

export interface RoomRecording {
  id: string;
  started: number;
  stopped?: number;
  url: string;
}

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
  async updatePermissions(
    room: string,
    identity: string,
    req: { can_publish?: boolean; mute_microphone?: boolean; is_admin?: boolean },
  ) {
    return await this.#fetchNoReturn(
      "POST",
      true,
      `/api/v1/nests/${room}/permissions`,
      JSON.stringify({
        participant: identity,
        ...req,
      }),
    );
  }

  async getRoomInfo(room: string) {
    return await this.#fetch<RoomInfo>("GET", false, `/api/v1/nests/${room}/info`);
  }

  async startRecording(room: string) {
    return await this.#fetchNoReturn("POST", true, `/api/v1/nests/${room}/recording`);
  }

  async stopRecording(room: string, recording: string) {
    return await this.#fetchNoReturn("PATCH", true, `/api/v1/nests/${room}/recording/${recording}`);
  }

  async deleteRecording(room: string, recording: string) {
    return await this.#fetchNoReturn("DELETE", true, `/api/v1/nests/${room}/recording/${recording}`);
  }

  async listRecording(room: string) {
    return await this.#fetch<Array<RoomRecording>>("GET", true, `/api/v1/nests/${room}/recording`);
  }

  async getRecording(room: string, recording: string) {
    const url = `${this.url}/api/v1/nests/${room}/recording/${recording}`;
    const headers: HeadersInit = {
      accept: "application/json",
      "content-type": "application/json",
      authorization: await this.#nip96("GET", url),
    };
    const rsp = await fetch(url, {
      headers,
    });
    if (rsp.ok) {
      return await rsp.blob();
    }

    throw new Error();
  }

  async #fetch<R>(method: "GET" | "PUT" | "POST" | "PATCH", auth: boolean, path: string, body?: BodyInit): Promise<R> {
    const url = `${this.url}${path}`;
    const headers: HeadersInit = {
      accept: "application/json",
      "content-type": "application/json",
    };
    if (auth) {
      headers["authorization"] = await this.#nip96(method, url);
    }
    const rsp = await fetch(url, {
      method: method,
      body,
      headers,
    });
    if (rsp.ok) {
      return (await rsp.json()) as R;
    }

    throw new Error(await rsp.text());
  }

  async #fetchNoReturn(
    method: "GET" | "PUT" | "POST" | "PATCH" | "DELETE",
    auth: boolean,
    path: string,
    body?: BodyInit,
  ): Promise<void> {
    const url = `${this.url}${path}`;
    const headers: HeadersInit = {
      accept: "application/json",
      "content-type": "application/json",
    };
    if (auth) {
      headers["authorization"] = await this.#nip96(method, url);
    }
    const rsp = await fetch(url, {
      method: method,
      body,
      headers,
    });
    if (!rsp.ok) {
      throw new Error(await rsp.text());
    }
  }

  async #nip96(method: string, url: string) {
    if (!this.signer) {
      throw new Error("No signer, cannot auth");
    }
    const builder = new EventBuilder();
    builder.tag(["u", url]);
    builder.tag(["method", method]);
    builder.kind(EventKind.HttpAuthentication);
    const ev = JSON.stringify(await builder.buildAndSign(this.signer));
    return `Nostr ${base64.encode(new TextEncoder().encode(ev))}`;
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
