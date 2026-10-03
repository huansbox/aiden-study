import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/worker.mjs";
import { kvStub } from "../worker/kv-stub.mjs";
import { boot, storage } from "./helpers/study-harness.mjs";
import { syntheticPack, syntheticPngData, ids } from "./helpers/synthetic-study-pack.mjs";

const url = "https://sync.test/v1/packs/g4-s1-math-u1";
const contentKey = "c:study:g4-s1-math-u1";
const cacheKey = "study:private-pack:g4-s1-math-u1";
const progressKey = "study:progress:test-child";
const raw = p => JSON.stringify(p || syntheticPack());
function anglePack() {
  const pack = syntheticPack();
  pack.revision = 10;
  const image = { kind: "png", data: syntheticPngData(8, 6, 550, 304), alt: "合成角度圖" };
  const choice = { id: "math-g4s1-synthetic-angle-choice-v1", subject: "math", unit: 17, type: "multiple_choice", text: "合成角度圖：選出直角。",
    subtopic: "合成角度", source: "synthetic fixture only", options: ["30°", "60°", "90°", "120°"], answer: "3",
    material: image };
  const number = { id: "math-g4s1-synthetic-angle-number-v1", subject: "math", unit: 17, type: "fill_in_blank", text: "合成角度圖：輸入角度（１）。",
    subtopic: "合成角度", source: "synthetic fixture only", options: [], answer: "", blanks: [{ input: "number", answer: "90" }], material: image };
  const comparison = { id: "math-g4s1-synthetic-angle-comparison-v1", subject: "math", unit: 17, type: "fill_in_blank", text: "合成角度圖：比較兩角（１）。",
    subtopic: "合成角度", source: "synthetic fixture only", options: [], answer: "", blanks: [{ input: "comparison", answer: ">" }], material: image };
  pack.questions.push(choice, number, comparison);
  for (const q of [choice, number, comparison]) pack.explanations[q.id] = "合成解說：依圖判斷。";
  return pack;
}
function packAtBytes(size) {
  const pack = syntheticPack();
  pack.explanations[ids[0]] = "語";
  const base = Buffer.byteLength(raw(pack));
  pack.explanations[ids[0]] += "x".repeat(size - base);
  assert.equal(Buffer.byteLength(raw(pack)), size);
  return pack;
}
const plain = x => JSON.parse(JSON.stringify(x));
const flush = async () => { for (let i=0;i<40;i++) await Promise.resolve(); };
const answer = q => q.blanks ? q.blanks.map(b=>b.answer) : q.answer;
function request(method="GET", token="test-token", target=url) {
  return new Request(target, { method, headers: token ? { Authorization: `Bearer ${token}`, Origin: "https://kids.linshuhuan.com" } : {} });
}
function network(reply = () => new Response(raw())) {
  const requests = [];
  return { requests, fetch: async (url, init) => {
    requests.push({ url, init });
    if (url.includes("/v1/packs/")) return reply(url, init);
    // Sync stays on its real protocol, with entirely synthetic progress.
    return new Response(JSON.stringify({ rev: 0, data: null }));
  } };
}
function seeded(p) {
  const st=storage(); st.map.set("kids_sync_token","test-token");
  if(p) st.map.set(cacheKey,raw(p));
  return st;
}

