import { createServer, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIPv4 } from "node:net";

const host = process.env.ZKTECO_ADMS_BIND_IP;
const scannerIp = process.env.ZKTECO_ADMS_SCANNER_IP;
const secret = process.env.ZKTECO_ADMS_SECRET;
const port = Number(process.env.ZKTECO_ADMS_PORT ?? 8088);
const origin = new URL(process.env.ZKTECO_CHUMKOSOFT_ORIGIN ?? "http://127.0.0.1:3000");
const endpoints = new Map([
  ["/iclock/cdata", "cdata"],
  ["/iclock/getrequest", "getrequest"],
]);

function isLocalIPv4(address) {
  if (!isIPv4(address)) return false;
  const [first, second] = address.split(".").map(Number);
  return first === 127 || first === 10 || (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168);
}

if (!isLocalIPv4(host) || !isLocalIPv4(scannerIp) || !secret || secret.length < 32 ||
    !Number.isInteger(port) || port < 1 || port > 65535 ||
    (origin.protocol !== "https:" && !(origin.protocol === "http:" && origin.hostname === "127.0.0.1")) ||
    origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
  throw new Error("Check ZKTECO_ADMS_BIND_IP, ZKTECO_ADMS_SCANNER_IP, ZKTECO_ADMS_SECRET, ZKTECO_ADMS_PORT and ZKTECO_CHUMKOSOFT_ORIGIN");
}

function fail(response, status) {
  if (response.headersSent) response.destroy();
  else response.writeHead(status, { Connection: "close" }).end();
}

const server = createServer({ requestTimeout: 15_000, headersTimeout: 10_000 }, (incoming, outgoing) => {
  if (incoming.socket.remoteAddress !== scannerIp) return fail(outgoing, 403);
  const target = URL.parse(incoming.url, "http://scanner.local");
  if (!target) return fail(outgoing, 400);
  const endpoint = endpoints.get(target.pathname.toLowerCase().replace(/\.aspx$/u, ""));
  if (!endpoint) return fail(outgoing, 404);
  if (incoming.method !== "GET" && (incoming.method !== "POST" || endpoint !== "cdata")) {
    return fail(outgoing, 405);
  }
  if (incoming.method === "POST" && target.searchParams.get("table") !== "ATTLOG") return fail(outgoing, 415);

  const length = Number(incoming.headers["content-length"] ?? 0);
  if (incoming.method === "POST" && (!Number.isInteger(length) || length < 1 || length > 64 * 1024)) {
    return fail(outgoing, length > 64 * 1024 ? 413 : 411);
  }

  const url = new URL(`/api/internal/zkteco-adms/${endpoint}`, origin);
  url.search = target.search;
  const forward = origin.protocol === "https:" ? httpsRequest : httpRequest;
  const upstream = forward(url, {
    method: incoming.method,
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(incoming.method === "POST" && { "Content-Length": length, "Content-Type": "text/plain" }),
    },
  }, (response) => {
    const headers = { "Content-Type": "text/plain", "Cache-Control": "no-store" };
    const length = response.headers["content-length"];
    if (length !== undefined) headers["Content-Length"] = length;
    outgoing.writeHead(response.statusCode ?? 502, headers);
    response.once("error", () => outgoing.destroy());
    response.pipe(outgoing);
    console.info(`ADMS ${incoming.method} ${endpoint} → ${response.statusCode ?? 502}`);
  });
  upstream.setTimeout(15_000, () => upstream.destroy());
  upstream.once("error", () => fail(outgoing, 502));
  outgoing.once("close", () => { if (!outgoing.writableEnded) upstream.destroy(); });
  if (incoming.method === "POST") incoming.pipe(upstream);
  else upstream.end();
});

server.listen(port, host, () => console.info(`ZKTeco ADMS listening on ${host}:${port}`));
