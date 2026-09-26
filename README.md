# Aiden Study 全家學習平台

給家中兩個小孩使用的靜態學習平台。根目錄是 registry 驅動的 hub，站內 app 共用 child 身分、Cloudflare Worker 進度同步與獎勵素材；題庫資料處理 pipeline 仍保留在同一個 monorepo。

線上入口：<https://kids.linshuhuan.com/>（[煦誠學習](https://kids.linshuhuan.com/?child=aiden)／[秉樸學習](https://kids.linshuhuan.com/?child=bingpu)／[家長後台](https://kids.linshuhuan.com/parent/)）

## 作品總覽

<!-- work-catalog:start -->

此區塊由 [App registry](docs/registry.json) 與 [task catalog](learning-tasks/catalog.json) 自動產生，勿手改。相同資料供[家長作品白板](https://kids.linshuhuan.com/parent/)使用；操作與歸檔規則見[任務庫](learning-tasks/README.md)。

### App

包含 draft／parked 與外部 App；對象是 registry 預設，不是孩子目前的家庭設定。App 上下架不代表工作已完成，沒有明確工作狀態就顯示「未標記」。

| App | 來源 | 可用版本 | 工作狀態 |
| --- | --- | --- | --- |
| Native Camp Review | [aiden-study/docs/nativecamp](docs/nativecamp/) | [不計分預覽](docs/nativecamp/preview.html) | 未標記；App 上下架：啟用；未另標記工作狀態。 |
| 題庫練習 | [aiden-study/docs/study](docs/study/) | [網頁](docs/study/) | 未標記；App 上下架：啟用；未另標記工作狀態。 |
| 長除法練習 | [aiden-study/docs/math](docs/math/) | [網頁](docs/math/) | 未標記；App 上下架：啟用；未另標記工作狀態。 |
| 英文拼字 | [aiden-study/docs/spelling](docs/spelling/) | [網頁](docs/spelling/) | 未標記；App 上下架：啟用；未另標記工作狀態。 |
| 數織解謎 | [aiden-study/docs/math/nonogram](docs/math/nonogram/) | [網頁](docs/math/nonogram/) | 未標記；App 上下架：啟用；未另標記工作狀態。 |
| 注音練習 | [aiden-study/docs/zhuyin](docs/zhuyin/) | [網頁](docs/zhuyin/) | 未標記；App 上下架：啟用；未另標記工作狀態。 |
| 動物守護者 | [animal-fight](https://github.com/huansbox/animal-fight/tree/master) | [探險卡 PDF](https://github.com/huansbox/animal-fight/blob/master/output/pdf/storm-forest-rescue-reveal-cards-half-label-a4.pdf)、[任務狀態卡 PDF](https://github.com/huansbox/animal-fight/blob/master/output/pdf/team-mission-status-zone-cards-quarter-label-a4.pdf)、[規則與用法](https://github.com/huansbox/animal-fight/blob/master/README.md) | 未標記；列印作品；舊 GitHub Pages 網址已失效，改用公開 PDF 與規則。未另標記工作狀態。 |
| 英文閱讀 | [aiden-english](https://github.com/huansbox/aiden-english/tree/master) | [外部網頁](https://huansbox.github.io/aiden-english/) | 未標記；App 上下架：草稿；未另標記工作狀態。 |
| 隕石數學防衛隊 | [99-meteor](https://github.com/huansbox/99-meteor/tree/main) | [外部網頁](https://huansbox.github.io/99-meteor/) | 未標記；App 上下架：暫不上架；未另標記工作狀態。 |

### 學習任務與共用經驗

每份任務保留一個來源入口；白板把同系列合成一列，展開後仍可找到每份素材。活動日期、狀態與對象由同一份登錄產生於[任務索引](learning-tasks/README.md#任務索引)。

| 任務 | 找得到什麼 | 可用版本 |
| --- | --- | --- |
| [Native Camp 2026-09-21 Alex](learning-tasks/nativecamp-2026-09-21/) | 願望、交換、借物、動作與工作計畫的完整句 | [不計分預覽](docs/nativecamp/preview.html?lesson=2026-09-21) |
| [Native Camp 2026-09-20 Kyla](learning-tasks/nativecamp-2026-09-20/) | 需求、用途、買賣、故事順序與原因 | [不計分預覽](docs/nativecamp/preview.html?lesson=2026-09-20) |
| [Native Camp 2026-09-19 Zibuyile](learning-tasks/nativecamp-2026-09-19-zibuyile/) | 水果特徵、所有權視角與完整數量問答 | [不計分預覽](docs/nativecamp/preview.html?lesson=2026-09-19-zibuyile) |
| [Native Camp 2026-09-19 Edon](learning-tasks/nativecamp-2026-09-19/) | 故事預測、能力、感受原因、近遠與寵物描述 | [不計分預覽](docs/nativecamp/preview.html?lesson=2026-09-19) |
| [Native Camp 2026-09-18 Zeus](learning-tasks/nativecamp-2026-09-18/) | 食物、完整問答、故事順序、數量與分享理由 | [不計分預覽](docs/nativecamp/preview.html?lesson=2026-09-18) |
| [Native Camp 2026-09-26 Danielle](learning-tasks/nativecamp-2026-09-26/) | 住家描述、否定附和、理由、喜好與條件句 | [不計分預覽](docs/nativecamp/preview.html?lesson=2026-09-26) |
| [Native Camp 2026-09-25 Edon](learning-tasks/nativecamp-2026-09-25/) | 動物與顏色描述、主題預測、尾音及存在句 | [不計分預覽](docs/nativecamp/preview.html?lesson=2026-09-25) |
| [Native Camp 2026-09-24 Mia](learning-tasks/nativecamp-2026-09-24/) | 野餐需求、動作、交換與偏好的完整句 | [不計分預覽](docs/nativecamp/preview.html?lesson=2026-09-24) |
| [Native Camp 2026-09-23 Bianca](learning-tasks/nativecamp-2026-09-23/) | 工作與需求、讀取線索及現在式完整問答 | [不計分預覽](docs/nativecamp/preview.html?lesson=2026-09-23) |
| [Native Camp 2026-09-22 Edon](learning-tasks/nativecamp-2026-09-22/) | 寵物、朋友介紹、理由與完整句描述 | [不計分預覽](docs/nativecamp/preview.html?lesson=2026-09-22) |
| [Native Camp 2026-09-12 Mel](learning-tasks/nativecamp-2026-09-12-mel/) | 天氣與穿著：takes／uses、wearing、is／are 與不規則複數。 | [不計分預覽](docs/nativecamp/preview.html?lesson=2026-09-12-mel) |
| [Native Camp 2026-09-09 Emi](learning-tasks/nativecamp-2026-09-09/) | Who／What 問句、完整介紹、人與動物的一天。 | [不計分預覽](docs/nativecamp/preview.html?lesson=2026-09-09) |
| [Native Camp 2026-09-08 Maria](learning-tasks/nativecamp-2026-09-08/) | 照顧動物、午睡、棲地與故事角色的完整句。 | [不計分預覽](docs/nativecamp/preview.html?lesson=2026-09-08) |
| [Native Camp 2026-09-12 Lena](learning-tasks/nativecamp-2026-09-12/) | 依實際課堂內容練完整句排列與口說。 | [不計分預覽](docs/nativecamp/preview.html?lesson=2026-09-12) |
| [Native Camp 2026-09-11 Edon](learning-tasks/nativecamp-2026-09-11/) | 依實際課堂內容練完整句排列與口說。 | [不計分預覽](docs/nativecamp/preview.html?lesson=2026-09-11) |
| [Native Camp 2026-09-10 Anastasia](learning-tasks/nativecamp-2026-09-10/) | 依實際課堂內容練完整句排列與口說。 | [不計分預覽](docs/nativecamp/preview.html?lesson=2026-09-10) |
| [Native Camp Weekly Review 09-14～09-20](learning-tasks/nativecamp-weekly-2026-09-14/) | 本週新題與少量較早概念；首次弱項優先。 | [不計分預覽](docs/nativecamp/preview.html?lesson=weekly-2026-09-14) |
| [Native Camp 2026-09-17 Khalid](learning-tasks/nativecamp-2026-09-17/) | 來源核對、完整句排列與口說。 | [不計分預覽](docs/nativecamp/preview.html?lesson=2026-09-17) |
| [Native Camp 2026-09-13 Michael](learning-tasks/nativecamp-2026-09-13/) | 來源核對、完整句排列與口說。 | [不計分預覽](docs/nativecamp/preview.html?lesson=2026-09-13) |
| [Native Camp 2026-09-16 Edon](learning-tasks/nativecamp-2026-09-16/) | 來源核對、自主題、口說與跨日複習。 | [不計分預覽](docs/nativecamp/preview.html?lesson=2026-09-16) |
| [Native Camp 2026-09-14 Edon](learning-tasks/nativecamp-2026-09-14/) | 來源核對、自主題、口說與跨日複習。 | [不計分預覽](docs/nativecamp/preview.html?lesson=2026-09-14) |
| [Native Camp 回放複習試作](learning-tasks/nativecamp-review-pilot/) | 紙本口說；另供 App 自主題、口說與跨日複習。 | [不計分預覽](docs/nativecamp/preview.html?lesson=2026-09-15)、[孩子版 PDF](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/nativecamp-review-pilot/output/pdf/review-child.pdf)、[家長版 PDF](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/nativecamp-review-pilot/output/pdf/review-parent.pdf) |
| [悠閒午後閱讀心智圖](learning-tasks/leisure-afternoon/) | 五枝放射圖、各段重點保留、iPad 選詞。 | [網頁](docs/leisure-mind-map/) |
| [四上數學第一份短練習](learning-tasks/grade4-math-first-practice/) | U1「一億以內的數」15～20 分鐘紙本練習；孩子作答、家長分卷核對。 | 私用成品 |
| [四上第一次段考數學候選卷](learning-tasks/grade4-sem1-math-exam1/) | 桃子腳第一次段考前，依概念與實際範圍篩選歷屆數學卷。 | 私用成品 |
| [四上第一次段考自然候選卷](learning-tasks/grade4-sem1-science-exam1/) | 桃子腳第一次段考前，依地表與水生環境概念篩選歷屆自然卷。 | 私用成品 |
| [閱讀心智圖選詞引導](learning-tasks/reading-mind-map/) | iPad 選詞、四角放射心智圖、短詞抄寫。 | [網頁](docs/mind-map.html) |
| [新竹動物園小小探險](learning-tasks/hsinchu-zoo-adventure/) | 火車地理、園區選路、動物特徵觀察、昆蟲分類；卡片可任意中止。 | [列印 PDF](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/hsinchu-zoo-adventure/output/hsinchu-zoo-adventure-cards-half-label-a4.pdf) |

可跨任務沿用的內容從 [shared 索引](learning-tasks/shared/README.md) 找；例如[兒童閱讀心智圖](learning-tasks/shared/reading-mind-maps.md)。這些是經驗或資源，不另外計為一份作品。

### 主線外作品入口

下列作品保留其明確分支來源，不複製或合併其他裝置的工作。網站可用與來源已整合是兩件事；最新工作狀態仍回查該分支／PR，不把遠端日期當成尚未推送的即時變動。

| 作品 | 來源 | 已有成果入口 | 工作狀態 |
| --- | --- | --- | --- |
| 怎麼和 AI 一起做出探險卡 | [aiden-study/learning-tasks/ai-collaboration-showcase](https://github.com/huansbox/aiden-study/tree/codex/ai-collaboration-showcase/learning-tasks/ai-collaboration-showcase)（codex/ai-collaboration-showcase） | [Cloudflare Pages 故事網站](https://ai-zoo-cards-story.pages.dev/) | 未標記；網站已發布；來源仍為主線外工作分支，工作狀態回查該分支。 |

白板的 create／update 取作品來源範圍的 Git commit 日期（臺灣時間），不是活動日、發布日或孩子作答時間；create 指目前來源位置首次收錄。完整歷史不足時建置失敗，未知日期顯示「—」。遠端同步失敗保留上次已知值並明示過期；不以同步嘗試時間更新作品日期。

<!-- work-catalog:end -->

## 平台現況

`docs/registry.json` 定義平台可用 App。獨立 `/parent/` 家長後台已於 2026-09-15 正式發布，實際顯示對象、排序、題庫學期、頭像與練習安排可從後台調整。新版孩子首頁、累計與永久積木徽章已上線，預設 LEGO 頭像，指定的扁平版保留供替換；規則與驗證見 [UI/UX 改版說明](docs-dev/family-uiux-v2.md)。既有進度同步仍共用 `docs/shared/sync-v1.js` 與 `docs/shared/wiring-v1.js`，新增家庭設定／累計使用 `family-*`，後端都位於 `worker/`。

2026-09-16「家長首次連接、記住入口」已正式發布。此版將家庭金鑰換成 HttpOnly Cookie、保留帶金鑰舊圖示的自動轉移，並新增首頁前景更新及失敗提示。`kids.linshuhuan.com` 已啟用 Cloudflare proxy，僅 `/api/*` 交由 Worker，其餘頁面仍由 GitHub Pages 提供；步驟與驗證見 [入口連線說明](docs-dev/device-connection.md)。

五個 app 已提供回孩子首頁的連結，兩個首頁的頁面名稱分別為「煦誠學習」「秉樸學習」，沿用原本的 child 網址。自訂網域 `kids.linshuhuan.com` 已啟用 HTTPS，舊 GitHub Pages 網址會自動轉向。#35 主畫面跨頁與 Safari 儲存隔離已驗收結案；#34 網站端檢查完成，家長已確認兩個 iPad 主畫面圖示安裝，依本輪範圍結案。注音 14 段正式親錄已補齊並獲家長接受，沿用已免除逐項 iPad checklist 的決定；見 [收尾紀錄](docs-dev/zhuyin-mvp-ipad-checklist.md)。2026-09-15 家長確認尚未正式給孩子使用，本次不備份／還原／對帳舊進度；詳見 [正式網域上線紀錄](docs-dev/platform-domain-rollout.md)。

## 專案結構

```text
docs/                 GitHub Pages 部署根目錄
  index.html          child 首頁；未指定孩子時選擇入口
  parent/             家長設定、練習安排與維護入口
  registry.json       hub app registry
  study/              1,924 題公開題庫 app；家庭權限自動讀取私用題包，另有不記錄進度的家長試玩
  math/               長除法與 nonogram
  spelling/           英文拼字 app
  nativecamp/          全英文課後複習；首次表現、口說與每週新題
  zhuyin/             注音 app 與錄音工具
  shared/             同步、接線與獎勵共用資源
worker/               Cloudflare Worker 同步 API 與固定家庭唯讀題包端點
scripts/              Python 題庫萃取、分類與建置 pipeline
data/                 題庫中間資料與人工策展資料
tests/                pytest 與 Node.js test runner 測試
docs-dev/             ADR、設計稿與人工驗收文件
learning-tasks/       一次性家庭學習任務、可重建成品與重用經驗
wiki/                 GitHub Wiki 的版本控制真相源
```

## 開發環境

- Python 3.13，由 [uv](https://docs.astral.sh/uv/) 管理。
- Node.js 24 以上，用內建的 test runner；目前沒有 npm 相依。
- `claude` CLI 只在重跑 AI 分類 pipeline 時需要，一般開發與測試不需要。

```bash
uv sync --locked
```

## 測試

本機與 GitHub Actions 使用同一組兩道 gate：

```bash
uv run pytest
node --test "tests/*.mjs"
```

測試數量會隨功能與資料更新；執行工作時以當次命令的實際輸出為準，不把舊快照數字當成目前結果。注音正式親錄已齊備；缺少 `.m4a` 現在會使測試失敗，避免發布後再出現缺音。

## 本機啟動

```bash
uv run python -m http.server 8765 -d docs
```

- Hub：<http://localhost:8765/>
- 題庫：<http://localhost:8765/study/?child=aiden>
- 四上數學家長試玩：<http://localhost:8765/study/preview.html?child=aiden>（一般靜態 server 沒有家庭 Cookie session，只能驗未連接提示）
- iPad spike：<http://localhost:8765/platform-ipad-spike.html?child=test-spike&k=test-spike-token>

localhost 不在正式 Worker 的 CORS 白名單，一般靜態伺服器上的同步失敗是預期行為。完整本機驗證可用 `node tests/helpers/serve-family.mjs`，開啟輸出的 `/test/start`；該工具使用隔離 test-token、記憶體 KV 與合成題目，不動正式資料。`/test/controls` 可暫停／恢復隔離雲端；Study 試玩隔離驗收從 `/test/study-preview?mode=ok` 開始，完成後由 `/test/study-preview/inspect` 核對 browser／KV 哨兵與 request allowlist。

## 題庫 pipeline

紙本練習只在孩子實際需要時製作，沿用 [四上第一份短練習](learning-tasks/grade4-math-first-practice/) 的來源與再製方式，不按章自動產生 PDF。

目前學習內容主軸是把已核歷屆題小批加入 iPad 題庫。[#55 四上數學 U1：歷屆題庫接入 iPad 練習](https://github.com/huansbox/aiden-study/issues/55) 已完成最初六題 private pack、家庭權限自動讀取、獨立 review 與正式發布；[#59](https://github.com/huansbox/aiden-study/issues/59) 再把正式題包擴為 U1～U5 共十四題 rev2；[#60](https://github.com/huansbox/aiden-study/issues/60) 擴為三十題 rev3。[#101](https://github.com/huansbox/aiden-study/issues/101) 沿用相同 runtime，完成 fresh review、正式發布與 canonical private archive，把題包擴為五十七題 rev4，U1～U5 分布為 18／12／5／12／10；正常流程不要求家長傳檔。2026-09-14 的 iPad 操作確認只涵蓋先前 #55 六題流程，不代表五十七題已完成真機實測。[#103 Study 家長試玩](https://github.com/huansbox/aiden-study/issues/103) 新增由家長後台進入的獨立四上數學試玩頁：只在記憶體載入與試答現有 fixed pack，不載入或寫入孩子 Study 進度、題包 cache、同步或家庭累計，也不改題目或發布 contract。後續內容擴題再依[概念／出題方法覆蓋報告](docs-dev/grade4-math-pattern-counts.md)另行決定；`angle-v1` 等新呈現能力保留為未來選項，尚未授權開工。程式保護三下題目與現存進度；已放棄的三下歷史紀錄不再追回。詳見 [家庭端驗收紀錄](docs-dev/grade4-u1-ipad-acceptance.md)、[擴題路線圖](docs-dev/grade4-math-expansion-plan.md)、[執行狀態](wiki/Plan.md) 與 [整合方案](docs-dev/grade4-u1-study-integration-plan.md)。

題庫 app 的 public static data 目前共 1,924 題：自然 1,099、數學 307、社會 452、國語 66。四上家庭私人題包已發布 revision 6，共 89 題（數學 U1～U5 57 題、自然 S1～S2 32 題），不加入 public data；ignored 路徑 `data/private/study/g4-s1-math-u1/` 保存可重建 source／QA，正式 pack 部署在獨立 Cloudflare KV，由 Study 以家庭連線自動唯讀取得。內容不進 progress KV 或同步 payload，既有本機手動匯入保留為備援。重建與驗證方式見 [`docs-dev/grade4-u1-private-pack-build.md`](docs-dev/grade4-u1-private-pack-build.md)，後續擴題狀態見 [`docs-dev/grade4-math-expansion-plan.md`](docs-dev/grade4-math-expansion-plan.md)。詳細公開題庫來源、人工策展規則與踩坑記錄見 [`docs-dev/期末-實作經驗筆記.md`](docs-dev/期末-實作經驗筆記.md)。

[#117 四上自然首批 Study 練習](https://github.com/huansbox/aiden-study/issues/117) 已完成 20 題內容覆核與 revision 5 正式發布，原數學 57 題逐值維持不變；[自然首批選題](data/study/g4-s1-science-exam1/README.md)與[整合紀錄](docs-dev/grade4-science-study-first-batch.md)保留首批歷史。[#119 第二批](https://github.com/huansbox/aiden-study/issues/119) 新增 12 個完整活動、29 個原卷作答位置，revision 6 共 89 題已正式發布；見[第二批狀態](data/study/g4-s1-science-exam1/second-batch.md)。實體 iPad 尚未驗收，正式第一次定期評量範圍尚未公布。

```bash
# PDF 萃取範例
uv run python scripts/extract.py --input pdfs_期末 --output data/raw_questions_期末.json

# AI 分類；依資料切換 mid|final|math|social
uv run python scripts/classify.py --semester final

# 冪等合併成部署題庫 docs/study/questions.json
uv run python scripts/build_questions.py
```

## 維護入口

- [`docs-dev/development-readiness.md`](docs-dev/development-readiness.md)：子專案開工／收尾檢查，確認來源、工作目錄、跨裝置與私人素材界線。
- [`CLAUDE.md`](CLAUDE.md)：專案架構背景與歷史技術快照；當前狀態仍回查 code、Git 歷史與 issues。
- [`AGENTS.md`](AGENTS.md)：Codex 的 repo 導覽與家庭學習任務路由規則。
- [`CONTEXT.md`](CONTEXT.md)：平台詞彙與 registry 欄位語意；不存工作計畫。
- [`learning-tasks/README.md`](learning-tasks/README.md)：家庭學習任務索引、分類邊界與歸檔規格。
- [`docs-dev/adr/`](docs-dev/adr/)：架構決策紀錄。
- [`wiki/Home.md`](wiki/Home.md)：給人的穩定導覽；長期方向見 [`wiki/Roadmap.md`](wiki/Roadmap.md)，執行順序見 [`wiki/Plan.md`](wiki/Plan.md)，當前交接見 [`HANDOFF.md`](HANDOFF.md)。現況仍以 code、Git 歷史與 GitHub issues 為準。

family token 是 secret，只能放在 Cloudflare Worker secret、家長的密碼管理器與裝置網址，不得寫進 repo、issue、測試 fixture 或 log。