test("Worker content route: auth, CORS, read-only, fixed pack, no-store, status and progress isolation", async () => {
  const kv=kvStub({
    [contentKey]:{value:raw()},
    "p:test-child:study":{value:JSON.stringify({rev:3,data:{mastered:{15:[ids[0]]}}})},
  });
  const env={TOKEN:"test-token",KV:kv};
  for (const token of [null,"wrong"]) {
    const res=await worker.fetch(request("GET",token),env); assert.equal(res.status,401); assert.ok(!(await res.text()).includes(ids[0]));
  }
  const res=await worker.fetch(request(),env);
  assert.equal(res.status,200); assert.equal(res.headers.get("Cache-Control"),"no-store");
  assert.equal(res.headers.get("Access-Control-Allow-Origin"),"https://kids.linshuhuan.com");
  assert.deepEqual(await res.json(),syntheticPack());
  for(const method of ["PUT","POST","DELETE","PATCH","HEAD"]) assert.equal((await worker.fetch(request(method),env)).status,405);
  assert.equal((await worker.fetch(request("OPTIONS",null),env)).status,204);
  assert.equal((await worker.fetch(request("GET","test-token",url+"-other"),env)).status,404);
  const before=await kv.get("p:test-child:study");
  const status=await worker.fetch(request("GET","test-token","https://sync.test/v1/status"),env);
  assert.deepEqual(await status.json(),{keys:[]});
  assert.equal(await kv.get(contentKey),raw()); assert.equal(await kv.get("p:test-child:study"),before);
});
test("math unit 17 PNG passes production Worker GET and browser import; other material stays blocked", async () => {
  const valid = anglePack();
  const progress = "synthetic-progress-sentinel";
  const fetchPack = async pack => {
    const KV = kvStub({ [contentKey]: { value: raw(pack) }, "p:test-child:study": { value: progress } });
    const response = await worker.fetch(request(), { TOKEN: "test-token", KV });
    assert.equal(await KV.get("p:test-child:study"), progress);
    return response;
  };
  const response = await fetchPack(valid);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), valid);
  const e = await boot();
  assert.doesNotThrow(() => e.app.importPrivatePack(raw(valid)));
  e.app.State.setStudyTerm("g4-s1"); e.app.State.setSubject("math");
  const angleQuestions = valid.questions.slice(-3);
  e.app.State.saveBatch("17", angleQuestions.map(q => q.id)); e.app.startQuiz("full", 17);
  assert.match(e.node("page-quiz").innerHTML, /data-material-open/);
  assert.match(e.node("page-quiz").innerHTML, /合成角度圖/);
  for (const [index, q] of angleQuestions.entries()) {
    assert.equal(e.app.quiz.queue[0], q.id);
    e.app.submitAnswer(q.type === "multiple_choice" ? q.answer : q.blanks.map(blank => blank.answer));
    if (index < angleQuestions.length - 1) e.app.advance();
  }
  assert.equal(e.app.State.doneCount(17), 3);
  for (const mutate of [
    q => { q.unit = 16; },
    q => { q.unit = 18; },
    q => { q.material = { kind: "table", caption: "Angles", columns: ["A", "B"], rows: [["30", "60"]] }; },
    q => { q.material.data = "https://outside.invalid/angle.png"; },
    q => { q.material.data = syntheticPngData(8, 6, 1601, 1); },
    q => { q.material.alt = "😀".repeat(201); },
  ]) {
    const bad = anglePack(); mutate(bad.questions.at(-1));
    assert.throws(() => e.window.StudyPrivatePack.parse(raw(bad)));
    const rejected = await fetchPack(bad);
    assert.equal(rejected.status, 500);
    assert.deepEqual(await rejected.json(), { error: "corrupt pack" });
  }
});
test("Worker missing / corrupt / bad schema / KV exception never return content", async () => {
  for(const [value,status] of [[null,404],["{private broken",500],[raw({...syntheticPack(),schemaVersion:9}),500]]) {
    const KV=kvStub(value===null?{}:{[contentKey]:{value}});
    const res=await worker.fetch(request(),{TOKEN:"test-token",KV});
    assert.equal(res.status,status); assert.ok(!(await res.text()).includes("private broken"));
  }
  const res=await worker.fetch(request(),{TOKEN:"test-token",KV:{get(){throw Error("sensitive upstream");}}});
  assert.equal(res.status,500); assert.deepEqual(await res.json(),{error:"internal"});
});
test("Worker serves authorized valid UTF-8 pack at 262144 bytes and rejects 262145 bytes", async () => {
  for (const [size, status] of [[262144, 200], [262145, 500]]) {
    const content = raw(packAtBytes(size));
    const KV = kvStub({ [contentKey]: { value: content } });
    const env = { TOKEN: "test-token", KV };
    for (const token of [null, "wrong"]) {
      const denied = await worker.fetch(request("GET", token), env);
      assert.equal(denied.status, 401);
      assert.ok(!(await denied.text()).includes("語"));
    }
    const result = await worker.fetch(request(), env);
    assert.equal(result.status, status);
    if (status === 200) {
      assert.equal(result.headers.get("Cache-Control"), "no-store");
      assert.deepEqual(Buffer.from(await result.arrayBuffer()), Buffer.from(content, "utf8"));
    } else {
      assert.deepEqual(await result.json(), { error: "corrupt pack" });
    }
    assert.equal(await KV.get(contentKey), content);
  }
});
test("real boot auto-download → two correct one wrong → reload/resume; shared content and isolated progress", async () => {
  const net=network(); let e=await boot(seeded(),"test-child",net); await flush();
  assert.equal(e.app.activePack.questions.length,6);
  assert.equal(e.app.state.studyTerm,"g3-s2");
  const packReq=net.requests.find(r=>r.url.includes("/packs/"));
  assert.equal(packReq.init.headers.Authorization,"Bearer test-token"); assert.equal(packReq.init.cache,"no-store"); assert.ok(!packReq.url.includes("test-token"));
  e.app.State.setStudyTerm("g4-s1"); e.app.State.setSubject("math"); e.app.State.saveBatch("15",ids); e.app.startQuiz("full",15);
  for(let i=0;i<2;i++){e.app.submitAnswer(answer(e.app.map.get(e.app.quiz.queue[0])));e.app.advance();}
  e.app.submitAnswer(["999"]); const queue=plain(e.app.quiz.queue);
  e=await boot(e.st,"test-child",net); await flush();
  assert.equal(e.app.State.doneCount(15),2); e.app.startQuiz("full",15); assert.deepEqual(plain(e.app.quiz.queue),queue);
  const progress=e.st.getItem(progressKey);
  const sibling=await boot(e.st,"test-other",net); await flush();
  assert.equal(sibling.app.State.doneCount(15),0); assert.equal(e.st.getItem(progressKey),progress);
  assert.ok(!progress.includes("合成"));
  e.window._exportProgress(); assert.ok(!e.node("backup-text").value.includes("合成"));
  for(const r of net.requests.filter(r=>r.url.includes("/progress/"))) assert.ok(!String(r.init?.body).includes("合成"));
});
test("no token is nonblocking; existing settings callback and select-term retry take effect", async () => {
  let status=404; const net=network(()=>new Response(status===200?raw():"",{status}));
  const e=await boot(storage(),"test-child",net); assert.equal(net.requests.length,0);
  assert.match(e.node("pack-status").textContent,/尚未設定家庭金鑰/);
  e.node("sync-token-input").value="test-token"; e.window._saveSyncToken(); await flush();
  assert.match(e.node("pack-status").textContent,/尚未發布/);
  status=200; e.window._setStudyTerm("g4-s1"); await flush();
  assert.equal(e.app.activePack.questions.length,6);
});
test("background wait cannot block local boot or change live quiz; apply at home then persist revision", async () => {
  let resolve; const waiting=new Promise(r=>resolve=r); const net=network(()=>waiting);
  const e=await boot(seeded(syntheticPack()),"test-child",net);
  e.app.State.setStudyTerm("g4-s1"); e.app.State.setSubject("math"); e.app.State.saveBatch("15",ids); e.app.startQuiz("full",15);
  const map=e.app.map, queue=plain(e.app.quiz.queue), progress=e.st.getItem(progressKey);
  const p=syntheticPack();p.revision=2;p.explanations[ids[0]]="新的合成解說";
  resolve(new Response(raw(p))); await flush();
  assert.equal(e.app.map,map); assert.deepEqual(plain(e.app.quiz.queue),queue); assert.equal(e.st.getItem(progressKey),progress);
  assert.equal(JSON.parse(e.st.getItem(cacheKey)).revision,1);
  e.window._goHome(); assert.equal(e.app.activePack.revision,2); assert.equal(e.st.getItem(progressKey),progress);
});
test("network/HTTP/invalid/size/revision/semantic/storage failures keep active cache and every progress field", async () => {
  let reply=()=>new Response(raw()); const net=network(()=>reply());
  const e=await boot(seeded(syntheticPack()),"test-child",net); await flush();
  e.app.State.setStudyTerm("g4-s1"); e.app.State.setSubject("math");e.app.State.addMastered(15,ids[0]);
  const p=syntheticPack();p.revision=2;e.app.importPrivatePack(raw(p));
  const original=e.app.activePack, cache=e.st.getItem(cacheKey), progress=e.st.getItem(progressKey);
  const invalid=[];
  for(const [status,hint] of [[401,/金鑰不正確/],[404,/尚未發布/],[500,/服務異常/]]) invalid.push([()=>new Response("",{status}),hint]);
  invalid.push([()=>{throw Error("do not expose upstream token");},/無法連線/]);
  invalid.push([()=>new Response("{"),/JSON/],[()=>new Response("x".repeat(262145)),/256 KiB/]);
  invalid.push([()=>new Response(raw(),{headers:{"Content-Length":"262145"}}),/256 KiB/]);
  for(const [change,hint] of [[p=>p.schemaVersion=9,/版本/],[p=>p.packId="other",/版本/],[p=>p.questions[0].answer="3",/相同 ID/],[p=>p.explanations[ids[0]]+="different",/revision/],[p=>p.revision=1,/較舊/]]) {
    const bad=structuredClone(p);change(bad);invalid.push([()=>new Response(raw(bad)),hint]);
  }
  for(const [fn,hint] of invalid){reply=fn;await e.app.loadPrivatePack();assert.match(e.node("pack-status").textContent,hint);assert.equal(e.app.activePack,original);assert.equal(e.st.getItem(cacheKey),cache);assert.equal(e.st.getItem(progressKey),progress);}
  reply=()=>new Response(raw(p));e.st.fail=k=>k===cacheKey;await e.app.loadPrivatePack();assert.match(e.node("pack-status").textContent,/未保存/);assert.equal(e.app.activePack,original);
});

