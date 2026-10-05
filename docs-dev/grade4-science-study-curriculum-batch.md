# 四上自然教材判準補題（#178）

本批依已核定的[國小教材判準重判](grade4-science-ambiguity-audit.md)，把既有四卷 backlog 的 **18 個原卷作答格**轉入 **10 個新增活動**。15 格保留合理年級情境，3 格採已核定的最小修正。實際作者稿已完成獨立核答與 root 內容核准，正式 rev17 候選建置完成；本批狀態為 **ready_not_published**，現役仍是 rev16。沒有新增原卷或校方答案。

最新逐活動狀態見 [curriculum selection](../data/study/g4-s1-science-exam1/curriculum-selection-metadata.json)，四卷剩餘狀態見 [curriculum backlog](../data/study/g4-s1-science-exam1/curriculum-backlog-metadata.json)。先前 ambiguity／curriculum review、material／volume selection 與 backlog 都保留當時快照。

## 活動與原格

| 來源 | 新增活動 | 原卷作答格 | 呈現 |
| --- | ---: | ---: | --- |
| 桃子腳 113 第 4 題(4)(6)、第 13 題(1)～(7)、第 14 題(3) | 4 | 10 | 三個是非與完整七格題組 |
| 桃子腳 114 第 1 題(5)、第 3 題(7) | 2 | 2 | 兩個是非 |
| 永安 113 II-2、II-6、II-13、VI-1(4)～(6) | 4 | 6 | 三個四選一與三格題組 |
| 合計 | 10 | 18 | 五個是非、三個單選、兩個題組 |

桃子腳第 13 題保留全部七格與共同選項，每次呈現一格，整組才計一個活動。永安 VI-1 既有(1)～(3)的三個活動、stable IDs 與內容保持；本批只將尚未收錄的(4)～(6)合成一個三格活動。原六格沒有其他相依圖文，完整共同指示保留；全庫合計覆蓋六格，新活動本身只含三格。

三格最小修正限原定位 `tyk113-13-03`、`tyk114-01-05`、`supp-yap-113-midterm-VI-1-5`。公開只記原卷定位、概念、處置與數量，原題、答案、改編文字與孩子解說皆留在私人來源。桃子腳 113 原校答仍有來源證據；改編後的題組鍵由獨立核答決定，不冒稱原校答支持新版全部鍵。未取得 115 教材逐頁答案，也不把教學推定標成本年逐字證明。

## 基線與再製

ignored 工作根為 `data/private/study/g4-s1-math-u1/science-curriculum-batch/`。完整 rev16 基線由 canonical `rev16-release/private/rev16-candidate/` 精確複製，共15檔，包含完整 source、curated、explanations、mapping、manifest 與八份 shard；逐檔 bytes 相同。

| 固定基線 | bytes | SHA256 |
| --- | ---: | --- |
| rev16 完整 source | 543,409 | `c8e3200f75bc0768345b61cee6a32c6e2d49e3c7b653d02b25e33e2e5b263daf` |
| rev16 manifest | 23,414 | `6db58001ae845a241fbe17116a5a2922c5febe7e3b7d275b3e3245f1a5c75766` |

本批沿用 production `scripts/build_private_study_pack.py` 的 curated／explanations／mapping 入口與完整 `--previous`。私人 `delivery/build_rev17.py` 只負責組合本批資料、核對核准指紋和保留舊內容；不新增 runtime、schema 或發布框架。正式候選在 `rev17-candidate/`，未核稿使用另名 `delivery/draft-unreviewed/`，不得作發布來源。

rev17 正式候選為全包 **270 活動**（數學68／自然178／社會24），自然 **242 原卷作答格**。舊260題、260份解說及curated／mapping列逐值保留；仍使用原七個自然主題。八份 shard 中僅 unit20／21 改變，其餘六份逐 byte 沿用。unit21 實際259,044 bytes，可留在單一 shard；沒有硬拆或塞入其他單元。

| rev17 正式候選 | bytes | SHA256 |
| --- | ---: | --- |
| 完整 source | 551,461 | `5d8c47335d1914da543aafab1b7263f3cad37b13dc2b3e6d450e14728813cb99` |
| manifest | 24,271 | `f82a7201e54b1852f5035ad2b8fe66b422fa65ca9870ad4472244068c60623e2` |
| unit20 shard | 128,580 | `99e03990f330105fae5ef71eb0d4de56c477368f532a115088ec3002c275c29d` |
| unit21 shard | 259,044 | `f81718c489df93448c37c01868384a86a22427258da4b87ca5c32714fdad0320` |

初稿七格題組解說超過既有140字／5句守衛，只精簡該解說至90字／4句。題文、答案、ID、其他解說與逐格QA均保持；原稿和原freeze保存在私人 `author/revisions/v1/`，新的獨立 review 與內容批准綁定v2。核准以實際作者稿、QA及review SHA256為準，未放寬production validator。

## 驗證與發布界線

正式基線唯讀核對於 2026-10-05 完成：manifest rev16／260活動與上表相符；legacy rev12／132活動／229,503 bytes，SHA256 `2e2c94e743c8eb31d9d658b1177a7ebf87c27429aa468fdc611fb3cf136f3d2f`；Worker `808dccba-a4d0-4b4a-afa4-5b6c8789c990` 維持100%。收據位於私人 `ops/baseline-readback/`。

隔離驗證使用 loopback、fake identity、合成進度與 production renderer。10個全新活動在 768×1024／1024×768 共20次核對完整題文、選項與全部解說；兩題組共16次下一小題切換保持scrollY，每次一小題，無橫向溢出。6種代表孩子流程覆蓋錯答、reload接續、答對、回合結束與下一批，舊數學／自然進度哨兵保持；家長試玩沒有改寫合成孩子資料。Node823項、Python278項通過（另1項既有跳過），Study targeted50項通過。桌面 Chromium 的 iPad 尺寸驗證不代表實體 iPad Safari 驗收。

draft 原始證據維持 `delivery/e2e/draft-unreviewed/` 身分，正式候選另跑完整流程，保存於 `delivery/e2e/rev17/`；不把draft報告複製成正式內容已受測的證據。截圖目視核對與報告指紋集中在私人 `delivery/validation-summary.json`。

發布仍由 root 在新作者稿獨立覆核、正式建置與行為／目視證據完成後核准；新 immutable shards 先逐份 immediate／傳播後讀回，最後才前向更新 manifest，再兩階段讀回。legacy、舊 shard、Worker 與孩子進度保持原契約。本頁不代表遠端寫入已完成。

四卷 backlog 的97格 future、23格範圍待確認及既有3格排除保持。正式考試範圍、其他原卷收集、地表操縱變因與實測結果表缺口仍另行追蹤；本批增加練習量，不宣稱全部能力已補齊。
