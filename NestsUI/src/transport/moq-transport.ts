import * as Moq from "@moq/lite";
import * as Publish from "@moq/publish";
import * as Watch from "@moq/watch";
import type {
  ConnectionState,
  NestTransport,
  RemoteParticipant,
  TransportConfig,
  Unsubscribe,
} from "./types";

/**
 * MoQ implementation of the NestTransport interface.
 *
 * Handles:
 * - Connecting to a MoQ relay via WebTransport
 * - Publishing local microphone audio via @moq/publish
 * - Discovering remote participants via MoQ announcements
 * - Subscribing to and rendering remote audio via @moq/watch
 */
export class MoQAudioTransport implements NestTransport {
  private config: TransportConfig | null = null;
  private connection: Moq.Connection.Reload | null = null;

  // Publishing
  private microphone: Publish.Source.Microphone | null = null;
  private publishBroadcast: Publish.Broadcast | null = null;

  // Watching
  private watchBroadcasts = new Map<
    string,
    {
      broadcast: Watch.Broadcast;
      sync: Watch.Sync;
      audioSource: Watch.Audio.Source;
      decoder: Watch.Audio.Decoder;
      emitter: Watch.Audio.Emitter;
    }
  >();

  // State
  private _state: ConnectionState = "disconnected";
  private _isMicEnabled = false;
  private _isPublishing = false;
  private _volume = 1.0;
  private _participants = new Map<string, RemoteParticipant>();

  // Listeners
  private stateListeners = new Set<(state: ConnectionState) => void>();
  private localStateListeners = new Set<() => void>();
  private participantListeners = new Set<(participants: ReadonlyMap<string, RemoteParticipant>) => void>();

  // Announcement polling
  private announcementPollInterval: ReturnType<typeof setInterval> | null = null;
  private previousAnnounced = new Set<string>();

  get state(): ConnectionState {
    return this._state;
  }

  get isMicEnabled(): boolean {
    return this._isMicEnabled;
  }

  get isPublishing(): boolean {
    return this._isPublishing;
  }

  get volume(): number {
    return this._volume;
  }

  get participants(): ReadonlyMap<string, RemoteParticipant> {
    return this._participants;
  }

  // --- Lifecycle ---

  async connect(config: TransportConfig): Promise<void> {
    // Clean up any existing connection first (handles React StrictMode double-invoke)
    if (this.connection) {
      this.disconnect();
    }

    this.config = config;
    this.setState("connecting");

    try {
      // Build the relay URL
      const relayUrl = new URL(config.serverUrl);
      // Append the room namespace as path
      relayUrl.pathname = `/${config.roomNamespace}`;

      // Attach JWT token for moq-relay auth (relay expects ?jwt= parameter)
      if (config.token) {
        relayUrl.searchParams.set("jwt", config.token);
      }

      // Build WebTransport options (for self-signed certs in dev)
      const wtOptions: WebTransportOptions = {};
      if (config.certFingerprint) {
        // Fingerprint can be hex (from moq-relay /certificate.sha256) or base64
        const fp = config.certFingerprint;
        let fingerprintBytes: Uint8Array;
        if (/^[0-9a-f]+$/i.test(fp) && fp.length === 64) {
          // Hex-encoded SHA-256 (32 bytes = 64 hex chars)
          fingerprintBytes = new Uint8Array(32);
          for (let i = 0; i < 32; i++) {
            fingerprintBytes[i] = parseInt(fp.substring(i * 2, i * 2 + 2), 16);
          }
        } else {
          // Base64-encoded
          fingerprintBytes = Uint8Array.from(atob(fp), (c) => c.charCodeAt(0));
        }
        wtOptions.serverCertificateHashes = [
          {
            algorithm: "sha-256",
            value: fingerprintBytes.buffer as ArrayBuffer,
          },
        ];
      }

      this.connection = new Moq.Connection.Reload({
        url: relayUrl,
        enabled: true,
        delay: { initial: 1000, multiplier: 2, max: 30000 },
        webtransport: wtOptions,
      });

      // Watch connection status via signals
      this.connection.status.subscribe((status) => {
        switch (status) {
          case "connected":
            this.setState("connected");
            this.startAnnouncementPolling();
            break;
          case "connecting":
            this.setState(this._state === "disconnected" ? "connecting" : "reconnecting");
            break;
          case "disconnected":
            this.setState("disconnected");
            this.stopAnnouncementPolling();
            break;
        }
      });
    } catch (err) {
      this.setState("disconnected");
      throw err;
    }
  }

  disconnect(): void {
    this.unpublishMicrophone();
    this.stopAnnouncementPolling();
    this.cleanupWatchBroadcasts();

    if (this.connection) {
      // Close the connection and clean up internal Signals/Effects
      try {
        this.connection.close();
      } catch {
        // close() may not exist on older versions, fall back to disabling
        this.connection.enabled.set(false);
      }
      this.connection = null;
    }

    this._participants.clear();
    this.notifyParticipantsChange();
    this.setState("disconnected");
    this.config = null;
  }

  // --- Publishing ---

  async publishMicrophone(deviceId?: string): Promise<void> {
    if (!this.connection || !this.config) {
      throw new Error("Not connected");
    }

    // Create microphone source
    this.microphone = new Publish.Source.Microphone({
      enabled: true,
      ...(deviceId ? { device: { preferred: deviceId } } : {}),
    });

    // Create the publishing broadcast
    const broadcastName = Moq.Path.from(this.config.identity);

    this.publishBroadcast = new Publish.Broadcast({
      connection: this.connection.established,
      enabled: true,
      name: broadcastName,
      audio: {
        source: this.microphone.source,
        enabled: true,
      },
    });

    this._isPublishing = true;
    this._isMicEnabled = true;
    this.notifyLocalStateChange();
  }

