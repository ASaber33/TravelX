import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { afterEach, test } from "node:test";
import { createApp } from "../src/app.js";

const servers = new Set();

async function startServer(database) {
  const app = createApp(database);
  const server = await new Promise((resolve) => {
    const listeningServer = app.listen(0, "127.0.0.1", () => resolve(listeningServer));
  });
  servers.add(server);

  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      servers.delete(server);
    })
  };
}

afterEach(async () => {
  await Promise.all([...servers].map((server) => new Promise((resolve) => {
    server.close(resolve);
  })));
  servers.clear();
});

test("health reports when the catalog schema is missing", async () => {
  const server = await startServer({
    query: async () => ({
      rows: [{
        database: "webdb",
        schema: "public",
        destinations_ready: false,
        trips_ready: false
      }]
    })
  });

  const response = await fetch(`${server.baseUrl}/api/health`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    status: "schema_not_initialized",
    database: "webdb",
    schema: "public",
    authConfigured: false,
    tables: { destinations: false, trips: false }
  });
  await server.close();
});

test("same-origin API requests are allowed through the production proxy", async () => {
  const server = await startServer({ query: async () => ({ rows: [] }) });
  const response = await fetch(`${server.baseUrl}/api/config`, {
    headers: { Origin: server.baseUrl }
  });

  assert.equal(response.headers.get("access-control-allow-origin"), server.baseUrl);
  await server.close();
});

test("auth config exposes only the public Neon Auth base URL", async () => {
  const previousBaseUrl = process.env.NEON_AUTH_BASE_URL;
  process.env.NEON_AUTH_BASE_URL = "https://auth.example.test/neondb/auth";
  const server = await startServer({ query: async () => ({ rows: [] }) });

  try {
    const response = await fetch(`${server.baseUrl}/api/config`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      authBaseUrl: "https://auth.example.test/neondb/auth"
    });
  } finally {
    if (previousBaseUrl === undefined) {
      delete process.env.NEON_AUTH_BASE_URL;
    } else {
      process.env.NEON_AUTH_BASE_URL = previousBaseUrl;
    }
    await server.close();
  }
});

test("destinations returns rows read from the database", async () => {
  const destination = { id: "bali", name: "Bali", price: "1680.00" };
  const server = await startServer({
    query: async (sql) => {
      assert.match(sql, /FROM public\.destinations/);
      return { rows: [destination] };
    }
  });

  const response = await fetch(`${server.baseUrl}/api/destinations`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: [destination] });
  await server.close();
});

test("trips returns rows read from the database", async () => {
  const trip = { id: "bali-soul", destinationId: "bali", title: "Bali, Slowly" };
  const server = await startServer({
    query: async (sql) => {
      assert.match(sql, /INNER JOIN public\.destinations/);
      return { rows: [trip] };
    }
  });

  const response = await fetch(`${server.baseUrl}/api/trips`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: [trip] });
  await server.close();
});

test("database errors do not expose internal details to the client", async () => {
  const server = await startServer({
    query: async () => {
      const error = new Error("relation does not exist");
      error.code = "42P01";
      throw error;
    }
  });

  const response = await fetch(`${server.baseUrl}/api/destinations`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "Database schema is missing. Run the initial schema SQL in the intended database."
  });
  await server.close();
});

test("upcoming bookings can be edited and their totals are recalculated", async () => {
  const previousAuthBaseUrl = process.env.NEON_AUTH_BASE_URL;
  const previousJwksUrl = process.env.NEON_AUTH_JWKS_URL;
  const originalFetch = globalThis.fetch;
  const authOrigin = "https://travelx-auth.example.test";
  const jwksUrl = "https://travelx-auth.example.test/jwks";
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: "booking-edit-test", alg: "EdDSA" };
  const userId = "d9428888-122b-4b13-8b1e-1a1b5b123456";
  const header = Buffer.from(JSON.stringify({ alg: "EdDSA", kid: jwk.kid })).toString("base64url");
  const claims = Buffer.from(JSON.stringify({
    sub: userId,
    name: "Test Traveller",
    email: "traveller@example.test",
    iss: authOrigin,
    aud: authOrigin,
    exp: Math.floor(Date.now() / 1000) + 300
  })).toString("base64url");
  const content = `${header}.${claims}`;
  const token = `${content}.${sign(null, Buffer.from(content), privateKey).toString("base64url")}`;
  let updateValues;
  let bookingLookupCount = 0;
  const server = await startServer({
    query: async (sql, values) => {
      if (sql.includes("INSERT INTO public.users")) return { rowCount: 1, rows: [] };
      if (sql.includes("SELECT bookings.id, bookings.coupon_code")) {
        bookingLookupCount += 1;
        return {
          rowCount: 1,
          rows: [{ id: "booking-id", coupon_code: "TRAVELX10", price: "100.00" }]
        };
      }
      if (sql.includes("UPDATE public.bookings")) {
        updateValues = values;
        return {
          rowCount: 1,
          rows: [{
            ref: "TX-EDIT-123",
            tripId: "bali-soul",
            date: "2027-01-15",
            guests: 2,
            traveller: "Updated Traveller",
            phone: "+1 555 0100",
            total: "196.00"
          }]
        };
      }
      throw new Error(`Unexpected database query: ${sql}`);
    }
  });

  process.env.NEON_AUTH_BASE_URL = authOrigin;
  process.env.NEON_AUTH_JWKS_URL = jwksUrl;
  globalThis.fetch = async (input, options) => {
    if (String(input) === jwksUrl) {
      return new Response(JSON.stringify({ keys: [jwk] }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    return originalFetch(input, options);
  };

  try {
    const response = await originalFetch(`${server.baseUrl}/api/private/bookings/TX-EDIT-123`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        date: "2027-01-15",
        guests: 2,
        traveller: " Updated Traveller ",
        phone: " +1 555 0100 "
      })
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ref: "TX-EDIT-123",
      tripId: "bali-soul",
      date: "2027-01-15",
      guests: 2,
      traveller: "Updated Traveller",
      phone: "+1 555 0100",
      total: 196,
      status: "Upcoming"
    });
    assert.deepEqual(updateValues.slice(2), [
      "2027-01-15", 2, "Updated Traveller", "+1 555 0100", 200, 16, 20, 196
    ]);

    const invalid = await originalFetch(`${server.baseUrl}/api/private/bookings/TX-EDIT-123`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        date: "2020-01-01",
        guests: 2,
        traveller: "Test Traveller",
        phone: "+1 555 0100"
      })
    });
    assert.equal(invalid.status, 400);
    assert.equal(bookingLookupCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousAuthBaseUrl === undefined) delete process.env.NEON_AUTH_BASE_URL;
    else process.env.NEON_AUTH_BASE_URL = previousAuthBaseUrl;
    if (previousJwksUrl === undefined) delete process.env.NEON_AUTH_JWKS_URL;
    else process.env.NEON_AUTH_JWKS_URL = previousJwksUrl;
    await server.close();
  }
});