test("256 KiB UTF-8 pack parses and downloads; actual stream size wins over absent or low Content-Length", async () => {
  const maximum = packAtBytes(262144);
  const tooLarge = packAtBytes(262145);
  const streamResponse = (pack, headers = {}) => {
    const bytes = Buffer.from(raw(pack));
    const unicode = bytes.indexOf(Buffer.from("語"));
    return new Response(new ReadableStream({ start(controller) {
      controller.enqueue(bytes.subarray(0, unicode + 1));
      controller.enqueue(bytes.subarray(unicode + 1));
      controller.close();
    } }), { headers });
  };
  const e = await boot(seeded(), "test-child", network(() => streamResponse(maximum)));
  await flush();
  assert.equal(e.window.StudyPrivatePack.MAX_BYTES, 262144);
  assert.equal(e.app.activePack.questions.length, 6);
  assert.equal(Buffer.byteLength(e.st.getItem(cacheKey)), 262144);
  assert.equal(e.window.StudyPrivatePack.parse(raw(maximum)).questions.length, 6);
  assert.throws(() => e.window.StudyPrivatePack.parse(raw(tooLarge)), /256 KiB/);

  for (const headers of [{}, { "Content-Length": "1" }]) {
    const st = seeded(syntheticPack());
    const before = st.getItem(cacheKey);
    const loaded = await boot(st, "test-child", network(() => streamResponse(tooLarge, headers)));
    await flush();
    assert.match(loaded.node("pack-status").textContent, /256 KiB/);
    assert.equal(st.getItem(cacheKey), before);
    assert.equal(loaded.app.activePack.questions.length, 6);
  }
});
test("timeout includes stalled body; retry can supersede an old response without overwriting new cache", async () => {
  const timers=[]; let resolve;
  let reply=()=>new Response(new ReadableStream({start(){}}));
  const net=network(()=>reply());
  const e=await boot(seeded(syntheticPack()),"test-child",{...net,setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;}});
  await flush(); timers.findLast(t=>t.ms===8000).fn();await flush();
  assert.match(e.node("pack-status").textContent,/逾時/);assert.equal(e.app.activePack.revision,1);
  reply=()=>new Promise(r=>resolve=r);const old=e.app.loadPrivatePack();
  const p=syntheticPack();p.revision=2;reply=()=>new Response(raw(p));await e.app.loadPrivatePack();
  resolve(new Response(raw()));await old;
  assert.equal(e.app.activePack.revision,2);
});

