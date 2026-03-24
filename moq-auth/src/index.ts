import { TokenService } from "./jwt.js";
import { AuthError, validateNip98, type NostrEvent } from "./nostr.js";
import { base64 } from "./base64.js";

const PORT = parseInt(process.env.PORT || "8080", 10);
const HOST = process.env.HOST || "0.0.0.0";

/** Token lifetime in seconds (10 minutes) */
const TOKEN_TTL = 600;

const tokenService = new TokenService();

/**
 * Auth request body from clients.
 */
interface AuthRequest {
  /** MoQ broadcast namespace to access (e.g., "nests/30312:pubkey:roomid") */
  namespace: string;
  /** Whether the client wants publish rights */
  publish?: boolean;
}

/**
 * Parse the NIP-98 event from the Authorization header.
 * Format: "Nostr <base64-encoded-json-event>"
 */
function parseAuthHeader(header: string): NostrEvent {
  if (!header.startsWith("Nostr ")) {
    throw new AuthError("Authorization header must start with 'Nostr '");
  }

  const encoded = header.slice(6);
  try {
    const decoded = base64.decode(encoded);
    const json = new TextDecoder().decode(decoded);
    return JSON.parse(json) as NostrEvent;
  } catch {
    throw new AuthError("Failed to decode NIP-98 event from Authorization header");
  }
}

/**
 * Handle POST /auth
 *
 * Accepts NIP-98 auth header, returns a JWT for moq-relay.
 */
async function handleAuth(req: Request): Promise<Response> {
  // Parse auth header
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return jsonError(401, "Missing Authorization header");
  }

  let event: NostrEvent;
  try {
    event = parseAuthHeader(authHeader);
  } catch (e) {
    return jsonError(401, (e as Error).message);
  }

  // Validate NIP-98 event
  const url = new URL(req.url);
  let pubkey: string;
  try {
    pubkey = validateNip98(event, req.url, req.method);
  } catch (e) {
    if (e instanceof AuthError) {
      return jsonError(401, e.message);
    }
    return jsonError(500, "Internal error during auth validation");
  }

  // Parse request body
  let body: AuthRequest;
  try {
    body = (await req.json()) as AuthRequest;
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  if (!body.namespace || typeof body.namespace !== "string") {
    return jsonError(400, "Missing or invalid 'namespace' field");
  }

  // Build JWT claims
  // Subscribe: can read everything under the room namespace
  // Publish: can only write under their own pubkey sub-namespace
  const claims = {
    root: body.namespace,
    get: [""],  // subscribe to everything under root
    ...(body.publish
      ? { put: [pubkey] }  // can only publish under nests/<room>/<their-pubkey>
      : {}),
  };

  const token = await tokenService.signToken(claims, TOKEN_TTL);

  return new Response(JSON.stringify({ token }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
    },
  });
}

/**
 * Handle GET /.well-known/jwks.json
 *
 * Returns the public key set that moq-relay fetches to validate tokens.
 */
function handleJwks(): Response {
  return new Response(JSON.stringify(tokenService.getJwks()), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=60",
    },
  });
}

/**
 * Handle CORS preflight.
 */
function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "Authorization, Content-Type",
      "access-control-max-age": "86400",
    },
  });
}

/**
 * Return a JSON error response.
 */
function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
    },
  });
}

/**
 * Main request router.
 */
async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (req.method === "OPTIONS") {
    return handleOptions();
  }

  if (url.pathname === "/.well-known/jwks.json" && req.method === "GET") {
    return handleJwks();
  }

  if (url.pathname === "/auth" && req.method === "POST") {
    return handleAuth(req);
  }

  // Health check
  if (url.pathname === "/health" && req.method === "GET") {
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  return jsonError(404, "Not found");
}

/**
 * Start the server using Node.js built-in HTTP server.
 */
async function main() {
  await tokenService.init();
  console.log(`moq-auth starting on ${HOST}:${PORT}`);
  console.log(`JWKS endpoint: http://${HOST}:${PORT}/.well-known/jwks.json`);
  console.log(`Auth endpoint: http://${HOST}:${PORT}/auth`);

  await startNodeServer();
}

async function startNodeServer() {
  const { createServer } = await import("node:http");

  const server = createServer(async (nodeReq, nodeRes) => {
    // Build a Request object from the Node.js request
    const protocol = "http";
    const host = nodeReq.headers.host || `${HOST}:${PORT}`;
    const url = `${protocol}://${host}${nodeReq.url}`;

    let body: string | undefined;
    if (nodeReq.method === "POST" || nodeReq.method === "PUT") {
      body = await new Promise<string>((resolve) => {
        const chunks: Buffer[] = [];
        nodeReq.on("data", (chunk: Buffer) => chunks.push(chunk));
        nodeReq.on("end", () => resolve(Buffer.concat(chunks).toString()));
      });
    }

    const request = new Request(url, {
      method: nodeReq.method,
      headers: nodeReq.headers as Record<string, string>,
      body: body,
    });

    const response = await handleRequest(request);

    nodeRes.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    const responseBody = await response.text();
    nodeRes.end(responseBody);
  });

  server.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
  });

  return server;
}

main().catch((err) => {
  console.error("Failed to start moq-auth:", err);
  process.exit(1);
});
