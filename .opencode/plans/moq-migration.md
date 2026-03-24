# Nests: LiveKit to MoQ Migration Plan

> Status: DRAFT - Awaiting approval before implementation

## Goals

1. Replace LiveKit with MoQ (Media over QUIC) as the audio transport
2. Eliminate the central C# backend entirely - all coordination via Nostr events
3. Per-user MoQ server lists (NIP-51 style) so anyone can run a relay
4. Nostr-native permissions (no server-side enforcement)
5. Auth required for MoQ relay connections
6. Keep existing React frontend, swap transport layer only
7. Drop recording/HLS for now (can be added later)
8. No migration path - clean break

---

## Architecture: Before vs After

### Current (Centralized)
```
Browser --> NestsAPI (C#/ASP.NET) --> LiveKit SFU --> Other Browsers
                  |                       |
             Nostr Relays            PostgreSQL + Redis
```
Central point of failure: nostrnests.com runs everything.

### Target (Decentralized)
```
Browser --> MoQ Relay (any) --> Other Browsers
   |
Nostr Relays (signaling, permissions, presence, chat)
```
No central server. Any MoQ relay works. Room state lives on Nostr.

---

## New Nostr Event Kinds & Protocol

### 1. MoQ Server List - `kind: 10112`

A NIP-51 standard list where users advertise their preferred MoQ relay servers. Modeled on Blossom's `kind: 10063` (user server list) and NIP-65 `kind: 10002` (relay list metadata).

```json
{
  "kind": 10112,
  "tags": [
    ["server", "https://moq-relay1.example.com"],
    ["server", "https://moq-relay2.example.com"],
    ["server", "https://moq.nostrnests.com"]
  ],
  "content": ""
}
```

- **Replaceable event** - one per user
- Ordered by preference (first = primary, most trusted/reliable)
- `server` tag uses `https://` URLs (WebTransport endpoints on the MoQ relay)
- Clients creating a room pick from their own list
- Clients joining a room connect to the server in the room event's `streaming` tag

### 2. Room Event - `kind: 30312` (same kind, updated structure)

```json
{
  "kind": 30312,
  "tags": [
    ["d", "<room-uuid>"],
    ["title", "My Nest"],
    ["summary", "A discussion about..."],
    ["image", "<preview-image-url>"],
    ["streaming", "https://moq-relay.example.com"],
    ["t", "hashtag"],
    ["starts", "<unix-timestamp>"],
    ["ends", "<unix-timestamp>"],
    ["status", "planned|live|ended"],
    ["relays", "wss://relay.example.com", "wss://nos.lol"],
    ["p", "<speaker-pubkey>", "<relay-hint>", "speaker"],
    ["p", "<admin-pubkey>", "<relay-hint>", "admin"],
    ["color", "gradient-1"]
  ],
  "content": ""
}
```

Key changes from current:
- **`streaming` tag**: `https://` URL pointing to MoQ relay WebTransport endpoint. No more `wss+livekit://`.
- **`service` tag removed**: No central API. The streaming tag IS the service.
- **`p` tags with roles**: Permissions embedded directly. The event author is always the host.
- **Room namespace**: `d` tag (room UUID) + host pubkey forms the MoQ broadcast namespace.

### 3. Nostr-Native Permissions

Permissions encoded in the room event's `p` tags, honored by clients.

**Roles:**

| Role | Publish Audio | Manage Speakers | End Room |
|------|:-:|:-:|:-:|
| host (event author) | yes | yes | yes |
| admin | yes | yes | no |
| speaker | yes | no | no |
| (no p tag = listener) | no | no | no |

**Permission change flow:**
1. Host/admin updates `kind: 30312` event, adding/removing/changing `p` tags
2. All clients subscribe to this event and react in real-time
3. Promoted speakers start publishing audio to MoQ relay
4. Demoted speakers stop publishing

**Admin commands** - `kind: 4312` (new):

```json
{
  "kind": 4312,
  "tags": [
    ["a", "30312:<host-pubkey>:<room-d-tag>", "<relay-hint>"],
    ["p", "<target-pubkey>"],
    ["action", "mute|unmute|kick"]
  ],
  "content": ""
}
```

- Clients verify sender is host/admin per the room event before obeying
- `mute`: target mutes mic locally
- `kick`: target disconnects from room
- Honor system - matches Nostr's general trust model
- Defense in depth: MoQ relay JWT limits who can publish

### 4. Room Presence - `kind: 10312` (unchanged)