test("production Worker.fetch behind real client: cached reload failure and public progress remain unchanged", async () => {
  const KV=kvStub({[contentKey]:{value:raw()}});
  let failed=false;
  const ports={fetch:(url,init)=>{
    if(failed && url.includes("/packs/")) return Promise.resolve(new Response("",{status:503}));
    return worker.fetch(new Request(url,init),{TOKEN:"test-token",KV});
  }};
  let e=await boot(seeded(),"test-child",ports);await flush();
  const q=e.app.map.values().next().value;
  e.app.State.addMastered(q.unit,q.id);
  e.app.State.setStudyTerm("g4-s1"); e.app.State.setSubject("math");e.app.State.addMastered(15,ids[0]);
  const previous=plain(e.app.state),cache=e.st.getItem(cacheKey);
  failed=true;e=await boot(e.st,"test-child",ports);await flush();
  assert.equal(e.st.getItem(cacheKey),cache);assert.equal(e.app.activePack.questions.length,6);
  assert.deepEqual(plain(e.app.state),previous);assert.match(e.node("pack-status").textContent,/服務異常/);
  const status=await worker.fetch(request("GET","test-token","https://sync.test/v1/status"),{TOKEN:"test-token",KV});
  assert.deepEqual(await status.json(),{keys:[]});assert.equal(await KV.get(contentKey),raw());
});

