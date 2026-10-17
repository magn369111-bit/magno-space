import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, posix } from "node:path";

async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(full, base)));
    else files.push(posix.join(...full.slice(base.length + 1).split(/[\\/]/)));
  }
  return files;
}

const root = ["index.html", "manifest.webmanifest", "service-worker.js"];
for (const file of root) {
  if (!existsSync(file)) throw new Error(`Arquivo obrigatório ausente: ${file}`);
}

// O service worker precisa listar exatamente os arquivos que o app usa.
const worker = await readFile("service-worker.js", "utf8");
const listed = new Set([...worker.matchAll(/"\.\/([^"]+)"/g)].map((match) => match[1]));
const expected = new Set(["index.html", "manifest.webmanifest", ...(await listFiles("src")).map((file) => `src/${file}`)]);

const missing = [...listed].filter((file) => !expected.has(file));
const forgotten = [...expected].filter((file) => !listed.has(file));
if (missing.length || forgotten.length) {
  throw new Error(
    [
      "A lista PRECACHE do service-worker.js está desatualizada.",
      missing.length ? `  Listados, mas inexistentes: ${missing.join(", ")}` : "",
      forgotten.length ? `  Existem, mas não estão listados: ${forgotten.join(", ")}` : ""
    ]
      .filter(Boolean)
      .join("\n")
  );
}

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp("index.html", join("dist", "index.html"));
await cp("manifest.webmanifest", join("dist", "manifest.webmanifest"));
await cp("src", join("dist", "src"), { recursive: true });

// Identificador do build: muda sempre que qualquer arquivo muda.
const hash = createHash("sha256");
for (const file of [...expected].sort()) hash.update(await readFile(file));
const buildId = hash.digest("hex").slice(0, 10);
await writeFile(join("dist", "service-worker.js"), worker.replace("__BUILD_ID__", buildId));

console.log(`Build estático criado em dist/ (versão ${buildId}).`);
