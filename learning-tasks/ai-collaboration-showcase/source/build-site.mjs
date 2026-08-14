import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const sourceDir = dirname(fileURLToPath(import.meta.url));
const taskDir = dirname(sourceDir);
const outputDir = join(taskDir, "output", "site");
const zooTaskDir = join(taskDir, "..", "hsinchu-zoo-adventure");
const pdfSource = join(
  zooTaskDir,
  "output",
  "hsinchu-zoo-adventure-cards-half-label-a4.pdf",
);

if (!existsSync(pdfSource)) {
  throw new Error(`找不到最終 PDF：${pdfSource}`);
}

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
cpSync(join(sourceDir, "index.html"), join(outputDir, "index.html"));
cpSync(join(sourceDir, "_headers"), join(outputDir, "_headers"));
cpSync(join(taskDir, "assets"), join(outputDir, "assets"), { recursive: true });
cpSync(pdfSource, join(outputDir, "hsinchu-zoo-adventure-cards.pdf"));

console.log(`Built ${outputDir}`);