test("deferred response is rechecked against latest persisted revision; corrupt cache and interrupted UTF-8 are retained", async () => {
  let reply=()=>new Response(raw());const net=network(()=>reply());
  const e=await boot(seeded(syntheticPack()),"test-child",net);await flush();
  e.app.State.setStudyTerm("g4-s1"); e.app.State.setSubject("math");e.app.startQuiz("full",15);
  const p=syntheticPack();p.revision=2;reply=()=>new Response(raw(p));await e.app.loadPrivatePack();
  const newer=syntheticPack();newer.revision=3;e.st.map.set(cacheKey,raw(newer));
  e.window._goHome();assert.equal(e.app.activePack.revision,1);assert.equal(JSON.parse(e.st.getItem(cacheKey)).revision,3);
  assert.match(e.node("page-home").innerHTML,/較舊/);
  e.st.map.set(cacheKey,"broken");await e.app.loadPrivatePack();assert.equal(e.st.getItem(cacheKey),"broken");assert.equal(e.app.activePack.revision,1);
  assert.match(e.node("pack-status").textContent,/本機題包已損毀/);
  reply=()=>new Response(new Uint8Array([0xff]));await e.app.loadPrivatePack();assert.match(e.node("pack-status").textContent,/UTF-8/);
  reply=()=>new Response(new ReadableStream({start(c){c.error(Error("secret upstream detail"));}}));
  await e.app.loadPrivatePack();assert.match(e.node("pack-status").textContent,/讀取題包中斷/);assert.ok(!e.node("pack-status").textContent.includes("secret upstream"));
});