  unpublishMicrophone(): void {
    if (this.publishBroadcast) {
      this.publishBroadcast.close();
      this.publishBroadcast = null;
    }

    if (this.microphone) {
      // Stop the microphone track
      const track = this.microphone.source.peek();
      if (track) {
        track.stop();
      }
      this.microphone = null;
    }

    this._isPublishing = false;
    this._isMicEnabled = false;
    this.notifyLocalStateChange();
  }

  setMicEnabled(enabled: boolean): void {
    if (this.publishBroadcast) {
      this.publishBroadcast.audio.muted.set(!enabled);
      this._isMicEnabled = enabled;
      this.notifyLocalStateChange();
    }
  }

  // --- Remote Participants ---

  onStateChange(cb: (state: ConnectionState) => void): Unsubscribe {
    this.stateListeners.add(cb);
    return () => this.stateListeners.delete(cb);
  }

  onLocalStateChange(cb: () => void): Unsubscribe {
    this.localStateListeners.add(cb);
    return () => this.localStateListeners.delete(cb);
  }

  onParticipantsChange(cb: (participants: ReadonlyMap<string, RemoteParticipant>) => void): Unsubscribe {
    this.participantListeners.add(cb);
    return () => this.participantListeners.delete(cb);
  }

  // --- Audio ---

  setVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(1, volume));
    // Update volume on all active watch broadcasts
    for (const entry of this.watchBroadcasts.values()) {
      entry.emitter.volume.set(this._volume);
    }
  }

  // --- Private Methods ---

  private setState(state: ConnectionState): void {
    if (this._state === state) return;
    this._state = state;
    // Defer notification to avoid triggering React state updates during render/commit
    queueMicrotask(() => {
      for (const cb of this.stateListeners) {
        try {
          cb(state);
        } catch {
          // ignore listener errors
        }
      }
    });
  }

  private notifyLocalStateChange(): void {
    queueMicrotask(() => {
      for (const cb of this.localStateListeners) {
        try {
          cb();
        } catch {
          // ignore
        }
      }
    });
  }

  private notifyParticipantsChange(): void {
    queueMicrotask(() => {
      for (const cb of this.participantListeners) {
        try {
          cb(this._participants);
        } catch {
          // ignore
        }
      }
    });
  }

  /**
   * Poll for MoQ announcements to discover participants.
   *
   * Uses the connection's announced signal to find broadcasts
   * under the room namespace prefix.
   */
  private startAnnouncementPolling(): void {
    this.stopAnnouncementPolling();

    // Poll every 2 seconds for announcement changes
    this.announcementPollInterval = setInterval(() => {
      this.checkAnnouncements();
    }, 2000);

    // Also check immediately
    this.checkAnnouncements();
  }

  private stopAnnouncementPolling(): void {
    if (this.announcementPollInterval) {
      clearInterval(this.announcementPollInterval);
      this.announcementPollInterval = null;
    }
  }

  private checkAnnouncements(): void {
    if (!this.connection || !this.config) return;

    const announced = this.connection.announced.peek();
    if (!announced) return;

    const currentPubkeys = new Set<string>();

    for (const path of announced) {
      // Path format: "<participant-pubkey>"
      // (we're already scoped to the room namespace via the connection URL)
      const pubkey = path as string;

      // Skip our own broadcast
      if (pubkey === this.config.identity) continue;

      // Validate it looks like a hex pubkey (64 chars)
      if (!/^[0-9a-f]{64}$/.test(pubkey)) continue;

      currentPubkeys.add(pubkey);

      if (!this._participants.has(pubkey)) {
        // New participant discovered
        this._participants.set(pubkey, {
          pubkey,
          isPublishing: true,
        });
        this.subscribeToParticipant(pubkey);
      }
    }

    // Check for participants that left
    let changed = false;
    for (const pubkey of this._participants.keys()) {
      if (!currentPubkeys.has(pubkey)) {
        this._participants.delete(pubkey);
        this.unsubscribeFromParticipant(pubkey);
        changed = true;
      }
    }

    if (changed || currentPubkeys.size !== this.previousAnnounced.size) {
      this.notifyParticipantsChange();
    }

    this.previousAnnounced = currentPubkeys;
  }

  private subscribeToParticipant(pubkey: string): void {
    if (!this.connection) return;

    const established = this.connection.established.peek();
    if (!established) return;

    const broadcastPath = Moq.Path.from(pubkey);

    const broadcast = new Watch.Broadcast({
      connection: this.connection.established,
      enabled: true,
      name: broadcastPath,
      reload: true,
    });

    const sync = new Watch.Sync();
    const audioSource = new Watch.Audio.Source(sync, { broadcast });
    const decoder = new Watch.Audio.Decoder(audioSource, { enabled: true });
    const emitter = new Watch.Audio.Emitter(decoder, {
      volume: this._volume,
      muted: false,
    });

    this.watchBroadcasts.set(pubkey, { broadcast, sync, audioSource, decoder, emitter });
  }

  private unsubscribeFromParticipant(pubkey: string): void {
    const entry = this.watchBroadcasts.get(pubkey);
    if (entry) {
      entry.broadcast.close();
      this.watchBroadcasts.delete(pubkey);
    }
  }

  private cleanupWatchBroadcasts(): void {
    for (const [, entry] of this.watchBroadcasts) {
      entry.broadcast.close();
    }
    this.watchBroadcasts.clear();
  }
}
