// 同步協定的 client 半邊（純函式、去時鐘）：HTTP 回應分類器 classifyRemote＋決策矩陣 decideSync。
// spec＝issue #26「進度同步」節、票＝#27。
// ⚠️ 搬家指示（#28）：本檔＝client 邏輯，暫住 worker/ 供契約測試先行；#28 落地時整段內聯進
//    docs/shared/sync-v1.js 的 sentinel 區塊（如 <sync-pure>），刪除本檔，測試改由 sentinel 抽取——搬家不複製。
//
// client 必守不變量（兩端契約的前提）：
// - writeId＝每次新寫入以 crypto.randomUUID() 新產；僅重送同一筆未確認寫入時重用；每 key 同時至多一筆未決寫入
// - dirty 只能在「讀到 PUT 200」或「adopt 遠端」後清——sendBeacon 讀不到 response，故 beacon 後永不清 dirty
// - 手動匯入／還原＝匯入當下先 GET 定錨（syncedRev＝當下遠端 rev）再標 dirty，下一輪即 push
// - push／reseed 的 PUT 一律以「本輪 GET 到的 remote.rev」為 base rev
//
// 衝突（遠端 rev 領先且本地有新變更）＝整包取遠端、棄本地增量（LWW by rev）——
// 本庫進度資料非單調（錯題答對移除、flag、重置），合併會使已刪資料復活。
// 例外：遠端領先的那筆寫入是自己的（writeId 命中 local.lastWriteId）＝beacon 已送達——
// 遠端即自己較早的快照，疊上去 push 零損失。
// 404／壞 payload／HTTP 錯誤絕不可視為空而 push。

// 把一次 GET 的原始結果分類成 remote 物件（#28 的 client 與契約測試共用同一份真相源）。
// 輸入皆為普通值：threw＝fetch 拋出（真離線）、status＝HTTP 狀態、jsonOk＝回應 JSON 可解析、body＝解析結果。
// 403 不歸 auth：本協定 auth 失敗只發 401；403 只會來自 Cloudflare 邊緣層（WAF 等），
// 誤歸 auth 會讓家長白忙重輸 token。
export function classifyRemote({ threw, status, jsonOk, body }) {
  if (threw) return { kind: "network" };
  if (status === 401) return { kind: "auth" };
  if (status !== 200) return { kind: "http" };
  if (!jsonOk || !body || typeof body !== "object") return { kind: "bad-payload" };
  if (!Number.isInteger(body.rev)) return { kind: "bad-payload" };
  return {
    kind: "ok",
    rev: body.rev,
    data: body.data ?? null,
    schemaVersion: body.data?.schemaVersion,
    writeId: body.writeId,
  };
}

// local:  { syncedRev, dirty, schemaVersion, lastWriteId? }
// remote: classifyRemote 的輸出
// 回傳 action.type：
//   none            無事可做
//   push            以本輪 remote.rev 為 base 上傳本地（含初次播種 rev 0、own-write 疊推）
//   reseed          雲端被清空（rev 0＋data null 但 syncedRev>0）→ 以 rev 0 重新播種；
//                   非靜默：client 應記錄健康事件（雲端資料曾遺失）
//   adopt           取遠端覆蓋本地（本地無新變更）
//   conflict-adopt  衝突：取遠端、棄本地增量
//   offline         真離線，靜默略過
//   auth-error      無 token／token 錯（健康燈顯示，非離線）
//   data-error      HTTP 錯誤或回應不可解析（絕不視為空）
//   schema-block    遠端 schemaVersion 比 app 新：拒讀拒 push 保本地
//   retry           遠端 rev 落後於已同步 rev（KV 最終一致的舊讀），本輪不動作
export function decideSync(local, remote) {
  if (remote.kind === "network") return { type: "offline" };
  if (remote.kind === "auth") return { type: "auth-error" };
  if (remote.kind === "http" || remote.kind === "bad-payload") return { type: "data-error" };

  if (Number.isFinite(remote.schemaVersion) && remote.schemaVersion > local.schemaVersion) {
    return { type: "schema-block" };
  }

  if (remote.rev === 0 && remote.data === null && local.syncedRev > 0) {
    return { type: "reseed" };
  }

  if (remote.rev === local.syncedRev) {
    return local.dirty ? { type: "push" } : { type: "none" };
  }
  if (remote.rev > local.syncedRev) {
    if (!local.dirty) return { type: "adopt" };
    if (remote.writeId && remote.writeId === local.lastWriteId) return { type: "push" };
    return { type: "conflict-adopt" };
  }
  return { type: "retry" };
}
