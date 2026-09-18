# 依實際練習製作 Weekly Review

本流程只處理 Aiden 已同步的 Native Camp 作答。排程與發布交由自動化流程承接；本工具不連線讀家庭資料、不呼叫付費 API、不發布，也不替孩子作答。原課與既有 `weekly-2026-09-14`（09-20 開放）保持原樣。

## 規劃入口與私有資料

```powershell
node learning-tasks/shared/nativecamp/plan_weekly.mjs --snapshot .local/nativecamp-weekly/captured-progress.json --release 2026-09-27
```

排程可用 `--stdin` 取代 `--snapshot`，由 child process 的 stdin 傳入 Wrangler 固定 key 的 JSON，避免原始回應進入終端或模型輸出。兩者互斥，輸入上限 2 MiB。輸入可為 core 的進度物件，或 KV `{rev, data}` envelope；`data: null` 代表尚無已同步進度，無效 JSON、schema、來源概念或 question ID 則失敗，不視為空週。

已存在計畫的續作使用 `node learning-tasks/shared/nativecamp/plan_weekly.mjs --resume --release 2026-09-27`；此模式只讀保存的 `progress.json`，不接受 `--snapshot`／`--stdin`，也不重新讀雲端。模組對應 `writeWeeklyPlan({releaseDate, resume: true})`；缺少保存計畫即失敗，不能悄悄建立另一份。

發布日必須是 Asia/Taipei 的週日。`2026-09-27` 的練習窗口為 `2026-09-20`（含）至 `2026-09-27`（不含）；`attempt.date` 本身就是孩子端記錄的臺北日期，不依 lesson.date、KV updatedAt 或電腦當地時區分類。原課 `initial`、保留的舊 `reviews` 與週包實際回答都計入是否練過；單純開啟題目、pending 提示或尚未同步不算已回答。週包透過已保存的來源與公開題包核對，映射回原課概念。

唯一私有工作根為 repo 的 `/.local/nativecamp-weekly/`，由 root `.gitignore` 精確排除；snapshot 路徑不得在此根之外，也不得經 symlink／junction 指向公開目錄。工具只保存正規化後的 core 欄位，不保留 envelope 的未知欄位。切勿將下列檔案貼進 issue、commit、日誌或公開題包：

- `<release>/progress.json`：第一次成功規劃使用的正規化快照。
- `<release>/plan.json`：快照 hash、實際練習日期與選題依據；屬個人表現。
- `<release>/generation-brief.json`：移除表現欄位的出題工作檔，包含公開原課概念與題文作為設計參考；仍留在私有工作根。

stdout 只回 `{status, reason?, releaseDate, lessonId?, conceptCount?}`。`status` 是 `planned`、`resumed` 或 `skipped`；skip 原因是 `already-published`、`no-synced-progress` 或 `no-new-practice`。無效輸入 exit 1，只印固定錯誤訊息。不要把 stderr 或完整 snapshot 當成 review 材料。模組提供 `practiceWindow`、`normalizeSnapshot`、`planWeekly`、`generationBrief`、`loadPublicInputs`、`writeWeeklyPlan`，供離線測試與自動化重用；生產入口仍須遵守固定 Aiden 與私有根。

## 選題與續作

候選概念至少有一筆窗口結束前的實際回答；窗口內完全沒有新回答便 skip。首次錯誤、受助或週題未熟會留下需加強依據，後來成功不抹掉。先依需加強、最近實際練習與來源 ID 穩定排序，最多四概念；保留最多一個只有較早練習的概念，空間足夠且有成功候選時保留一個成功樣本。較早是指「實際練習在窗口之前」，晚練的舊課仍屬窗口內。只有少量已練概念時就出較少題，不用未練內容補滿。

成功寫入 plan 後，同發布日重跑一律使用已保存的快照與計畫，不因後來同步而重抽。可恢復遺失的 generation brief；原 plan／brief 若與保存快照或來源不一致則停止。若本機 catalog 已登記這份計畫的草稿，重建計畫時排除自身草稿，再核對其日期與 weekly metadata，避免把自己的製作輸出誤認成另一份既有包。這個入口只驗證私有計畫／恢復 brief，不改寫公開題文；發布完整性仍由 preflight 驗證。

