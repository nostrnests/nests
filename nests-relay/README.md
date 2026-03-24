# Nests Audio Relay

Run your own audio relay server for [Nostr Nests](https://nostrnests.com). Anyone can run a relay -- it's like running a Nostr relay, but for audio rooms.

## What This Runs

Two services:

- **moq-relay** -- The audio transport server ([MoQ protocol](https://quic.video)). Handles real-time audio streaming between participants.
- **moq-auth** -- A small auth service that verifies Nostr identities and issues access tokens. Prevents unauthorized use of your relay.

## Requirements

- A server with a public IP
- A domain name pointing to that server (e.g., `moq.yourdomain.com`)
- Docker and Docker Compose installed
- Ports **443** (TCP + UDP) open

## Quick Start

```bash
# Clone or download this directory
git clone https://github.com/niclas-aspect/nests.git
cd nests/nests-relay

# Configure your domain
cp .env.example .env
nano .env  # Set DOMAIN and EMAIL

# Start everything
docker compose up -d
```

That's it. The relay will:
1. Obtain a TLS certificate from Let's Encrypt automatically
2. Start the MoQ relay on port 443
3. Start the auth service (internal, not exposed publicly)

## Verify It's Running

```bash
# Check services are up
docker compose ps

# Check logs
docker compose logs -f moq-relay
docker compose logs -f moq-auth
```

## Tell Nests Users About Your Relay

Once your relay is running, users can add it to their MoQ server list by publishing a `kind:10112` Nostr event:

```json
{
  "kind": 10112,
  "tags": [
    ["server", "https://moq.yourdomain.com"]
  ],
  "content": ""
}
```

Or they can select your relay when creating a room in the Nests UI.

## Bring Your Own Certs

If you already manage TLS certificates (e.g., you're behind Caddy, nginx, or Cloudflare), use the alternative compose file:

```bash
# Place your certs
mkdir -p certs
cp /path/to/fullchain.pem certs/fullchain.pem
cp /path/to/privkey.pem certs/privkey.pem

# Start with BYO certs
docker compose -f docker-compose.certs.yml up -d
```

## Updating

```bash
docker compose pull
docker compose up -d
```

## Architecture

```
Internet
   |
   v
[moq-relay :443] <---> [moq-auth :8080 (internal)]
   |
   v
Nests clients connect via WebTransport (HTTP/3 + QUIC)
Auth tokens verified via JWKS from moq-auth
```

- **moq-relay** is the upstream open-source MoQ relay, unmodified
- **moq-auth** verifies Nostr signatures (NIP-98) and issues JWTs
- moq-auth is only accessible to moq-relay via Docker's internal network -- it's not exposed to the internet
- The relay is stateless -- no database, no persistent storage (besides TLS certs)

## Resource Usage

Minimal. A small VPS (1 CPU, 1 GB RAM) can handle dozens of concurrent rooms. The relay just forwards audio packets -- it doesn't transcode or process audio.

## Troubleshooting

**Certificate errors**: Make sure your domain DNS is pointing to the server and port 80 is open (needed for Let's Encrypt HTTP challenge during initial cert provisioning).

**Connection refused**: Check that ports 443 TCP and 443 UDP are open in your firewall. WebTransport uses QUIC which runs over UDP.

**Auth failures**: Check `docker compose logs moq-auth` for NIP-98 verification errors.
