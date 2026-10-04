// CLI 只寫本 worktree ignored private root；buildCatalog 是合成測試 seam。
import { readFileSync, writeFileSync, mkdirSync, realpathSync, existsSync, renameSync } from "node:fs";
import { resolve, relative, isAbsolute, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import "../docs/study/private-pack.js";
import "../docs/study/pack-catalog.js";
const P = globalThis.StudyPrivatePack, C = globalThis.StudyPackCatalog;
export async function buildCatalog(pack, previous, publicQuestions = [], maxBytes = P.MAX_BYTES) {
  if (!previous) throw Error("必須提供已核准的前版完整內容。");
  if (!Number.isInteger(maxBytes) || maxBytes < 1024 || maxBytes > P.MAX_BYTES) throw Error("分包上限無效。");
  function validate(p) {
    if (![1,2].includes(p.schemaVersion) || p.packId !== "g4-s1-math-u1" || !Number.isSafeInteger(p.revision) || p.revision < 1 || !Array.isArray(p.questions) || !p.questions.length || !p.explanations) throw Error("來源格式無效。");
    const seen = new Set();
    for (const q of p.questions) {
      if (seen.has(q.id)) throw Error("題號重複。");
      seen.add(q.id);
      P.parse(JSON.stringify({schemaVersion:2,packId:p.packId,revision:p.revision,questions:[q],explanations:{[q.id]:p.explanations[q.id]}}),publicQuestions,null,true);
    }
    if (Object.keys(p.explanations).length !== seen.size) throw Error("解說範圍不符。");
  }
  validate(previous); validate(pack); C.compatible(pack,previous);
  if (pack.revision < previous.revision) throw Error("版本不能倒退。");
  const normalized = p => JSON.stringify([...p.questions].sort((a,b)=>a.id.localeCompare(b.id)).map(q=>[q.id,P.semantic(q),q.source,p.explanations[q.id]]));
  if (pack.revision === previous.revision && normalized(pack) !== normalized(previous)) throw Error("內容變動必須提高版本。");
  const manifest = {schemaVersion:2,packId:pack.packId,revision:pack.revision,shards:[]}, shards = new Map();
  const envelope = questions => ({schemaVersion:2,packId:pack.packId,revision:1,questions,explanations:Object.fromEntries(questions.map(q=>[q.id,pack.explanations[q.id]]))});
  async function emit(questions) {
    const raw = JSON.stringify(envelope(questions)), hash = await C.hash(raw);
    const descriptor = {hash,bytes:Buffer.byteLength(raw),subject:questions[0].subject,unit:questions[0].unit,ids:questions.map(q=>q.id),subtopics:questions.map(q=>q.subtopic)};
    await C.verifyShard(raw,descriptor,publicQuestions);
    manifest.shards.push(descriptor); shards.set(hash,raw);
  }
  for (const unit of [...new Set(pack.questions.map(q=>q.unit))].sort((a,b)=>a-b)) {
    let batch=[];
    for (const q of pack.questions.filter(q=>q.unit===unit)) {
      if (Buffer.byteLength(JSON.stringify(envelope([...batch,q]))) > maxBytes) { if (!batch.length) throw Error("單題超過分包限制。"); await emit(batch); batch=[]; }
      batch.push(q);
      if (Buffer.byteLength(JSON.stringify(envelope(batch))) > maxBytes) throw Error("單題超過分包限制。");
    }
    if (batch.length) await emit(batch);
  }
  C.parseManifest(JSON.stringify(manifest));
  return {manifest,shards};
}
const repo = realpathSync(fileURLToPath(new URL("../",import.meta.url)));
function safeOutput(path) {
  const root = resolve(repo,"data/private/study/g4-s1-math-u1");
  const target = resolve(path), rel=relative(root,target);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) throw Error("產物必須在本 worktree 私用目錄。");
  let ancestor=target; while(!existsSync(ancestor)) ancestor=dirname(ancestor);
  const real = resolve(realpathSync(ancestor),relative(ancestor,target));
  const canonicalRel=relative(root,real);
  if (canonicalRel.startsWith("..") || isAbsolute(canonicalRel)) throw Error("不可透過連結寫到其他位置。");
  execFileSync("git",["check-ignore","--quiet","--",target],{cwd:repo,stdio:"pipe"});
  return target;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args=process.argv.slice(2);
    if (args.length!==3) throw Error("用法：node scripts/build_private_study_catalog.mjs <input.json> <previous.json> <private-output-dir>");
    const [input,previous,output]=args;
    const target=safeOutput(resolve(output,"manifest.json"));
    const {manifest,shards}=await buildCatalog(JSON.parse(readFileSync(input,"utf8")),JSON.parse(readFileSync(previous,"utf8")),JSON.parse(readFileSync(resolve(repo,"docs/study/questions.json"),"utf8")));
    mkdirSync(dirname(target),{recursive:true});
    for(const [hash,raw] of shards) {
      const path=safeOutput(resolve(output,`${hash}.json`));
      if(existsSync(path) && readFileSync(path,"utf8")!==raw) throw Error("既有 immutable shard 不符。");
      writeFileSync(path,raw);
    }
    const raw=JSON.stringify(manifest,null,2)+"\n";
    writeFileSync(safeOutput(target+".tmp"),raw);renameSync(target+".tmp",target);
    console.log(JSON.stringify({revision:manifest.revision,count:manifest.shards.reduce((n,s)=>n+s.ids.length,0),shards:shards.size,manifestBytes:Buffer.byteLength(raw),manifestSha256:await C.hash(raw),shardBytes:manifest.shards.reduce((n,s)=>n+s.bytes,0)}));
  } catch(e) { console.error(e.message); process.exitCode=1; }
}