```json
{
  "kind": 10312,
  "tags": [
    ["a", "30312:<host-pubkey>:<d-tag>", "<relay-hint>", "root"],
    ["hand", "1"]
  ]
}
```

### 5. Chat - `kind: 1311` (unchanged)

No changes needed. Already works via Nostr independently.

---

## MoQ Integration Design

### Namespace Convention

Each participant publishes their own broadcast within the room namespace:

```
Room namespace:     nests/<room-a-tag>/
Participant:        nests/<room-a-tag>/<participant-pubkey>
Audio track:        audio
```

Example - Room `abc123` hosted by `pubkeyA`, speakers `pubkeyA` and `pubkeyB`:
```
nests/30312:pubkeyA:abc123/pubkeyA/audio   <-- host's audio
nests/30312:pubkeyA:abc123/pubkeyB/audio   <-- speaker's audio
```

Listeners subscribe via `announced("nests/30312:pubkeyA:abc123/")` to discover all active publishers.

### Audio Codec & Format

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Codec | Opus | Best for voice, low latency, WebCodecs supported |
| Container | Legacy (moq-lite) | Minimal overhead: varint timestamp + payload |
| Sample rate | 48kHz | Opus native rate |
| Channels | Mono | Voice doesn't need stereo |
| Bitrate | 32-64 kbps | Sufficient for voice quality |
| Group size | 1 frame per group | Each group independently decodable (join point) |
| Priority | 100 (high) | Audio-first during congestion |
| Group order | Ascending | Deliver in chronological order |
| Group timeout | 500ms | Drop audio if >500ms behind |

### Authentication Flow

MoQ relays support JWT-based auth via `@moq/token`.

**Room creator (publisher + subscriber):**
1. Client connects to their preferred MoQ relay (from `kind: 10112` list)
2. Client authenticates via NIP-98 to relay's auth endpoint (`POST /auth`)
3. Relay validates Nostr signature, issues JWT granting publish+subscribe on `nests/<room-a-tag>/*`
4. Client uses JWT for MoQ session

**Participant joining (subscriber, possibly publisher):**
1. Client reads `streaming` tag from room event for MoQ relay URL
2. Client authenticates to relay's auth endpoint
3. Relay issues subscribe-only JWT by default
4. If client is listed as speaker/admin in room event, they request publish rights
5. Relay can optionally verify the room event to confirm speaker status before issuing publish JWT

**Auth endpoint on MoQ relay:**
- Lightweight HTTP endpoint, part of the relay deployment
- Accepts NIP-98 authorization header
- Validates Nostr signature, issues scoped JWT
- Stateless - no database needed
- Could be: sidecar process, built into relay wrapper, Cloudflare Worker, etc.

### Connection & Reconnection

**Initial connection:**
1. Parse room event -> extract MoQ relay URL from `streaming` tag
2. Authenticate -> get JWT token
3. Connect via WebTransport to relay
4. Subscribe to `announced("nests/<room-a-tag>/")` for participant discovery
5. For each announced participant, subscribe to their `audio` track
6. If speaker: start publishing own audio broadcast

**Reconnection:**
1. Re-authenticate if token expired (short-lived, ~10 min)
2. Reconnect WebTransport session
3. Re-subscribe to announcements and tracks
4. Resume publishing if speaker

**Fallbacks:**
- WebSocket fallback via `web-transport-ws` for browsers without WebTransport (~19%)
- libav.js (ffmpeg WASM) for browsers without WebCodecs (older Safari)

---

## Frontend Migration Plan

### Transport Abstraction Layer

An interface between UI components and the transport, preventing tight coupling:

```typescript
// src/transport/types.ts

interface NestTransport {
  // Lifecycle
  connect(config: TransportConfig): Promise<void>;
  disconnect(): Promise<void>;
  readonly state: ConnectionState;
  onStateChange(cb: (state: ConnectionState) => void): () => void;

  // Publishing
  publishMicrophone(deviceId?: string): Promise<void>;
  unpublishMicrophone(): Promise<void>;
  setMicEnabled(enabled: boolean): void;
  readonly isMicEnabled: boolean;
  readonly localAudioTrack: MediaStreamTrack | null;

  // Participants
  readonly participants: Map<string, RemoteParticipant>;
  onParticipantJoined(cb: (pubkey: string) => void): () => void;
  onParticipantLeft(cb: (pubkey: string) => void): () => void;
  onAudioTrackAdded(cb: (pubkey: string, track: MediaStreamTrack) => void): () => void;
  onAudioTrackRemoved(cb: (pubkey: string) => void): () => void;
}

interface TransportConfig {
  serverUrl: string;      // MoQ relay URL from streaming tag
  roomId: string;         // room a-tag
  identity: string;       // user's pubkey
  token: string;          // JWT from auth
  canPublish: boolean;    // derived from room event p tags
}

interface RemoteParticipant {
  pubkey: string;
  audioTrack: MediaStreamTrack | null;
  isMuted: boolean;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
```