test("background completion updates practice area without replacing parent forms or restore confirmation", async () => {
  let resolve;const waiting=new Promise(r=>resolve=r);
  const e=await boot(seeded(),"test-child",network(()=>waiting));
  e.node("page-home").innerHTML="parent-form-and-restore-confirmation";
  e.node("sync-token-input").value="unfinished-edit";
  e.node("backup-io").innerHTML="restore-confirmation";
  resolve(new Response(raw()));await flush();
  assert.equal(e.node("page-home").innerHTML,"parent-form-and-restore-confirmation");
  assert.equal(e.node("sync-token-input").value,"unfinished-edit");
  assert.equal(e.node("backup-io").innerHTML,"restore-confirmation");
  assert.equal(e.app.activePack.questions.length,6);
  assert.match(e.node("pack-status").textContent,/題包已保存/);
});

for (const count of [1, 6]) {
  test(`restored progress with ${count} private flags and no cache: auto-load exposes restore controls without replacing parent forms`, async () => {
    const st = storage();
    const net = network();
    let e = await boot(st, "test-child", net);
    const publicQuestion = [...e.app.map.values()].find(q => q.unit === 5);
    const restored = {
      ...plain(e.app.state), studyTerm: "g4-s1", subject: "math",
      mastered: { 5: [publicQuestion.id] },
      challenge: { 5: { batch: [publicQuestion.id] }, 15: { batch: ids } },
      stats: { [publicQuestion.id]: { practiced: 2, correct: 1 } },
      flagged: [
        { questionId: publicQuestion.id, unit: 5, flaggedAt: 1 },
        ...ids.slice(0, count).map(questionId => ({ questionId, unit: 15, flaggedAt: 2 })),
      ],
    };
    await e.app.wiring.commitImport("test-child", restored);
    const siblingKey = "study:progress:test-other";
    st.map.set(siblingKey, JSON.stringify({ schemaVersion: 1, mastered: { 15: [ids[5]] } }));
    const siblingBefore = st.getItem(siblingKey);
    e = await boot(st, "test-child", net);
    assert.equal(e.app.activePack, null);
    assert.equal(e.app.State.getFlagged().length, 0);
    assert.ok(!e.node("page-home").innerHTML.includes("全部還原"));
    const before = st.getItem(progressKey);
    e.window._startFull(15);
    assert.equal(st.getItem(progressKey), before);

    // The parent DOM must survive the automatic refresh, including restore UI.
    const parentHtml = e.node("page-home").innerHTML;
    e.node("backup-io").innerHTML = "existing restore confirmation";
    e.node("import-text").value = "unfinished restore draft";
    e.node("sync-token-input").value = "test-token";
    e.window._saveSyncToken();
    await flush();
    assert.equal(e.app.activePack.questions.length, 6);
    assert.equal(e.node("page-home").innerHTML, parentHtml);
    assert.equal(e.node("backup-io").innerHTML, "existing restore confirmation");
    assert.equal(e.node("import-text").value, "unfinished restore draft");
    const flaggedHtml = e.node("study-flagged-content").innerHTML;
    assert.match(flaggedHtml, new RegExp(`已回報題目（${count}）`));
    assert.match(flaggedHtml, /全部還原/);
    for (const id of ids.slice(0, count)) assert.ok(flaggedHtml.includes(`window._unflag('${id}')`));
    if (count === 6) assert.match(e.node("study-home-content").innerHTML, /目前沒有可練習的題目/);

    if (count === 1) e.window._unflag(ids[0]);
    else e.window._unflagAll();
    assert.equal(e.app.State.getFlagged().length, 0);
    assert.match(e.node("page-home").innerHTML, /全部練習/);
    e.window._startFull(15);
    assert.equal(e.app.quiz.queue.length, 6);
    assert.deepEqual(plain(e.app.state.mastered[5]), restored.mastered[5]);
    assert.deepEqual(plain(e.app.state.challenge[5]), restored.challenge[5]);
    assert.deepEqual(plain(e.app.state.stats[publicQuestion.id]), restored.stats[publicQuestion.id]);
    assert.deepEqual(plain(e.app.state.flagged), [restored.flagged[0]]);
    assert.equal(st.getItem(siblingKey), siblingBefore);
  });
}
