// Read-only pending-content display in the isolated fake family server.
// Inputs and screenshots stay in ignored private directories; this never writes a release pack.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import "../../docs/study/private-pack.js";

const baseHash = "98150515d8897c0240316d173fd8d94b47edae0804c05a271bb0431dbbe6b22c";
const imageHash = "47c6d22522bcec667bee4e342c2d7827ef7fd3d485623269142a0b23843a2c58";
const readJson = path => JSON.parse(readFileSync(path, "utf8"));
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

export function loadPrivateStudyQaPack(basePath, deltaDir) {
  if (!basePath || !deltaDir) throw Error("Pending QA requires both private input paths");
  const baseBytes = readFileSync(basePath);
  if (sha256(baseBytes) !== baseHash) throw Error("Pending QA base identity mismatch");
  const base = JSON.parse(baseBytes.toString("utf8"));
  const curatedBytes = readFileSync(join(deltaDir, "curated-delta.json"));
  const explanationsBytes = readFileSync(join(deltaDir, "explanations-delta.json"));
  const curated = JSON.parse(curatedBytes.toString("utf8"));
  const explanations = JSON.parse(explanationsBytes.toString("utf8"));
  const manifest = readJson(join(deltaDir, "delta-manifest.json"));
  const outputHash = name => manifest.outputs?.find(output => output.name === name)?.sha256?.toLowerCase();
  if (outputHash("curated-delta.json") !== sha256(curatedBytes) || outputHash("explanations-delta.json") !== sha256(explanationsBytes) ||
      base.revision !== 5 || base.questions.length !== 77 || curated.revision !== 6 || explanations.revision !== 6 ||
      curated.items.length !== 12 || explanations.entries.length !== 12 ||
      manifest.status !== "pending_independent_content_review" ||
      !curated.items.every(item => item.verification === "pending")) throw Error("Pending QA inputs do not match the review state");
  const additions = curated.items.map(item => ({ ...item.question,
    source: `data/study/g4-s1-math-u1/mapping-metadata.json appId=${item.question.id}` }));
  const image = additions.find(question => question.material?.kind === "png")?.material.data;
  if (!image?.startsWith("data:image/png;base64,") || sha256(Buffer.from(image.slice(22), "base64")) !== imageHash) throw Error("Pending QA image identity mismatch");
  const pack = { ...base, revision: 6, questions: [...base.questions, ...additions],
    explanations: { ...base.explanations, ...Object.fromEntries(explanations.entries.map(entry => [entry.id, entry.text])) } };
  globalThis.StudyPrivatePack.parse(JSON.stringify(pack), [], base);
  if (pack.questions.length !== 89) throw Error("Pending QA activity count mismatch");
  return pack;
}