### React Hooks (replacing LiveKit hooks)

```
useNestTransport()        -> replaces useRoomContext()
useLocalParticipant()     -> wraps transport local state
useRemoteParticipants()   -> wraps transport.participants
useConnectionState()      -> wraps transport.state
useMediaDevices()         -> native navigator.mediaDevices
```

### Component Migration Map

| File | Remove (LiveKit) | Replace With |
|------|-----------------|--------------|
| `pages/room.tsx` | `<LiveKitRoom>` | `<MoQRoomProvider>` via transport abstraction |
| `element/nostr-room-context-provider.tsx` | `RoomAudioRenderer`, `useRoomContext`, `useLocalParticipant` | Transport hooks + WebAudio playback |
| `element/participants.tsx` | `useParticipants()`, LK types | Transport abstraction participant list |
| `element/write-message.tsx` | `useRoomContext`, `useLocalParticipant` | Transport hooks |
| `element/room-menu-bar.tsx` | `useLocalParticipant` | Transport hooks |
| `element/profile-card.tsx` | `useEnsureRoom` | Transport hooks |
| `element/device-selector.tsx` | `useMediaDeviceSelect` | Native `enumerateDevices()` |
| `element/vu.tsx` | (none) | No change - already Web Audio API |
| `element/room-list-list.tsx` | `ws+livekit://` filter | `https://` MoQ URL filter |
| `element/lobby-flyout.tsx` | `ws+livekit://` filter | `https://` MoQ URL filter |
| `api.ts` | `NestsApi` class | Delete entirely; thin auth helper in transport/ |
| `pages/new-room.tsx` | `NestsApi.createRoom()` | Publish Nostr event directly |
| `element/join-room.tsx` | `NestsApi.joinRoom()` | Auth directly with MoQ relay |
| `const.ts` | `ApiUrl` | Add `MOQ_SERVER_LIST_KIND`, remove `ApiUrl` |

### New Files

```
src/transport/
  types.ts              - Transport interface definitions
  moq-transport.ts      - MoQ implementation of NestTransport
  hooks.ts              - React hooks wrapping NestTransport
  provider.tsx          - React context provider
  audio-renderer.ts     - WebAudio remote audio playback
  auth.ts               - NIP-98 -> MoQ relay JWT auth helper
```

### Room Lifecycle (New)

**Create Room:**
1. User fills form (title, description, schedule, color)
2. Client reads user's `kind: 10112` MoQ server list
3. Client pings first server for availability
4. Falls back to next server if unavailable
5. Client authenticates with MoQ relay, gets publish+subscribe JWT
6. Client generates room UUID
7. Client publishes `kind: 30312` event with `streaming` tag = chosen MoQ relay
8. Client connects to MoQ relay, announces broadcast, starts publishing audio
9. Navigates to room page

**Join Room:**
1. User discovers room via Nostr sub to `kind: 30312`
2. Client reads `streaming` tag for MoQ relay URL
3. Client authenticates with relay, gets JWT
4. Client connects, subscribes to `announced("nests/<room-a-tag>/")` for discovery
5. Client subscribes to each participant's audio track
6. Client publishes `kind: 10312` presence event
7. If listed as speaker/admin/host: request publish JWT, start publishing

**Hand Raise -> Speaker:**
1. Listener publishes presence with `["hand", "1"]`
2. Host sees raised hand, clicks promote
3. Host updates `kind: 30312`, adding `["p", "<pubkey>", "", "speaker"]`
4. Listener's client detects new p tag
5. Listener authenticates for publish rights, starts broadcasting audio

**End Room:**
1. Host updates room event: `["status", "ended"]` + `["ends", "<timestamp>"]`
2. All clients detect change, disconnect from MoQ relay
3. Broadcasts cleaned up automatically

---

## Backend Removal

