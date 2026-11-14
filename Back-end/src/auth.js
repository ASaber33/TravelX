import { createPublicKey, verify } from "node:crypto";

let cachedJwks;
let jwksExpiresAt = 0;

function decodeSegment(segment) {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
}

async function getJwks(forceRefresh = false) {
  if (!process.env.NEON_AUTH_JWKS_URL) {
    throw new Error("Neon Auth JWKS is not configured.");
  }

  if (!forceRefresh && cachedJwks && Date.now() < jwksExpiresAt) {
    return cachedJwks;
  }

  const response = await fetch(process.env.NEON_AUTH_JWKS_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) throw new Error("Could not load Neon Auth signing keys.");

  const document = await response.json();
  if (!Array.isArray(document.keys)) throw new Error("Neon Auth returned invalid signing keys.");

  cachedJwks = document.keys;
  jwksExpiresAt = Date.now() + 5 * 60 * 1000;
  return cachedJwks;
}

async function findSigningKey(kid) {
  let keys = await getJwks();
  let key = keys.find((item) => item.kid === kid && item.kty === "OKP" && item.crv === "Ed25519");

  if (!key) {
    keys = await getJwks(true);
    key = keys.find((item) => item.kid === kid && item.kty === "OKP" && item.crv === "Ed25519");
  }

  return key;
}

export async function verifyNeonToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const header = decodeSegment(parts[0]);
    if (header.alg !== "EdDSA" || typeof header.kid !== "string") return null;

    const jwk = await findSigningKey(header.kid);
    if (!jwk) return null;

    const publicKey = createPublicKey({ key: jwk, format: "jwk" });
    const signedContent = Buffer.from(`${parts[0]}.${parts[1]}`);
    const signature = Buffer.from(parts[2], "base64url");
    if (!verify(null, signedContent, publicKey, signature)) return null;

    const claims = decodeSegment(parts[1]);
    const authOrigin = new URL(process.env.NEON_AUTH_BASE_URL).origin;
    const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    const now = Math.floor(Date.now() / 1000);

    if (claims.iss !== authOrigin || !audience.includes(authOrigin)) return null;
    if (!Number.isFinite(claims.exp) || claims.exp <= now) return null;
    if (claims.nbf !== undefined && claims.nbf > now) return null;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(claims.sub || "")) return null;
    if (typeof claims.email !== "string" || typeof claims.name !== "string") return null;

    return claims;
  } catch {
    return null;
  }
}

export async function requireNeonUser(request, response, next) {
  const authorization = request.get("authorization") || "";
  const match = authorization.match(/^Bearer ([^\s]+)$/i);
  const claims = match ? await verifyNeonToken(match[1]) : null;

  if (!claims) {
    return response.status(401).json({ error: "Please sign in again to continue." });
  }

  request.authUser = claims;
  next();
}
