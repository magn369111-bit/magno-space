// Servidor de desenvolvimento. Serve apenas arquivos públicos do projeto.
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const root = resolve(process.cwd());

// Só estas pastas e arquivos são servidos (nada de .git, node_modules, test etc.).
const PUBLIC = [/^index\.html$/, /^manifest\.webmanifest$/, /^service-worker\.js$/, /^src\//];

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml"
};

const headers = {
  "Cache-Control": "no-cache",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer"
};

function send(response, status, body, extra = {}) {
  response.writeHead(status, { ...headers, "Content-Type": "text/plain; charset=utf-8", ...extra });
  response.end(body);
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://localhost:${port}`);
    let relative = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
    let filePath = resolve(join(root, relative));

    const inside = filePath === root || filePath.startsWith(root + sep);
    const allowed = inside && PUBLIC.some((pattern) => pattern.test(relative.split(sep).join("/")));

    let info = allowed ? await stat(filePath).catch(() => null) : null;
    if (!info?.isFile()) {
      // Qualquer outro caminho cai no app (comportamento de PWA de página única).
      if (extname(relative)) return send(response, 404, "Não encontrado");
      relative = "index.html";
      filePath = join(root, relative);
      info = await stat(filePath);
    }

    response.writeHead(200, { ...headers, "Content-Type": types[extname(filePath)] || "application/octet-stream" });
    createReadStream(filePath)
      .on("error", () => response.destroy())
      .pipe(response);
  } catch {
    send(response, 400, "Requisição inválida");
  }
}).listen(port, host, () => {
  console.log(`Magno Space rodando em http://localhost:${port}`);
});
