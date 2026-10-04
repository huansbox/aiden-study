# 注音 App：現況與交接

更新：2026-10-04。[#179](https://github.com/huansbox/aiden-study/issues/179) 接入既有家長試玩，驗收／整合／發布狀態以該 issue 最新交接為準。[#167](https://github.com/huansbox/aiden-study/issues/167) 有限重練與低壓配題已完成實作、獨立 review 及隔離 E2E 驗收；整合／CI／發布證據與最新交接以該 issue 及 [PR #171](https://github.com/huansbox/aiden-study/pull/171) 為準。既有 MVP 已交付。

這是注音的維護入口。當前工作以 GitHub issue／PR 追蹤；本頁保留實作及驗收入口與證據索引，不另維護一份待辦清單；長期學習規則正本為 [Wiki：Zhuyin Learning](https://github.com/huansbox/aiden-study/wiki/Zhuyin-Learning)。全 repo 的本次交接見 [HANDOFF](../HANDOFF.md)。

## 家長試玩（#179）

入口為 [既有四上家長試玩](../docs/study/preview.html) 的「注音家長試玩」、家長後台「內容與維護」的「注音試玩」，或 [注音試玩](../docs/zhuyin/?preview=1)。四上入口導覽位於題包 UI 外，家庭題包未連線或載入失敗時仍看得見；注音與公開親錄不需家庭登入。這是原注音 App 的試玩模式，registry 仍只登錄同一作品。

`?preview=1` 在 parser 載入階段排除 device-auth、wiring、sync、family 及 collection scripts；App 的 wiring／family 也保持 null，初始化與保存不接正式 storage。即使帶 child／k／parent 參數或既有家庭 cookie，試玩只用頁面內的合成進度；重設、重載、切背景都不會觸碰孩子進度、累計、任務或收藏。**`?parent=1` 仍是正式維護模式，不能拿來隔離試玩。**

首頁可選混合／認符號／拼音節，以及全新／已學／要加強起點；預設已學可直接作答。全新起點保持正式符號入池規則，先認符號才能拼音節；要加強提供合成弱項與一張新音節，沿用配題配額。每次作答、固定選項、有限重練、完整錯誤示範與親錄播放都走正式頁面原有函式，沒有第二套模擬學習流程。常駐標示、返回入口及重新開始只操作本次試玩；音檔檢查期間切換起點，也會在就緒時採用最新選擇。

自動驗證入口為 [test_zhuyin_preview.mjs](../tests/test_zhuyin_preview.mjs)：執行整份 inline 啟動與 App scripts，讓 storage／cookie／正式 adapter 任何存取立即失敗，核對公開內容／音檔請求、合成配額、首次錯→一次重練→錯誤示範、重設／重載與初始化 race；另以正式 adapter 驗證原有存檔、同步 dirty、身分拒開與批末掛載。瀏覽器合成哨兵 E2E、獨立 review、完整 gate 與正式發布證據集中在 [#179](https://github.com/huansbox/aiden-study/issues/179)，未完成的步驟不以本文件推定通過。

## #167 實作與驗收入口

本輪限定 `docs/zhuyin/`、注音測試與維護文件；不修改 study／spelling／shared／worker，也不新增符號、音檔或家長試玩功能。沿用 schemaVersion 1、既有進度與已接受親錄。

- 原批至多 5 張不同卡：弱項至多 2 張、新卡至多 1 張，其餘熟悉卡；不足就縮短。弱項以既有 `practiced` 次數由少到多抽，持續答錯仍會輪到其餘卡，存檔重載也保留此依據。
- 每張卡同批至多首次加一次批尾重練。首次錯誤仍在當題淘汰錯項直到完成；重練任何一步錯，立即記一次錯誤、顯示完整正確符號／拼法並播親錄，播完換題。示範不算第三次或獨立答對；播放拒絕、缺音或卡住也能結束。
- 組字每次出題只抽一次共同選項，必含聲符與韻符正解；同次聲韻步、答錯與重聽保持排列。下次出同卡重新抽，若恰巧和上次相同且有至少兩項，就輪轉一次。聲調仍固定 1～4 聲。
- 原批 dots 固定不增長；原題進度與批尾「再練一次」分開呈現。第一次錯後重練答對保留本批 `wrong`，下一批獨立答對才清除。任務／徽章／獎勵仍只在批末。
- 全新進度先在混合／認符號模式每批介紹一張，聲韻都進場後才有音節卡；「只拼音節」仍沿用此入池前提，不跳過符號介紹。

本輪注音測試 63 項、全 repo Node 812 項通過；Python 274 項通過、4 項依既有條件略過，catalog `--check` 與 CI 通過。獨立 code review 與隔離 browser E2E 均無 finding；整合與發布證據見 [#167](https://github.com/huansbox/aiden-study/issues/167)／[PR #171](https://github.com/huansbox/aiden-study/pull/171)。

E2E 在本機測試服務、測試身分及記憶體 KV 實際驗證 listen／build／all、全新至音節的學習路徑、配額與弱項輪替、最多兩次、固定原批進度、重練全對仍保留本批錯誤、符號與組字三步的完整錯誤示範、連點單次結果及批末獎勵／下批收起。14 段親錄均觀察到實際 `playing`／`ended`；重播取消舊鏈、HTTP 404 造成 media error 4 時仍能結束並保留正確結果。這是隔離桌面瀏覽器驗證，**不等於 iPad 真機或人耳重新驗聽**；既有 iPad checklist 豁免與親錄接受決定保持有效。

## 已交付範圍

- 最小可用 MVP：ㄅ、ㄇ、ㄚ三個符號；ㄅㄚ／ㄇㄚ四聲；爸爸、媽媽、馬的真實詞連結。包含聽音辨認、首次示範、聽音組字、批末獎勵及家長維護區。
- 正式音檔 14/14 已採用使用者接受的 MacBook Pro 親錄版本，並完成發布；TTS 候選未採用。不是仍在等錄音，也不代表完整 v1 PRD 的全部功能都已完成。
- 聲符與韻符上下排列；ˊ、ˇ、ˋ 放大並調整位置。示範依實際音檔播放，依序凸顯聲符、韻符、聲調；一聲留白，以整組符號凸顯。重播與換題會取消舊播放，錯誤選項試聽不洩漏正解。
- 作答即時存檔，任務完成、徽章與成就提示留到整批結束；回到下一批時收掉上一批提示。平台共通規範見 [AGENTS.md](../AGENTS.md#練習不中斷)。
- 原有學習進度支援本機保存與雲端同步；首頁累計另有重置世代，避免舊快取、離線補送與延遲回應把重置前的數字加回來。

## 追蹤與發布證據

| 工作 | 狀態與來源 |
| --- | --- |
| 有限重練與低壓配題 | [#167](https://github.com/huansbox/aiden-study/issues/167)；本輪實作／驗收／發布追蹤入口。 |
| MVP 規劃 | [#15](https://github.com/huansbox/aiden-study/issues/15) 已結案；子票 #16–#20 全數結案。閱讀 issue 頂端的目前狀態，早期 PRD 與 comments 是歷史決策。 |
| 親錄音檔與 MVP 收尾 | [#20](https://github.com/huansbox/aiden-study/issues/20)、[收尾與發布紀錄](zhuyin-mvp-ipad-checklist.md)、[音檔來源與接受紀錄](zhuyin-parent-audio/README.md)；實作 `87b76aa`。 |
| 直排與批末獎勵 | [commit 72f1603](https://github.com/huansbox/aiden-study/commit/72f16039c02f2159c8217c44d276196a20850172)，已合併並部署。 |
| 聲調放大與播放凸顯 | [commit b368a13](https://github.com/huansbox/aiden-study/commit/b368a13d622d42519f81c3c091bec0c0bf38a73e)，已合併並部署；使用者回覆「ok 了」。 |
| 累計重置保護 | [PR #74](https://github.com/huansbox/aiden-study/pull/74)，主線 `5a2f71c`；[操作說明](activity-reset.md)。 |

聲調版 [CI](https://github.com/huansbox/aiden-study/actions/runs/35201079064) 與 [Pages](https://github.com/huansbox/aiden-study/actions/runs/35201078803) 成功。重置版 [CI](https://github.com/huansbox/aiden-study/actions/runs/35207192800) 成功；後續文件更新接續發布，含本次程式的 [Pages](https://github.com/huansbox/aiden-study/actions/runs/35207500217) 成功，正式 11 個相關資源與已合併版本相符。同步 Worker version 為 `abf2edcc-b5bc-4abc-ae36-b09d98cbf7d5`。

## 今天的進度重置

已按使用者指定範圍完成注音學習進度與首頁累計重置，並核對雲端讀回、正式頁面的未學狀態、時間／題數／任務及成就歸零。這是一次已完成的管理操作，不是之後可以例行清除資料的授權。

含個別資料的備份、讀回與操作證據只保留在操作機的 `.scratch/`，不提交到 Git 或公開 tracker。跨機接手不依賴這些私有檔案；一般維護先讀 [重置機制](activity-reset.md)，需要再次重置時取得使用者明確指定範圍並讀取當時的新值，不能沿用今天的備份重放。

## 接手前保留的決定

- 繼續使用已接受的親錄；不要因歷史 PRD／comments 的待辦文字，重新要求錄音或改回 TTS。
- 使用者已免除逐項 iPad checklist。未執行項目不得冒充通過，也不重新作為收尾門檻。
- 家長維護模式 `?parent=1` 會停用共用累計掛載，但仍使用真實 App 學習存檔及同步，**不是隔離試玩模式**。開發驗證使用 `tests/helpers/serve-family.mjs` 的本機測試服務、測試憑證與記憶體 KV，不在正式孩子資料上作答。
- 家長試玩接入與隔離範圍見上方 #179；擴充其餘注音符號、親子評分與更多學習圈仍屬未啟動方向，不是本輪漏做的驗收項。
- 首頁安排由獨立家長後台控制；Safari 與 iPad 主畫面入口各自取得設定與同步。已安裝圖示不需因今天的更新重裝。

## 程式與驗證入口

| 位置 | 用途 |
| --- | --- |
| [docs/zhuyin/index.html](../docs/zhuyin/index.html) | 畫面、出題、播放凸顯、學習存檔與批末流程 |
| [音檔目錄](../docs/zhuyin/assets/audio/) | 正式親錄資產；來源與重建方法見上方親錄交付文件 |
| [sync-v1.js](../docs/shared/sync-v1.js)／[wiring-v1.js](../docs/shared/wiring-v1.js) | App 原有進度同步與孩子身分接線 |
| [family-client.js](../docs/shared/family-client.js)／[worker/family.mjs](../worker/family.mjs) | 首頁累計、任務與重置世代 |
| [test_zhuyin_core.mjs](../tests/test_zhuyin_core.mjs)／[test_zhuyin_practice.mjs](../tests/test_zhuyin_practice.mjs) | 配題、有限重練、共同選項、示範記分與固定批進度 |
| [test_zhuyin_voice.mjs](../tests/test_zhuyin_voice.mjs) | 播放順序、取消、失敗恢復與凸顯時機 |
| [test_family_client.mjs](../tests/test_family_client.mjs)／[test_family.mjs](../tests/test_family.mjs) | 批末獎勵、重置、離線／延遲回傳與跨孩子隔離 |

本日最後一輪程式驗證為 Node 415 項通過，pytest 183 項通過、1 項略過（工作目錄沒有原卷檔案）。聲調在隔離本機瀏覽器驗證；重置在正式桌面瀏覽器核對，只查看資料，沒有重新作答製造學習成果。上述不等同於 iPad 真機全項驗收，測試數量也不是永久固定值。

## 下次從哪裡開始

接續家長試玩先讀 [#179](https://github.com/huansbox/aiden-study/issues/179) 最新交接 comment；有限重練規則仍回查 [#167](https://github.com/huansbox/aiden-study/issues/167)，再核對實際 branch／HEAD 與驗收狀態。其他新需求先讀本頁、[Wiki](https://github.com/huansbox/aiden-study/wiki/Zhuyin-Learning) 及 #15 已確認 MVP 範圍，再以 `/grill-me` 對齊並另開 issue；不要重開已完成的 MVP，或把歷史建議當成已授權待辦。
