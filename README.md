# Nests

Decentralized audio rooms on Nostr, powered by [MoQ (Media over QUIC)](https://github.com/kixelated/moq-rs) for real-time audio transport.

## Architecture

Nests has two parts:

- **Frontend** — A React SPA that handles rooms, chat, reactions, theming, and all Nostr interactions directly from the browser
- **Audio Server** — A MoQ relay + auth sidecar that handles real-time audio transport via WebTransport/QUIC

The frontend is fully static. All Nostr data (rooms, chat, presence, reactions) flows through public Nostr relays. The only backend you run is the MoQ audio server.

## Quick Start (Development)

```bash
# 1. Generate self-signed TLS certs (required for WebTransport)
./dev-config/generate-certs.sh

# 2. Start MoQ relay + auth
docker compose -f docker-compose-moq.yml up -d

# 3. Start the frontend dev server
cd NestsUI-v2
npm install
VITE_MOQ_CERT_FINGERPRINT=$(cat ../dev-config/certs/fingerprint.b64) npm run dev
```

Open `http://localhost:8080` in your browser.

## Production Deployment

### Full Stack (Frontend + Audio Server)

Use `docker-compose.yml` to run everything:

```bash
# 1. Configure your domains
cp .env.example .env
# Edit .env:
#   MOQ_RELAY_DOMAIN=moq.yourdomain.com
#   MOQ_AUTH_DOMAIN=moq-auth.yourdomain.com

# 2. Get TLS certs for the MoQ relay (WebTransport requires valid TLS)
certbot certonly --standalone -d moq.yourdomain.com
ln -s /etc/letsencrypt/live/moq.yourdomain.com ./certs

# 3. Start all services
docker compose up -d
```

This starts:

| Service | Port | Description |
|---------|------|-------------|
| `nests-web` | 8080 | Frontend (nginx serving the Vite build) |
| `moq-relay` | 443 (TCP+UDP) | MoQ audio relay (WebTransport/QUIC) |
| `moq-auth` | 8090 | NIP-98 auth sidecar (issues JWTs) |

Put a reverse proxy (Caddy/nginx) in front for the frontend and auth. The MoQ relay handles its own TLS on port 443 — do **not** proxy it.

```
# Caddy example
nests.yourdomain.com {
    reverse_proxy nests-web:80
}

moq-auth.yourdomain.com {
    reverse_proxy moq-auth:8080
}

# moq.yourdomain.com — no proxy, relay handles its own TLS on port 443
```

**Firewall:** Open TCP + UDP on port 443 for the MoQ relay subdomain.

**DNS:** Point all three subdomains to your server.

### Standalone Audio Server

Anyone can run their own MoQ audio server. No frontend required — Nests clients can connect to any relay.

```bash
# 1. Get TLS certs
certbot certonly --standalone -d moq.yourdomain.com
ln -s /etc/letsencrypt/live/moq.yourdomain.com ./certs

# 2. Start the relay
docker compose -f docker-compose-moq.yml up moq-relay moq-auth -d
```

Then add `https://moq.yourdomain.com` as an audio server in any Nests client under **Settings > Audio**.

Users can also publish their preferred audio servers to Nostr as a `kind:10112` server list, so their rooms automatically use their own relay.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_MOQ_RELAY_URL` | `https://moq.nostrnests.com` | MoQ relay URL (build-time) |
| `VITE_MOQ_AUTH_URL` | `https://moq-auth.nostrnests.com` | Auth service URL (build-time) |
| `VITE_MOQ_CERT_FINGERPRINT` | — | Dev only: self-signed cert fingerprint |
| `MOQ_RELAY_PORT` | `443` | MoQ relay port (443 = clean URLs) |
| `MOQ_AUTH_PORT` | `8090` | Auth service port |

## Nostr Protocol

### Room Event (kind:30312)

Based on [NIP-53](https://github.com/nostr-protocol/nips/blob/master/53.md) for live activities.

```json
{
  "kind": 30312,
  "tags": [
    ["d", "<unique identifier>"],
    ["title", "<room name>"],
    ["summary", "<description>"],
    ["image", "<preview image url>"],
    ["status", "<live, planned, ended>"],
    ["starts", "<unix timestamp>"],
    ["streaming", "<moq relay url>"],
    ["auth", "<moq auth url>"],
    ["color", "<banner gradient class>"],
    ["relays", "wss://relay1.com", "wss://relay2.com"],
    ["p", "<pubkey>", "<relay>", "<role>"],
    ["c", "#hexcolor", "background"],
    ["c", "#hexcolor", "text"],
    ["c", "#hexcolor", "primary"]
  ],
  "content": ""
}
```

Participant roles in `p` tags: `host`, `admin`, `speaker`.

Room theming uses inline `c` tags (Ditto theme colors) or an `a` tag referencing a `kind:36767` theme.

### Live Chat (kind:1311)

Same as NIP-53. Messages reference the room via `a` tag.

```json
{
  "kind": 1311,
  "tags": [
    ["a", "30312:<pubkey>:<d-tag>"]
  ],
  "content": "Hello from Nests!"
}
```

### Room Presence (kind:10312)

Replaceable event signaling a user's presence in a room.

```json
{
  "kind": 10312,
  "tags": [
    ["a", "<room-a-tag>"],
    ["hand", "1"],
    ["publishing", "1"],
    ["muted", "0"],
    ["onstage", "1"]
  ]
}
```

Clients publish presence every 2 minutes as a heartbeat. Presence can only be indicated in one room at a time (replaceable event).

### Audio Server List (kind:10112)

Users publish their preferred MoQ relay servers.

```json
{
  "kind": 10112,
  "tags": [
    ["server", "https://moq.example.com:4443"],
    ["server", "https://moq2.example.com:4443"]
  ]
}
```

### Ditto Theming

Nests supports [Ditto](https://ditto.pub) profile themes and room themes:

- **kind:16767** — User's active profile theme (colors, font, background)
- **kind:36767** — Shareable theme definitions

Avatar shapes use the `shape` field in kind:0 metadata (an emoji rendered as a CSS mask).

## License

MIT
