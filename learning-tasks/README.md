# 家庭學習任務庫

這裡保存場館、旅行、節慶與其他一次性學習活動的可重建成品，以及從實作中得到、可供下一個任務參考的經驗。它是新 session 規劃家庭學習任務時的第一個搜尋入口。

找所有種類的作品，先看 [repo 作品總覽](../README.md#作品總覽)，包含 App 與主線外作品入口。本頁仍是分類與歸檔操作規則的入口；任務名稱、工作狀態、活動日期、對象及來源在 [catalog.json](catalog.json) 登錄一次，再產生本頁索引與白板。目前主線的資料夾不代表其他裝置／工作分支尚未合併的任務不存在。

## 開始新任務

1. 先在下方索引依對象、情境與玩法找相近案例。
2. 閱讀相近任務的 `README.md`、經驗文件與可用素材；只沿用符合本次孩子、場地與時間限制的部分。
3. 判斷新需求是一次性 `task` 還是長期 `app`，不要因為會用到 HTML 或圖片就一律做成 app。
4. 判定為 task 後，立即建立 `learning-tasks/<task>/`，從一開始就把 source、assets 與 output 寫在該處；同時加入 `catalog.json` 並明確標示 `status: "in-progress"`，執行下方重建指令。未登錄的 task 資料夾會使檢查失敗，避免多 session 工作散落或漏登。
5. 任務完成後，在 `catalog.json` 將 `status` 改成 `complete`，補齊活動日期、可用版本與限制，重建索引；使用方式與再製說明仍留在任務 README。
6. 同一原則、模板或素材在第二個不同任務實際重用後，再整理到 `shared/`；第一次出現時先留在原任務，避免過早抽象。

## 任務索引

<!-- task-catalog:start -->

此表由 [catalog.json](catalog.json) 產生，請修改登錄後重建，不直接改表格。主線外來源另標明分支；shared 不列為獨立任務。

| 任務 | 狀態 | 活動日期 | 對象 | 情境與玩法 | 可重用經驗／素材 |
| --- | --- | --- | --- | --- | --- |
| [Native Camp 2026-09-12 Mel](nativecamp-2026-09-12-mel/) | 已完成；題包、OpenAI 語音、獨立審查與隔離 E2E 已完成；發布證據見 #99。 | 2026-09-12 | 兒童英語；家長陪同口說 | 天氣與穿著：takes／uses、wearing、is／are 與不規則複數。 | 完整句題型、明確情境與 OpenAI 預製語音 |
| [Native Camp 2026-09-09 Emi](nativecamp-2026-09-09/) | 已完成；題包、OpenAI 語音、獨立審查與隔離 E2E 已完成；發布證據見 #99。 | 2026-09-09 | 兒童英語；家長陪同口說 | Who／What 問句、完整介紹、人與動物的一天。 | 完整句題型、明確情境與 OpenAI 預製語音 |
| [Native Camp 2026-09-08 Maria](nativecamp-2026-09-08/) | 已完成；題包、OpenAI 語音、獨立審查與隔離 E2E 已完成；發布證據見 #99。 | 2026-09-08 | 兒童英語；家長陪同口說 | 照顧動物、午睡、棲地與故事角色的完整句。 | 完整句題型、明確情境與 OpenAI 預製語音 |
| [Native Camp 2026-09-12 Lena](nativecamp-2026-09-12/) | 已完成；題包、OpenAI 語音、獨立審查與隔離 E2E 已完成；發布證據見 #97。 | 2026-09-12 | 兒童英語；家長陪同口說 | 依實際課堂內容練完整句排列與口說。 | 完整句題型、明確情境與 OpenAI 預製語音 |
| [Native Camp 2026-09-11 Edon](nativecamp-2026-09-11/) | 已完成；題包、OpenAI 語音、獨立審查與隔離 E2E 已完成；發布證據見 #97。 | 2026-09-11 | 兒童英語；家長陪同口說 | 依實際課堂內容練完整句排列與口說。 | 完整句題型、明確情境與 OpenAI 預製語音 |
| [Native Camp 2026-09-10 Anastasia](nativecamp-2026-09-10/) | 已完成；題包、OpenAI 語音、獨立審查與隔離 E2E 已完成；發布證據見 #97。 | 2026-09-10 | 兒童英語；家長陪同口說 | 依實際課堂內容練完整句排列與口說。 | 完整句題型、明確情境與 OpenAI 預製語音 |
| [Native Camp Weekly Review 09-14～09-20](nativecamp-weekly-2026-09-14/) | 已完成；題庫、正式音訊與隔離整合驗收已完成；2026-09-20 開放。 | 2026-09-14～09-20 | 兒童英語；家長陪同口說 | 本週新題與少量較早概念；首次弱項優先。 | 原創完整句題庫、固定選題與預製語音 |
| [Native Camp 2026-09-17 Khalid](nativecamp-2026-09-17/) | 已完成；依任務索引已完成；track 2 只有可讀逐字稿與可播放頁面，沒有下載落檔，不代表全課核對。 | 2026-09-17 | 兒童英語；家長陪同口說 | 來源核對、完整句排列與口說。 | 新版題型與 OpenAI 預製語音 |
| [Native Camp 2026-09-13 Michael](nativecamp-2026-09-13/) | 已完成；內容、正式音訊與隔離整合驗收已完成；不等於全課人耳驗聽或孩子掌握度評分。 | 2026-09-13 | 兒童英語；家長陪同口說 | 來源核對、完整句排列與口說。 | 新版題型與 OpenAI 預製語音 |
| [Native Camp 2026-09-16 Edon](nativecamp-2026-09-16/) | 已完成；題包、接入與驗證完成；新課孩子實測未完成。 | 2026-09-16 | 兒童英語；家長陪同口說 | 來源核對、自主題、口說與跨日複習。 | 沿用首堂 SOP，驗證多課接入與較慢語音 |
| [Native Camp 2026-09-14 Edon](nativecamp-2026-09-14/) | 已完成；題包、接入與驗證完成；新課孩子實測未完成。 | 2026-09-14 | 兒童英語；家長陪同口說 | 來源核對、自主題、口說與跨日複習。 | 沿用首堂 SOP，保留各堂來源與進度 |
| [Native Camp 回放複習試作](nativecamp-review-pilot/) | 已完成；孩子已使用，家長回饋與語音調整需求已記錄。 | 2026-09-16～17 | 兒童英語課程；家長協助 | 紙本口說；另供 App 自主題、口說與跨日複習。 | [分聲道核對與逐字稿誤標](nativecamp-review-pilot/source/evidence-review.md)；[互動版與音訊](../docs-dev/nativecamp-review.md)；[製作 SOP／模板](nativecamp-review-pilot/lesson-sop.md)；私人音檔不進 Git |
| [悠閒午後閱讀心智圖](leisure-afternoon/) | 已完成；已上線，可直接使用；額外驗收依家長決定略過。 | 2026-09-15 | 9 歲；成人可陪讀 | 五枝放射圖、各段重點保留、iPad 選詞。 | 老師回饋、詩景成組、詩與攝影的關係 |
| [四上數學第一份短練習](grade4-math-first-practice/) | 已完成；時間待孩子實測；私用成品不隨 Git 提供。 | 2026-09-12 | 9 歲；四年級 | U1「一億以內的數」15～20 分鐘紙本練習；孩子作答、家長分卷核對。 | 題目來源映射、逐題驗算、孩子／家長分卷格式 |
| [四上第一次段考數學候選卷](grade4-sem1-math-exam1/) | 已完成；依暫定範圍；正式範圍待確認。原卷只存本機。 | 2026-09-12 | 9 歲；四年級 | 桃子腳第一次段考前，依概念與實際範圍篩選歷屆數學卷。 | 來源 manifest、公開原卷無介面下載、PDF 與答案身分驗證 |
| [四上第一次段考自然候選卷](grade4-sem1-science-exam1/) | 進行中；依暫定核心收卷與逐題概念對照；正式範圍待公告，原卷只存本機。 | — | 9 歲；四年級 | 桃子腳第一次段考前，依地表與水生環境概念篩選歷屆自然卷。 | 來源身分、跨年度概念對照與私人原件驗證 |
| [閱讀心智圖選詞引導](reading-mind-map/) | 已完成；老師回饋已記錄；真機操作未另驗。 | 2026-09-08 | 9 歲；成人可陪讀 | iPad 選詞、四角放射心智圖、短詞抄寫。 | 粗體注音、多音字校正、橫向版面；來源與再製見任務 README |
| [新竹動物園小小探險](hsinchu-zoo-adventure/) | 已完成；家長已確認 PDF，保留可重印的歷史素材包。 | 2026-08-14 | 5.5 歲弟弟；一位成人陪同 | 火車地理、園區選路、動物特徵觀察、昆蟲分類；卡片可任意中止。 | [幼兒現場觀察任務卡經驗](hsinchu-zoo-adventure/design-lessons.md)、大 Poker／A4 二分標籤卡來源、圖資與 PDF |
| [怎麼和 AI 一起做出探險卡](https://github.com/huansbox/aiden-study/tree/codex/ai-collaboration-showcase/learning-tasks/ai-collaboration-showcase) | 未標記；網站已發布；來源仍為主線外工作分支，工作狀態回查該分支。 | — | 未指定 | 主線外分支：codex/ai-collaboration-showcase。協作故事網站；不複製或合併其他分支作品。 | — |

<!-- task-catalog:end -->

兩次閱讀任務的共通做法已收錄於 [兒童閱讀心智圖](shared/reading-mind-maps.md)，包含 [每週素材交付格式與更新流程](shared/reading-mind-maps.md#每週交付素材)，以及注音字型、iPad 尺寸、存檔、重建與發布界線。

搜尋建議：`幼兒`、`5～6 歲`、`旅行`、`場館`、`動物`、`觀察卡`、`地圖`、`火車`、`可中止`、`A4 二分標籤`、`大 Poker`。

## 分類邊界

| 類型 | 放置位置 | 判斷方式 |
| --- | --- | --- |
| 學習 app | `docs/<app>/` | 長期反覆使用、由 hub 開啟，通常有互動狀態或進度；在 `docs/registry.json` 登記 |
| 學習任務 | `learning-tasks/<task>/` | 有特定活動、場地或日期的素材包；完成後仍值得重印、改編或參考 |
| 任務共用資源 | `learning-tasks/shared/` | 已由至少兩個不同任務實際驗證可重用的原則、模板或素材 |
| 開發文件 | `docs-dev/` | ADR、pipeline 設計、技術研究、人工驗收與 repo 維運文件 |

這套做法延續平台 monorepo 的核心原則：用同一棵 repo 樹對抗遺忘，讓新工作先看見可沿用的內容；但不把一次性任務註冊成 app，也不為所有活動抽一套大型 framework。分類與歷史脈絡見 [ADR-0007](../docs-dev/adr/0007-learning-task-library.md)；人工索引改為共同登錄產生的決定見 [ADR-0008](../docs-dev/adr/0008-generated-work-catalog.md)，不改 task／app／shared 邊界。

## 任務資料夾規格

建議結構如下；沒有相應內容時不必建立空資料夾。

```text
learning-tasks/<task>/
  README.md          任務目的、對象、用法、內容索引與再製方式
  source/            可編輯真相源、prompt、題目與設計規格
  assets/            成品實際使用的圖片、音訊或其他素材
  output/            可直接使用或列印的 PDF、preview 等交付物
  design-lessons.md  從本任務提煉、但尚未證明跨任務通用的經驗（選用）
```

歸檔時遵循以下原則：

- 保留重建最終交付物所需的來源、實際引用素材、最終成品與少量代表性 preview。
- 不保存每一輪 render、未採用生成圖或重複 master；Git history 不是生成暫存區。
- `README.md` 要讓沒看過原對話的新 session 能知道「這是什麼、適合誰、如何使用、如何重建」。
- 建立任務時就加入 `catalog.json`，狀態使用 `in-progress`；完成後改為 `complete`。多 session 工作的進度與 blocker 仍依 repo 的 tracker／HANDOFF 規則管理，不把執行細節複製進登錄。
- 已完成且沒有後續工作的任務不另開 issue，也不留在執行中 `HANDOFF` 或 roadmap；commit、task README 與本索引就是歷史入口。
- `shared/` 只收經跨任務驗證的內容，並由使用它的任務反向連結，避免形成無人知道用途的素材堆。

## 來源與部署位置

一份任務可以有 PDF 或可開啟的網頁；判斷 task／app 依用途，不依副檔名。歸檔位置與使用入口分開看：

- 新的網頁任務以 `learning-tasks/<task>/source/` 為可編輯來源；需要在本站開啟時，產生到 `docs/<entry>/`。任務 README 要標明 build 指令與產物位置，修改來源後重建，不各自編輯兩份。可參考 [悠閒午後](leisure-afternoon/README.md)。
- [第一篇閱讀心智圖](reading-mind-map/README.md) 是已記錄的既有例外：唯一來源保留在 `docs/mind-map.*`，任務目錄提供索引與再製說明。沿用已發布網址，不為了外觀一致再複製或搬移；新篇沿用上一項做法。
- 網頁被孩子首頁連到，不會自動變成 App。每週閱讀文章另外登記在 `registry.json` 的 `mindMaps`，任務庫仍保留來源與經驗；該文章不再重複登記進 `apps`。文章製作流程見 [共用閱讀做法](shared/reading-mind-maps.md)。
- 私人原始資料與私用成品依各任務的 `.gitignore` 及 README 保存；完整 clone 不保證包含私人題文、錄音或 PDF。找不到被排除的檔案不等於未完成，也不能為了補總覽連結就將它們公開。

## 索引與並行工作

新任務仍須在工作分支一開始就建立資料夾並加入 `catalog.json`；App 仍登記在 `docs/registry.json`，白板額外來源資訊放在該 App 的 `work` 欄位，不另抄 App 名稱。兩份 README 與白板共用登錄，勿直接改受控區段。兩篇以上重用才加入 `shared/`；合併登錄變更時保留其他分支已新增的條目。

需要讓主線能找到尚未整合的作品時，在 `catalog.json` 登錄其明確 `source.repo`、`source.ref` 與 `source.paths`，由 root README 產生主線外入口；不複製其來源、不以可用網站推定已合併。完成整合後將 source 改成本 repo 的主線範圍。跨 session 的下一步、blocker 與驗收仍留在該工作的 tracker。

### 登錄欄位與重建

- task 使用穩定 `id`（對應資料夾）、`name`、`status`、`statusNote`、`eventDate`、`audience`／`audienceLabel`、`description`、`reusable`、`availability` 與 `links`。工作狀態只接受 `unknown`／`in-progress`／`complete`／`paused`；沒有來源明示就用 `unknown`，不從 commit 或 App active 推測完成。
- 一般 task 的來源範圍預設為整個任務資料夾（含 README、source、assets、output）；既有來源例外用 `source.paths` 明列。App 預設取 `docs/<app>`，不同作品巢狀時用 `source.excludePaths` 排除，例如 math 不含 nonogram。日期只讀 Git，不讀 ignored 私人檔案，也不追搬移前的來源位置。
- `eventDate` 是活動日期。白板 create／update 另由來源範圍 Git commit timestamp 換算臺灣日期：首次收錄／最近變更；不是建立檔案的作業系統時間、活動日、部署日或同步嘗試時間。新增但未 commit 的來源日期為未知，不能補今天；shallow checkout 必須補足歷史才可重建。
- 明確系列才填 `groupId`／`groupName`（目前 Native Camp、閱讀心智圖），不靠名字猜分組。shared 可屬於作品來源範圍，但不另登成作品。
- `availability` 為 `available`／`source-only`／`private`／`unknown`，與工作狀態分開。`links` 中站內成品從 `/parent/` 使用 `../` 相對網址，產生器檢查其在 docs 實存；任務來源／公開 PDF 使用 GitHub 入口，不建立 docs 無法服務的任務庫相對連結。私用 PDF 保留 private，不因 clone 缺檔而改成未完成或公開私人內容。
- 外部與主線外資料只同步已登錄來源；失敗保留上次已知日期並標過期。快取不匹配來源時不沿用舊值。自動更新／發布方式見[作品白板操作文件](../docs-dev/parent-whiteboard.md)。

```sh
node scripts/build-work-catalog.mjs
node scripts/build-work-catalog.mjs --check
node --test tests/test_work_catalog.mjs
```

產物為 root README 作品總覽、此頁任務索引與 `docs/parent/work-catalog.json`，沒有每次重建都變動的執行時間或 HEAD 欄位。一般重建不連外網；遠端查核由獨立同步流程更新 `docs/parent/work-catalog-remotes.json`，不改來源 repo 或家庭資料。