`.planner-lock` 防止兩個程序同時建立計畫；中斷後若留下 lock，先確認沒有存活程序，檢查保存檔再人工移除，不能自動搶鎖。沒有保存計畫時，catalog 已有相同發布日就 skip，因此既有 09-20 首包不會再造第二份；`automation.json` 已記錄 published 時，即使指定 `--resume` 也只回已發布，不重建或重製。

## 新題包契約

舊週包繼續使用 `weekStart/weekEnd/opensOn/conceptCount/earlierCount`，其週一至週日語意與孩子端已保存選題不改。新週包採下列格式；題包與 catalog 的 weekly 欄位必須完全對應：

```json
{
  "schemaVersion": 1,
  "id": "weekly-2026-09-27",
  "date": "2026-09-27",
  "title": "Weekly Review",
  "kind": "weekly",
  "weekly": {
    "schemaVersion": 2,
    "practiceStart": "2026-09-20",
    "practiceEnd": "2026-09-27",
    "opensOn": "2026-09-27",
    "conceptCount": 4
  }
}
```

`practiceEnd` 是不包含的邊界，`date` 和 `opensOn` 是發布週日。新 schema 的 `concepts.length` 必須等於 `conceptCount`（1–4）。planner 已按實際作答挑好內容，孩子端兩種模式使用整份已選概念，首次開始時仍保存 selected 與 source，不再按原課日期重抽。每個 `sourceConcept` 始終指向公開的一般課程，不指向上一份週包；`sourceConcept.date` 保持原課日期，不拿練習日期覆蓋。

## 從工作檔製作可發布內容

1. 讀 generation brief 與[原課 SOP](../../nativecamp-review-pilot/lesson-sop.md)。以 brief 的 bundle metadata 和概念 sourceConcept 為契約；不複製 plan、progress、originalConcept 或選題理由到公開來源。
2. 每概念重新設計 Try it／Say it 各三題。換情境或可見證據、保留相同目標能力；不能只換 ID、文字順序或照抄舊題。Try it 使用完整句排列／變換及少量合理混淆字，Say it 列自然完整句與合理替代答案；圖、問題、答案須一致。題目 ID 在包內唯一，沿用新概念 ID 加 mode 和變體序號。
3. 完成六題後才建立 `learning-tasks/nativecamp-<lessonId>/source/lesson-source.json`，依任務庫規則建立 task README，並在 `learning-tasks/catalog.json` 登錄，`groupId` 沿用 `nativecamp`；執行 `node scripts/build-work-catalog.mjs` 產生索引與白板，不另手填兩份 README 清單。只放公開原創題文和來源映射，不放作答日期、outcome、helped、排名、快照 hash 或憑證。工作根中的 plan 是私有依據，task 中的 lesson source 才是公開內容真相源。
4. 執行 `uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson <lessonId>` 產生 JSON 與 speech jobs，再跑同命令 `--check`。建置不產生音訊，也不代表題意或音文已正確；新 JSON 必須通過 `NativeCampCore.validateLesson` 和 catalog 來源核對。
5. 獨立 reviewer 檢查新情境、完整答案、合理替代句與提示是否洩漏答案。依[共用音訊流程](README.md#openai-語音製作)生成正常語速 OpenAI 音訊，檢查輸入指紋、解碼、非靜音、hash 與抽樣字詞。完整題包、speech jobs、manifest、所有聲音與 catalog 一致且檢查通過後，才交由已授權的發布流程處理。

新包內容與已開始選題不得覆寫；已完成音檔且指紋一致才保證重跑不再請求 API。傳輸結果不確定時停下並回報，不能宣稱任何失敗都不會重複計費。

## 離線驗證

```powershell
node --test tests/test_nativecamp_planner.mjs tests/test_nativecamp_core.mjs tests/test_nativecamp_catalog.mjs
uv run --offline --python 3.13 pytest -q tests/test_nativecamp_builder.py
```

測試只用合成快照和暫存資料夾，涵蓋週日邊界、晚練舊課、週題回溯、首次弱項保留、成功與較早樣本、空週、未知來源、舊包查重、固定續作、路徑隔離及 builder 的真實 JSON runtime 驗證。
