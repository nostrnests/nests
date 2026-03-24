import {
  generateKeyPair,
  exportJWK,
  calculateJwkThumbprint,
  SignJWT,
  type JWK,
  type CryptoKey,
} from "jose";

/**
 * MoQ token claims structure.
 * Matches moq-relay's expected JWT claims format.
 */
export interface MoqClaims {
  /** Path prefix for the token scope */
  root: string;
  /** Publish permissions (paths relative to root). Empty string = all under root. */
  put?: string[];
  /** Subscribe permissions (paths relative to root). Empty string = all under root. */
  get?: string[];
  /** Whether this is a cluster node */
  cluster?: boolean;
}

/**
 * Manages JWT signing keys and token generation for MoQ relay auth.
 *
 * On startup, generates an EC P-256 keypair. The public key is exposed as JWKS
 * for moq-relay to fetch. Tokens are signed with the private key.
 */
export class TokenService {
  private privateKey!: CryptoKey;
  private publicJwk!: JWK;
  private kid!: string;

  /**
   * Initialize the token service by generating an EC keypair.
   * Must be called before any other method.
   */
  async init(): Promise<void> {
    const { publicKey, privateKey } = await generateKeyPair("ES256", {
      extractable: true,
    });

    this.privateKey = privateKey;
    this.publicJwk = await exportJWK(publicKey);
    this.kid = await this.computeKid(publicKey);
    this.publicJwk.kid = this.kid;
    this.publicJwk.alg = "ES256";
    this.publicJwk.use = "sig";
    this.publicJwk.key_ops = ["verify"];
  }

  /**
   * Compute a key ID from the public key thumbprint.
   */
  private async computeKid(publicKey: CryptoKey): Promise<string> {
    const jwk = await exportJWK(publicKey);
    const thumbprint = await calculateJwkThumbprint(jwk, "sha256");
    return thumbprint;
  }

  /**
   * Get the JWKS (JSON Web Key Set) containing the public key.
   * This is what moq-relay fetches to validate tokens.
   */
  getJwks(): { keys: JWK[] } {
    return {
      keys: [this.publicJwk],
    };
  }

  /**
   * Sign a JWT token with the given MoQ claims.
   *
   * @param claims - The MoQ-specific claims (root, put, get)
   * @param expiresInSeconds - Token lifetime in seconds (default: 600 = 10 min)
   * @returns Signed JWT string
   */
  async signToken(claims: MoqClaims, expiresInSeconds: number = 600): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    const jwt = await new SignJWT({
      root: claims.root,
      ...(claims.put && { put: claims.put }),
      ...(claims.get && { get: claims.get }),
      ...(claims.cluster && { cluster: claims.cluster }),
    })
      .setProtectedHeader({ alg: "ES256", kid: this.kid })
      .setIssuedAt(now)
      .setExpirationTime(now + expiresInSeconds)
      .sign(this.privateKey);

    return jwt;
  }
}
