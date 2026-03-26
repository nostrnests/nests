import { TokenService } from "./jwt.js";
import { AuthError, validateNip98, type NostrEvent } from "./nostr.js";
import { base64 } from "./base64.js";

const PORT = parseInt(process.env.PORT || "8080", 10);
const HOST = process.env.HOST || "0.0.0.0";
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",").map((s) => s.trim()) || [];

/** Token lifetime in seconds (10 minutes) */
const TOKEN_TTL = 600;

/** Rate limit: max requests per window per IP */
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

/** Namespace format validation */
const NAMESPACE_REGEX = /^nests\/\d+:[0-9a-f]{64}:[a-zA-Z0-9._-]+$/;

const tokenService = new TokenService();

/**
 * Simple in-memory rate limiter per IP.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 5 * 60_000);

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
 * Structured audit log entry.
 */
function auditLog(event: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    ...data,
  }));
}

/**
 * Get CORS origin header. If ALLOWED_ORIGINS is set, validate against it.
 * Otherwise allow all origins (for development).
 */
function getCorsOrigin(requestOrigin: string | null): string {
  if (ALLOWED_ORIGINS.length === 0) return "*";
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) return requestOrigin;
  return ALLOWED_ORIGINS[0];
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
async function handleAuth(req: Request, clientIp: string): Promise<Response> {
  const origin = req.headers.get("origin");
  const corsOrigin = getCorsOrigin(origin);

  // Rate limit
  if (!checkRateLimit(clientIp)) {
    auditLog("auth_rate_limited", { ip: clientIp });
    return jsonError(429, "Too many requests, try again later", corsOrigin);
  }

  // Parse auth header
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    auditLog("auth_failed", { ip: clientIp, reason: "missing_header" });
    return jsonError(401, "Missing Authorization header", corsOrigin);
  }

  let event: NostrEvent;
  try {
    event = parseAuthHeader(authHeader);
  } catch (e) {
    auditLog("auth_failed", { ip: clientIp, reason: "invalid_header" });
    return jsonError(401, (e as Error).message, corsOrigin);
  }

  // Validate NIP-98 event
  let pubkey: string;
  try {
    pubkey = validateNip98(event, req.url, req.method);
  } catch (e) {
    if (e instanceof AuthError) {
      auditLog("auth_failed", { ip: clientIp, pubkey: event.pubkey?.substring(0, 8), reason: e.message });
      return jsonError(401, e.message, corsOrigin);
    }
    return jsonError(500, "Internal error during auth validation", corsOrigin);
  }

  // Parse request body
  let body: AuthRequest;
  try {
    body = (await req.json()) as AuthRequest;
  } catch {
    return jsonError(400, "Invalid JSON body", corsOrigin);
  }

  if (!body.namespace || typeof body.namespace !== "string") {
    return jsonError(400, "Missing or invalid 'namespace' field", corsOrigin);
  }

  // Validate namespace format
  if (!NAMESPACE_REGEX.test(body.namespace)) {
    auditLog("auth_failed", { ip: clientIp, pubkey: pubkey.substring(0, 8), reason: "invalid_namespace", namespace: body.namespace });
    return jsonError(400, "Invalid namespace format", corsOrigin);
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

  auditLog("auth_success", {
    ip: clientIp,
    pubkey: pubkey.substring(0, 8) + "...",
    namespace: body.namespace,
    publish: !!body.publish,
  });

  return new Response(JSON.stringify({ token }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": corsOrigin,
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
function handleOptions(requestOrigin: string | null): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": getCorsOrigin(requestOrigin),
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "Authorization, Content-Type",
      "access-control-max-age": "86400",
    },
  });
}

/**
 * Return a JSON error response.
 */
function jsonError(status: number, message: string, corsOrigin: string = "*"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": corsOrigin,
    },
  });
}

/**
 * Main request router.
 */
async function handleRequest(req: Request, clientIp: string): Promise<Response> {
  const url = new URL(req.url);

  if (req.method === "OPTIONS") {
    return handleOptions(req.headers.get("origin"));
  }

  if (url.pathname === "/.well-known/jwks.json" && req.method === "GET") {
    return handleJwks();
  }

  if (url.pathname === "/auth" && req.method === "POST") {
    return handleAuth(req, clientIp);
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
  auditLog("server_start", { host: HOST, port: PORT });
  console.log(`moq-auth starting on ${HOST}:${PORT}`);
  console.log(`JWKS endpoint: http://${HOST}:${PORT}/.well-known/jwks.json`);
  console.log(`Auth endpoint: http://${HOST}:${PORT}/auth`);

  await startNodeServer();
}

async function startNodeServer() {
  const { createServer } = await import("node:http");

  const server = createServer(async (nodeReq, nodeRes) => {
    // Extract client IP (trust X-Forwarded-For from reverse proxy)
    const forwarded = nodeReq.headers["x-forwarded-for"];
    const clientIp = typeof forwarded === "string"
      ? forwarded.split(",")[0].trim()
      : nodeReq.socket.remoteAddress || "unknown";

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

    const response = await handleRequest(request, clientIp);

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
