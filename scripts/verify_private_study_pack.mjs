// 唯讀部署前檢查：只接受本 worktree 精確 ignored root，輸出不含題文。
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, relative, isAbsolute, sep } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import "../docs/study/private-pack.js";

try {
  const expected = process.argv[2];
  if (process.argv.length !== 3 || !/^[a-f0-9]{64}$/i.test(expected || "")) throw Error();
  const repo = realpathSync(fileURLToPath(new URL("../", import.meta.url)));
  const root = resolve(repo, "data/private/study/g4-s1-math-u1");
  const path = realpathSync(resolve(root, "pack.json"));
  const within = relative(root, path);
  if (within.startsWith(`..${sep}`) || within === ".." || isAbsolute(within)) throw Error();
  execFileSync("git", ["check-ignore", "--quiet", "--", path], { cwd: repo, stdio: "pipe" });
  const bytes = readFileSync(path);
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== expected.toLowerCase()) throw Error();
  const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const publicQuestions = JSON.parse(readFileSync(resolve(repo, "docs/study/questions.json"), "utf8"));
  const pack = globalThis.StudyPrivatePack.parse(raw, publicQuestions);
  console.log(`valid count=${pack.questions.length} bytes=${bytes.length} revision=${pack.revision} sha256=${hash}`);
} catch {
  console.error("未通過：請確認本 worktree 的 ignored pack 路徑、核准 SHA256 與題包契約；未執行任何上傳。");
  process.exitCode = 1;
}
