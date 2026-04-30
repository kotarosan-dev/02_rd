const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const url = require("node:url");

const root = path.resolve(__dirname, "..", "app");
const port = Number(process.env.PORT || 5174);
const host = "127.0.0.1";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

const server = http.createServer((request, response) => {
  const parsed = url.parse(request.url);
  const rawPath = parsed.pathname === "/" ? "/widget.html" : decodeURIComponent(parsed.pathname);
  const filePath = path.resolve(root, `.${rawPath}`);

  if (!filePath.startsWith(root)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not Found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(content);
  });
});

server.listen(port, host, () => {
  console.log(`Zoho CRM Three.js widget demo: http://${host}:${port}/widget.html`);
});

