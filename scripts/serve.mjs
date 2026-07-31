#!/usr/bin/env node
/* serve.mjs - a zero-dependency static file server for local preview.
 * Usage: node scripts/serve.mjs [port]   (default 8787)
 * The site also runs directly from file:// since data is embedded in js/data.js. */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.argv[2]) || 8787;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath === "/") urlPath = "/index.html";
    const safe = normalize(join(ROOT, urlPath));
    if (!safe.startsWith(ROOT)) { res.writeHead(403); return res.end("forbidden"); }
    let filePath = safe;
    try {
      const s = await stat(filePath);
      if (s.isDirectory()) filePath = join(filePath, "index.html");
    } catch {
      res.writeHead(404, { "content-type": "text/plain" });
      return res.end("404 not found");
    }
    const body = await readFile(filePath);
    res.writeHead(200, { "content-type": MIME[extname(filePath)] || "application/octet-stream" });
    res.end(body);
  } catch (e) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("500 " + e.message);
  }
});

server.listen(PORT, () => {
  console.log(`craig's agents list -> http://localhost:${PORT}`);
});
