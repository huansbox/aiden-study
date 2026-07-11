// 契約測試共用 case 矩陣：同一份情境同時餵 client（decideSync）與 server（worker handler），
// 斷言兩端判定一致且收斂。只收兩端皆有判定的同步決策情境；
// OPTIONS／CORS／錯 origin 等 server 單邊行為歸 tests/test_sync_worker.mjs。

export const CONTRACT_CASES = [
  {
    name: "初次播種：雲端合法空、本地有舊資料",
    server: null,
    client: { syncedRev: 0, dirty: true, data: { mastered: ["q1", "q2"] }, schemaVersion: 1 },
    expect: { firstAction: "push", finalServerRev: 1, converged: true },
  },
  {
    name: "兩邊皆空：無事可做",
    server: null,
    client: { syncedRev: 0, dirty: false, data: null, schemaVersion: 1 },
    expect: { firstAction: "none", finalServerRev: 0, converged: true },
  },
  {
    name: "正常上傳：本地有新變更、rev 對齊",
    server: { rev: 2, data: { mastered: ["q1"] }, writeId: "w0" },
    client: { syncedRev: 2, dirty: true, data: { mastered: ["q1", "q2"] }, schemaVersion: 1 },
    expect: { firstAction: "push", finalServerRev: 3, converged: true },
  },
  {
    name: "取遠端：雲端較新、本地無變更",
    server: { rev: 5, data: { mastered: ["q1", "q2", "q3"] }, writeId: "w0" },
    client: { syncedRev: 3, dirty: false, data: { mastered: ["q1"] }, schemaVersion: 1 },
    expect: { firstAction: "adopt", finalServerRev: 5, converged: true },
  },
  {
    name: "衝突 LWW：已刪資料不得復活（裝置 A 清了錯題、裝置 B 帶舊資料衝突）",
    server: { rev: 4, data: { errorBank: [], mastered: ["q1"] }, writeId: "w0" },
    client: {
      syncedRev: 3,
      dirty: true,
      data: { errorBank: [{ questionId: "q9" }], mastered: ["q1"] },
      schemaVersion: 1,
    },
    expect: {
      firstAction: "conflict-adopt",
      finalServerRev: 4,
      converged: true,
      finalDataLacksErrorBankEntry: "q9",
    },
  },
  {
    name: "PUT 競態被拒後收斂：GET 後另一裝置先寫入",
    server: { rev: 3, data: { mastered: ["q1"] }, writeId: "w0" },
    client: { syncedRev: 3, dirty: true, data: { mastered: ["q1", "qB"] }, schemaVersion: 1 },
    raceWriteBeforePut: { data: { mastered: ["q1", "qA"] } },
    expect: { firstAction: "push", putRejected: true, finalServerRev: 4, converged: true },
  },
  {
    name: "response 遺失重送：同 writeId 冪等、rev 不重複遞增",
    server: { rev: 2, data: { mastered: ["q1"] }, writeId: "w0" },
    client: { syncedRev: 2, dirty: true, data: { mastered: ["q1", "q2"] }, schemaVersion: 1 },
    replayPut: true,
    expect: { firstAction: "push", finalServerRev: 3, converged: true },
  },
  {
    name: "手動匯入後立即上雲：他端 pull 得到",
    server: { rev: 1, data: { mastered: ["q1"] }, writeId: "w0" },
    client: { syncedRev: 1, dirty: true, data: { mastered: ["imported-1", "imported-2"] }, schemaVersion: 1 },
    secondClientPull: true,
    expect: { firstAction: "push", finalServerRev: 2, converged: true },
  },
  {
    name: "雲端壞資料：絕不視為空而 push",
    serverRaw: "{{{not json",
    client: { syncedRev: 0, dirty: true, data: { mastered: ["q1"] }, schemaVersion: 1 },
    expect: { firstAction: "data-error", serverUnchanged: true },
  },
  {
    name: "token 錯：auth-error（非離線），不 push",
    server: { rev: 2, data: { mastered: ["q1"] }, writeId: "w0" },
    client: { syncedRev: 2, dirty: true, data: { mastered: ["q1", "q2"] }, schemaVersion: 1 },
    wrongToken: true,
    expect: { firstAction: "auth-error", finalServerRev: 2, serverUnchanged: true },
  },
  {
    name: "schemaVersion 比 app 新：拒讀拒 push 保本地",
    server: { rev: 3, data: { schemaVersion: 9, mastered: ["q1"] }, writeId: "w0" },
    client: { syncedRev: 1, dirty: true, data: { schemaVersion: 1, mastered: ["local"] }, schemaVersion: 1 },
    expect: { firstAction: "schema-block", finalServerRev: 3, serverUnchanged: true, clientKeepsLocal: true },
  },
  {
    name: "遠端 rev 落後（KV 舊讀）：本輪不動作",
    server: { rev: 2, data: { mastered: ["q1"] }, writeId: "w0" },
    client: { syncedRev: 3, dirty: true, data: { mastered: ["q1", "q2"] }, schemaVersion: 1 },
    expect: { firstAction: "retry", finalServerRev: 2, serverUnchanged: true, clientKeepsLocal: true },
  },
];