### Delete
- `NestsBackend/` (entire C# API)
- `Nests.Database/` (entire EF Core layer)
- `NestsBackend.sln`
- `compose-config/livekit-dev.yaml`
- `compose-config/livekit-prod.yaml`
- `compose-config/egress.yaml`
- `docker-compose.yml` (rewrite)
- `docker-compose-dev.yml` (rewrite)

### New Docker Compose

```yaml
services:
  moq-relay:
    image: ghcr.io/moq-dev/moq-relay:latest
    ports:
      - "443:443"        # WebTransport (HTTPS/HTTP3)
      - "443:443/udp"    # QUIC UDP
    volumes:
      - ./certs:/certs:ro

  moq-auth:              # lightweight NIP-98 -> JWT sidecar
    build: ./moq-auth
    ports:
      - "8080:8080"

  ui:
    build: ./NestsUI
    ports:
      - "80:8080"
```

Two services + optional auth sidecar, down from six.

---

## NPM Dependency Changes

### Remove
```
@livekit/components-react
@livekit/components-styles
@livekit/protocol
livekit-client
```

### Add
```
@moq/lite         # Core MoQ transport
@moq/hang         # Media encoding/decoding (WebCodecs)
@moq/watch        # Subscriber helpers
@moq/publish      # Publisher helpers
@moq/token        # JWT auth (if needed client-side)
```

---

## Implementation Phases

### Phase 1: Protocol & Transport Layer
- [ ] Define new Nostr event kinds (10112, updated 30312, 4312)
- [ ] Build `src/transport/types.ts`
- [ ] Build `src/transport/moq-transport.ts`
- [ ] Build `src/transport/audio-renderer.ts`
- [ ] Build `src/transport/auth.ts`
- [ ] Test: connect to moq-relay, publish/subscribe Opus audio

### Phase 2: React Hooks & Provider
- [ ] Build `src/transport/hooks.ts`
- [ ] Build `src/transport/provider.tsx`
- [ ] Verify hooks provide equivalent data to LiveKit hooks

### Phase 3: Component Migration
- [ ] Migrate `pages/room.tsx`
- [ ] Migrate `element/nostr-room-context-provider.tsx`
- [ ] Migrate `element/participants.tsx`
- [ ] Migrate `element/write-message.tsx`
- [ ] Migrate `element/room-menu-bar.tsx`
- [ ] Migrate `element/profile-card.tsx`
- [ ] Migrate `element/device-selector.tsx`
- [ ] Migrate `element/join-room.tsx`
- [ ] Update `element/room-list-list.tsx` URL filtering
- [ ] Update `element/lobby-flyout.tsx` URL filtering

### Phase 4: Room Lifecycle Without Backend
- [ ] Rewrite `pages/new-room.tsx` (Nostr-only room creation)
- [ ] Implement MoQ server list fetch (`kind: 10112`)
- [ ] Implement server availability checking + fallback
- [ ] Remove `api.ts` entirely
- [ ] Implement Nostr-native permissions (p-tag watching)
- [ ] Implement admin commands (`kind: 4312`)

### Phase 5: Auth Sidecar
- [ ] Build NIP-98 -> JWT auth service
- [ ] Integrate with moq-relay token validation
- [ ] Test auth flow end-to-end

### Phase 6: Cleanup & Testing
- [ ] Delete backend directories and files
- [ ] Write new Docker Compose
- [ ] Remove LiveKit npm deps, add MoQ deps
- [ ] Test with multiple MoQ relays
- [ ] Test browser compat (Chrome, Firefox, Safari, WebSocket fallback)
- [ ] Update README with new protocol docs
- [ ] Update const.ts

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| MoQ pre-standard (IETF draft-17) | Medium | moq-lite forwards-compatible. hang.live runs in production. |
| Browser support ~81% (WebTransport) | Medium | WebSocket fallback included. Safari 26.4+ added support. |
| Honor-system permissions | Low-Med | Matches Nostr model. JWT limits publish rights server-side. |
| Auth sidecar complexity | Low | Stateless, simple. Could be a CF Worker or Deno function. |
| moq-relay maturity | Medium | Powers hang.live in production. Active maintenance. |
| No recording/HLS | Low | Deferred. Can build later as MoQ subscriber. |

---

## Open Design Decisions

1. **Kind `10112` for MoQ server list** - confirm unused, consider NIP registration
2. **Auth sidecar language** - TypeScript vs Rust (same as moq-relay)?
3. **Guest access** - allow unauthenticated subscribe for public rooms?
4. **Default MoQ relays** - ship with well-known public relays as defaults?
5. **Catalog track** - use @moq/hang catalog or just audio track per participant?
