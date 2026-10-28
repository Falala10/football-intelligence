import { expect, it } from "vitest";
import { isLocalSameOrigin } from "./local-origin";
const req = (url: string, origin?: string, host?: string, forwarded?: string) => new Request(url, { headers: { ...(origin ? { origin } : {}), ...(host ? { host } : {}), ...(forwarded ? { "x-forwarded-host": forwarded } : {}) } });
it("accepts local browser authorities even when Next normalizes the request URL", () => {
  for (const host of ["localhost:3000", "127.0.0.1:3000", "[::1]:3000"]) {
    expect(isLocalSameOrigin(req(`http://${host}/api/match-ai`, `http://${host}`, host))).toBe(true);
    expect(isLocalSameOrigin(req("http://localhost:3000/api/match-ai", `http://${host}`, host))).toBe(true);
  }
});
it("rejects cross-origin, cross-port, non-local and malformed requests", () => {
  for (const r of [
    req("http://localhost:3000/api", "https://evil.example", "localhost:3000"),
    req("http://localhost:3000/api", "http://localhost:3001", "localhost:3001"),
    req("http://localhost:3000/api", "http://localhost:3000", "127.0.0.1:3000"),
    req("http://localhost:3000/api", "http://evil.example:3000", "evil.example:3000"),
    req("http://evil.example:3000/api", "http://localhost:3000", "localhost:3000"),
    req("http://localhost:3000/api", "null", "localhost:3000"),
    req("http://localhost:3000/api", "http://localhost:3000/", "localhost:3000"),
    req("http://localhost:3000/api", undefined, "localhost:3000"),
    req("http://localhost:3000/api", "http://localhost:3000", "user@localhost:3000"),
    req("http://localhost:3000/api", "http://localhost:3000", "localhost:3000/path"),
  ]) expect(isLocalSameOrigin(r)).toBe(false);
});
it("does not use forwarded-host headers to authorize an origin", () => {
  expect(isLocalSameOrigin(req("http://localhost:3000/api", "http://127.0.0.1:3000", "localhost:3000", "127.0.0.1:3000"))).toBe(false);
});
