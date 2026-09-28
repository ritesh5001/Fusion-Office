import dns from "node:dns/promises";
import http from "node:http";
import net from "node:net";
import { HttpError } from "./http.js";

/**
 * Outbound-request guard for server-side fetching (HTML to PDF). Only public
 * internet addresses may be reached, never this machine, the private network
 * or cloud metadata endpoints.
 */
const blocked = new net.BlockList();
for (const [addr, prefix] of [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, cloud metadata
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // documentation
  ["192.88.99.0", 24], // 6to4 relay
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // documentation
  ["203.0.113.0", 24], // documentation
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, broadcast
] as const)
  blocked.addSubnet(addr, prefix, "ipv4");
for (const [addr, prefix] of [
  ["::", 128], // unspecified
  ["::1", 128], // loopback
  ["64:ff9b::", 96], // NAT64 (can reach IPv4 private ranges)
  ["64:ff9b:1::", 48], // local-use NAT64
  ["100::", 64], // discard
  ["2001::", 23], // IETF protocol assignments (Teredo, ORCHID, …)
  ["2001:db8::", 32], // documentation
  ["2002::", 16], // 6to4 (embeds IPv4)
  ["fc00::", 7], // unique local
  ["fe80::", 10], // link-local
  ["fec0::", 10], // site-local (deprecated)
  ["ff00::", 8], // multicast
] as const)
  blocked.addSubnet(addr, prefix, "ipv6");

export function isPublicAddress(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return !blocked.check(ip, "ipv4");
  if (family === 6) {
    // IPv4-mapped / -compatible addresses: judge the embedded IPv4 address.
    const mapped = ip.match(/^::(?:ffff:(?:0:)?)?(\d+\.\d+\.\d+\.\d+)$/i);
    if (mapped) return isPublicAddress(mapped[1]);
    const hexMapped = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
    if (hexMapped) {
      const [hi, lo] = [parseInt(hexMapped[1], 16), parseInt(hexMapped[2], 16)];
      return isPublicAddress(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
    }
    return !blocked.check(ip, "ipv6");
  }
  return false;
}

/**
 * Resolve a host name and return an address to connect to. Every address the
 * name resolves to must be public; connecting to the returned IP (instead of
 * resolving again) closes the DNS-rebinding gap.
 */
export async function resolvePublic(hostname: string): Promise<string> {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) {
    if (!isPublicAddress(host)) throw new HttpError(400, "That address isn't on the public internet.");
    return host;
  }
  if (!host || /(^|\.)(localhost|local|internal|localdomain)$/i.test(host)) throw new HttpError(400, "That address isn't on the public internet.");
  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(host, { all: true, verbatim: true });
  } catch {
    throw new HttpError(422, `Couldn't find ${host}. Check the address.`);
  }
  if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address))) throw new HttpError(400, "That address isn't on the public internet.");
  return addresses[0].address;
}

/** Validate a user-supplied web address: http(s) only, no credentials, public host. */
export async function checkPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new HttpError(400, "Enter a full web address, starting with https://");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new HttpError(400, "Only http:// and https:// addresses are supported.");
  if (url.username || url.password) throw new HttpError(400, "Addresses with a user name or password aren't supported.");
  if (raw.length > 2048) throw new HttpError(400, "That address is too long.");
  await resolvePublic(url.hostname);
  return url;
}

export const BLOCKED_HEADER = "x-fusion-blocked";

/**
 * A tiny forward proxy on 127.0.0.1 that the headless browser is forced to use
 * for every request (pages, sub-resources, fetch, workers, WebSockets). It
 * resolves each host itself, refuses anything that isn't public, then
 * connects to that exact IP.
 */
export async function startEgressProxy(): Promise<{ port: number; close: () => void }> {
  const server = http.createServer(async (req, res) => {
    // Plain-HTTP requests arrive in absolute form: GET http://host/path
    let target: URL;
    try {
      target = new URL(req.url ?? "");
      if (target.protocol !== "http:") throw new Error("scheme");
    } catch {
      res.writeHead(400).end();
      return;
    }
    let ip: string;
    try {
      ip = await resolvePublic(target.hostname);
    } catch {
      res.writeHead(403, { [BLOCKED_HEADER]: "1", "content-type": "text/plain" }).end("Blocked");
      return;
    }
    const headers = { ...req.headers };
    delete headers["proxy-connection"];
    delete headers["proxy-authorization"];
    const upstream = http.request(
      { host: ip, port: Number(target.port) || 80, method: req.method, path: target.pathname + target.search, headers, setHost: false },
      (up) => {
        res.writeHead(up.statusCode ?? 502, up.headers);
        up.pipe(res);
      },
    );
    upstream.setTimeout(30_000, () => upstream.destroy());
    upstream.on("error", () => (res.headersSent ? res.destroy() : res.writeHead(502).end()));
    req.pipe(upstream);
  });

  // HTTPS and WebSockets tunnel through CONNECT host:port.
  server.on("connect", async (req, socket, head) => {
    socket.on("error", () => socket.destroy());
    const m = (req.url ?? "").match(/^(\[[^\]]+\]|[^:]+):(\d{1,5})$/);
    const port = m ? Number(m[2]) : 0;
    if (!m || port < 1 || port > 65535) return void socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
    let ip: string;
    try {
      ip = await resolvePublic(m[1]);
    } catch {
      return void socket.end(`HTTP/1.1 403 Forbidden\r\n${BLOCKED_HEADER}: 1\r\n\r\n`);
    }
    const upstream = net.connect(port, ip, () => {
      socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length) upstream.write(head);
      upstream.pipe(socket);
      socket.pipe(upstream);
    });
    upstream.setTimeout(60_000, () => upstream.destroy());
    upstream.on("error", () => socket.end("HTTP/1.1 502 Bad Gateway\r\n\r\n"));
    socket.on("close", () => upstream.destroy());
  });

  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  return { port: (server.address() as net.AddressInfo).port, close: () => server.close() };
}
