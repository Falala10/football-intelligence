const local = (hostname: string) => ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
/** Next can normalize Request.url to localhost. Host retains the browser's authority.
 * Require the browser Origin to match that authority exactly; do not trust forwarded headers.
 */
export function isLocalSameOrigin(request: Request): boolean {
  try {
    const destination = new URL(request.url), rawOrigin = request.headers.get("origin");
    if (!rawOrigin || !local(destination.hostname) || !["http:", "https:"].includes(destination.protocol)) return false;
    const origin = new URL(rawOrigin), host = request.headers.get("host") ?? destination.host;
    if (!/^[a-zA-Z0-9.:[\]-]+$/.test(host)) return false;
    const authority = new URL(`${destination.protocol}//${host}`);
    return local(authority.hostname) && local(origin.hostname) && rawOrigin === origin.origin &&
      origin.protocol === destination.protocol && authority.host === origin.host && authority.port === destination.port;
  } catch { return false; }
}
