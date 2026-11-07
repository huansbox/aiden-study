# 四上社會 U3 跨校追加（#254）

追蹤 [#254](https://github.com/huansbox/aiden-study/issues/254)。本批核准 **15 個完整活動／19 個原作答格**，已由完整 rev24 追加為 rev25：全科 939 活動（數學 369／自然 322／社會 248）、44 分片；社會 U3（unit 31）由 11 增至 26 活動。核准投影、舊題保護及隔離真包三尺寸全題測試已通過；正式發布與雙副本獨立還原仍由本 Issue 後續 checkpoint 確認，不以候選或本機 QA 冒稱上線。校方正式考試範圍仍未取得。

## 來源與保留

本批依康軒四上 U3「家鄉的傳統信仰與老街」選取同概念不同問法，保留完整題幹、共同文章、全部小題、原選項及次序，不抽代表、不拆題組湊活動數。

| 來源 | 新活動 | 新原格 |
| --- | ---: | ---: |
| 大墩 112 期末 | 14 | 16 |
| 明義 110 期中 | 1 | 3 |
| 合計 | 15 | 19 |

兩卷共盤點 108 原格，本批採用 19 格、保留 89 格；保留包含本批範圍外、未完整支援或來源條件不足，不代表全數都是錯題。信仰與生活新增 10 活動、老街與生活新增 5 活動；題型為是非 7、單選 6、完整題組 2。三年級舊題、其他單元與既有來源 backlog 不在本批改動範圍。

以下疑義保持 hold，不用猜測出題者意圖補唯一答案：

- 大墩一組街屋圖要求填圖中代號，但原圖沒有代號；完整題組保留，不自行加標籤或只拆出末尾可解小題。
- 大墩老街組合題的一項敘述不足以獨立證明，不能只憑選項組合排除後宣稱每項都正確。
- 明義騎樓氣候題的高溫與多雨都有合理理由。作者 v1 原有此題，統籌核定 v2 移出，其他 15 活動的題目、來源 mapping 與解說逐值不變。

兩卷均未取得同版官方答案。作者解題、乾淨 source-first 獨立解題與內容對帳分開保存；採用題使用 `independently_solved_twice_no_official_answer`，`answerPage=null`，不把一般教材慣例冒稱校方標答。解說逐題通過內容審查及既有格式 gate（5–140 字、1–5 句、有句尾標點）。

## 整合契約

沿用 [後半冊接入契約](study-final-contract.md)，沒有新增 runtime 題型或放寬 validator。大墩文章題的三小題各有獨立選項；明義三格配合題共享完整 a／b／c 選項庫。兩組都是完整活動，各格填齊才整組提交。

精確基線為已發布 rev24 的完整 authoring、source、manifest 與 43 個 raw shards，不能退回舊版或只載入 delta。使用正式 Python builder 建完整 source，再呼叫 `appendCatalog()` 保留舊 43 descriptors 為 prefix 與全部 raw bytes，只追加一片。原 924 活動逐 ID 的題目、答案、stable ID、來源、解說全部保持。

| 產物 | SHA256 |
| --- | --- |
| 核准 candidate-v2 freeze | `9e3799100fc12f74affe3dddbf1fc56401b2a2967a6bd731bd71ae367be678f9` |
| Root approved ledger | `c532f570c0a87e55de524aa1c95b21eb52ce69baa6bb7ae154f0dcc718b72893` |
| rev25 完整 source | `e2037389afac789851c3c1ceca943870c9cdc7cc3ffd2d3c6385d4d4d04950a1` |
| rev25 catalog manifest | `f9ce154c902a91e4875f9729870c103a6349d3db47caac2cb3e669169808f419` |

Legacy 單包固定 rev12，不寫入全量 authoring；本批不修改家庭設定，也不讀正式孩子進度作測試。

## 驗證與重建入口

真 Worker 搭配隔離記憶體 KV／DO、合成家庭與進度，以 Chromium 的 768×1024、1024×768、375×812 三種尺寸，完整操作全部 15 新活動／19 格：孩子端與 preview 都逐題 wrong→correct；題組切換、重選、原選項、正答解說與 44px 命中區均檢查。另確認：

- 同 browser、不清 IndexedDB，rev24 升至 rev25 後 unit31 精確載入全部 26 IDs；新分片暫時失敗後重試可恢復。
- 舊 unit31 與另一舊單元的 mastered、stats、errorBank、flagged 保持；升版前後既有未完批次保持，作答後重載能接續 queue 與統計。
- 舊、新活動同批時，提交與看回饋均不顯示獎勵；批末才顯示真正 family 任務完成提示。
- Preview 全部新題與重載前後 KV、localStorage、sessionStorage 相同，mutating requests=0；browser／Worker 外連=0、pageerror=0。

共保存 93 張截圖，另目視核對窄畫面文章題及共享選項 preview。這是 Chromium viewport 驗證，未宣稱實體 iPad Safari 已驗。QA runtime 基線為 `2469387b0a27a9632e789d4161ac19084739998f`；後續公開整合 snapshot 須核對 runtime bytes 相同，若改動 runtime 則補驗受影響行為。

私人根使用 Dropbox 相對路徑 `mywork/aiden-study/grade4-sem1-exam2-social-u3-2026-11-07/`。原卷、題文、答案、oracle、候選、解說及截圖都不進 Git。

| 私用相對入口 | 用途 |
| --- | --- |
| `source-only/`、`source-provenance.json` | 來源原件與無作者答案的獨立核答材料 |
| `candidate-v1/`、`candidate-v2/` | 原候選與移出疑義題後的凍結版本，均不就地覆寫 |
| `reviews/` | source-first oracle、內容對帳及 root 核准 |
| `integration/release-v25-tools/` | 從獨立來源重推 UI 預期、核准投影與 append adapter |
| `integration/approved-v25/` | 939 活動 authoring／source／44 分片與逐步 receipt |
| `integration/approved-v25-e2e/` | 三尺寸全題與進度／獎勵／preview 零寫入證據 |

重建順序為核對 frozen files／dependencies → 從 source-only 與獨立 oracle 重推 15／19 UI 預期 → 核 root ledger → 投影完整三份 authoring → `build_pack` → `appendCatalog` → 比對完整 source／manifest／44 shard bytes。雙副本封存應各自具備完整來源與 rev24 重建依賴，以外部短路徑 temp 各自還原，不可只靠另一副本或作者 worktree。正式發布、最新 snapshot 及還原 receipt 以 #254 最新交接為準。
