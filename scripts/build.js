import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const required = ["index.html", "manifest.webmanifest", "service-worker.js", "src/main.js", "src/domain.js", "src/store.js", "src/styles.css"];

for (const file of required) {
  if (!existsSync(file)) {
    throw new Error(`Arquivo obrigatorio ausente: ${file}`);
  }
}

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp("index.html", join("dist", "index.html"));
await cp("manifest.webmanifest", join("dist", "manifest.webmanifest"));
await cp("service-worker.js", join("dist", "service-worker.js"));
await cp("src", join("dist", "src"), { recursive: true });

console.log("Build estatico criado em dist/");
