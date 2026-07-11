// 同步決策顯式矩陣（純函式、去時鐘）。spec＝issue #26「進度同步」節、票＝#27。
// 衝突（遠端 rev 領先且本地有新變更）＝整包取遠端、棄本地增量（LWW by rev）——
// 本庫進度資料非單調（錯題答對移除、flag、重置），合併會使已刪資料復活。
// 404／壞 payload／HTTP 錯誤絕不可視為空而 push。
//
// local:  { syncedRev, dirty, schemaVersion }
// remote: { kind: "ok"|"network"|"auth"|"http"|"bad-payload", rev?, data?, schemaVersion? }
// 回傳 action.type：
//   none            無事可做
//   push            以 syncedRev 上傳本地（含初次播種：合法空 rev 0）
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

  if (
    remote.data !== null &&
    Number.isFinite(remote.schemaVersion) &&
    Number.isFinite(local.schemaVersion) &&
    remote.schemaVersion > local.schemaVersion
  ) {
    return { type: "schema-block" };
  }

  if (remote.rev === local.syncedRev) {
    return local.dirty ? { type: "push" } : { type: "none" };
  }
  if (remote.rev > local.syncedRev) {
    return local.dirty ? { type: "conflict-adopt" } : { type: "adopt" };
  }
  return { type: "retry" };
}
