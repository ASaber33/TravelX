import assert from "node:assert/strict";
import { test } from "node:test";
import { restoreApiRequestUrl } from "../src/vercel-route.js";

test("restores nested API paths and retains endpoint query parameters", () => {
  const request = {
    url: "/api/handler?path=private/bookings/TX-123&include=trip",
    query: { path: "private/bookings/TX-123" }
  };

  assert.equal(restoreApiRequestUrl(request), true);
  assert.equal(request.url, "/api/private/bookings/TX-123?include=trip");
});

test("joins array path segments from Vercel query parsing", () => {
  const request = {
    url: "/api/handler?path=private&path=session",
    query: { path: ["private", "session"] }
  };

  assert.equal(restoreApiRequestUrl(request), true);
  assert.equal(request.url, "/api/private/session");
});

test("rejects empty and traversal API paths", () => {
  for (const path of [undefined, "", "../private/session", ["private", "..", "session"]]) {
    const request = { url: "/api/handler?path=invalid", query: { path } };
    assert.equal(restoreApiRequestUrl(request), false);
    assert.equal(request.url, "/api/handler?path=invalid");
  }
});
