// Local synthetic exercise: unit 16 has exactly two multiple-choice questions.
import { syntheticPack } from "./synthetic-study-pack.mjs";
export async function bonusFixture({url,res,runtime}) {
  if (url.pathname !== "/test/bonus-fixture") return false;
  const C=globalThis.KidsCollectionCore, pack=syntheticPack();
  pack.revision=200;
  for(let n=1;n<=2;n++) {
    const id=`math-g4s1-synthetic-bonus-${n}-v1`;
    pack.questions.push({id,subject:"math",unit:16,type:"multiple_choice",text:`合成加碼第 ${n} 題：哪個數字最大？`,subtopic:"合成加碼",source:"synthetic bonus fixture only",options:["3","8","5","1"],answer:"2"});
    pack.explanations[id]="合成解說：8 最大。";
  }
  await runtime.KV.put("c:study:g4-s1-math-u1",JSON.stringify(pack));
  const state=C.apply(C.empty(),{type:"goals",expectedGoalRevision:0,targets:[{entryId:"study:math",metric:"answered",quantity:2}]});
  await runtime.restoreFixture(state,"aiden");
  res.writeHead(200,{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"});
  res.end(`<!doctype html><meta charset="utf-8"><p>準備合成加碼兩題…</p><script>
    localStorage.clear();sessionStorage.clear();
    const request=indexedDB.deleteDatabase("study-private-catalog");
    request.onsuccess=request.onerror=()=>location.replace("/?k=test-token&child=aiden");
  </script>`);
  return true;
}
