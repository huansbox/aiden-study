# 按需製作與發布 Weekly Review

2026-09-26 依使用者在 [#125](https://github.com/huansbox/aiden-study/issues/125) 的要求，取消 Weekly Review 自動排程，改為只有使用者明確要求製作週包時才執行。既有 Codex heartbeat `native-camp` 已設為 `PAUSED`；不得因讀到本 SOP、到了週日、新課完成或工具可用，就自行恢復 heartbeat，或另建 cron／Windows 排程。重新啟用排程必須有使用者另一次明確要求。

本 SOP 保留 [#82](https://github.com/huansbox/aiden-study/issues/82)、[#84](https://github.com/huansbox/aiden-study/issues/84)、[#85](https://github.com/huansbox/aiden-study/issues/85) 建立的安全工具，供按需製作與續作使用。只處理 Aiden，採[實際練習規劃契約](weekly-planning.md)；既有 09-20 首包保留，每個發布週日最多一包。`weekly_automation.py` 與私有 `automation.json` 保留原名，名稱不代表排程仍啟用；取消排程不刪除舊週包、工作檔、付費請求紀錄或憑證。

## 手動製作前的環境核對

1. 確認本次已有使用者製作週包的明確要求，核對機器時區與工作 task。此 repo 的預設分支是 `origin/master`；從它取得已整合工具，記錄部署 commit。每個發布週日使用 `D:/mywork/aiden-study-nativecamp-runs/<YYYY-MM-DD>`，從最新 `origin/master` 建立 `codex/nativecamp-weekly-<YYYY-MM-DD>` 隔離 worktree；同週重跑沿用原 worktree、branch、私有工作檔，不重置或刪除。保留原 task 的 checkout 及其他工作。
2. 安裝並核對 `uv`、Python 3.13、Node、ffmpeg／ffprobe、已快取的 faster-whisper small.en，以及可非互動使用的 GitHub／Cloudflare 管理登入。固定 Wrangler 版本的準備命令為 `npx --yes wrangler@4.132.0 --version`；執行時只用 `--no-install wrangler@4.132.0`，不臨時下載新版本。
3. OpenAI 憑證透過 `op run` 暫時注入製作 child process，或沿用下列已核可的本機 DPAPI 保存方式。需要互動解鎖時由使用者完成，不把 key 放入命令列、工作文件或輸出。
4. 可選 Windows `openai_credential.ps1` 已提供 current-user DPAPI 的 status／install／remove／run／probe。只有使用者另外核可保存持久加密副本後才能 install 真 key；核可前只能用假秘密測試。預設 `%LOCALAPPDATA%/AidenStudy/nativecamp/openai.dpapi`，只限目前 Windows 使用者存取。相同使用者的程序可解密，移除本機副本不等於撤銷 OpenAI key；撤銷 API key 仍由原服務執行。新增外部秘密接收者也須另行核可。
5. 環境或工具有變更時，用合成進度與外部操作替身跑相關恢復／失敗檢查，再做固定進度 key 的正式唯讀驗證。每次製作仍須完成內容、review、發布前置與正式資源驗證；尚未取得的核可或未測條件要明列，不能以工具檢查通過代替週包交付。

2026-09-18 已取得本機 DPAPI 持久保存授權，統籌已完成預設位置的 install、fresh PowerShell status ready 與 `/v1/models` HTTP 200 probe；沒有生成付費音訊。既有 key 可在同一 Windows 使用者的各個週次 worktree 使用，無須每次重新要求保存授權。正式固定 KV 唯讀擷取及 planner smoke 已完成；當時的排程建立、啟用及交付紀錄見 #85，僅為歷史紀錄，現行製作政策以上述 #125 為準。以上不是已發布新週包的證據。

## 每次執行

收到製作要求後，先確認 repo／remote／分支，保留其他工作與原 8791 服務。先 fetch `origin/master`，從主線讀這份 SOP，並在上列週次 worktree 執行工具。未指定週次時，沿用 Asia/Taipei 最近一個已到達的週日作為 `<release>`；週日是既有練習窗口與題包識別的邊界，不代表要在週日自動執行。不要以 UTC 日期、課程日期或最近一筆 KV 時間推定；同一工作延遲續跑時，沿用已保存的發布週日，不重新漂移到下一週。先核對遠端同日發布狀態，才開始新工作；若已有私有 ready receipt，僅接續尚未完成的發布核對。遇到其他未處理的變更，停在草稿並回報。下列日期僅示範命令格式，不是待執行的排程。

```powershell
uv run --offline learning-tasks/shared/nativecamp/weekly_automation.py prepare --release 2026-09-27
```

`prepare` 固定執行 Wrangler `kv key get p:aiden:nativecamp`，namespace 為 repo 既有 `a2e1919289e84a21bb2169097ab33877`；不接受其他 key／namespace，不新增 endpoint、權限或 family token。stdout／stderr 只進 child process capture，JSON 經 planner stdin 驗證、縮減後才存私有快照，不把原始回應送到終端、模型訊息、issue 或日誌。

固定 Wrangler 4.132.0 的一般 logger 預設也寫 disk；因此 capture 強制 `WRANGLER_WRITE_LOGS=false`、`WRANGLER_LOG_SANITIZE=true`、`WRANGLER_LOG=error`、`WRANGLER_SEND_METRICS=false`，並移除 child process 不需要的 `OPENAI_API_KEY`。不用 `--text`，保留 binary stdout 管線；僅設定 log level 不足以禁止檔案日誌。更新 Wrangler 前必須重新核對這個行為。

工具只印安全摘要。`already-published`、`no-synced-progress`、`no-new-practice` 不製作新包，向本次提出要求的使用者簡短回報原因；CLI 非零退出、空白／無效回應、未知來源和缺工具都視為故障，不能當成空週。已有 plan 時，`prepare` 呼叫 planner 的 `--resume`：只驗證已保存的 progress／plan，恢復遺失的 generation brief，保留既有 ready receipt，不重新讀雲端。即使本機 catalog 已登記該週草稿，也要完成相同核對；保存資料不一致時失敗，不能僅憑 plan 檔案存在便回報恢復成功。合成測試可用 `--snapshot .local/nativecamp-weekly/<fixture>.json`，此選項不能指向公開路徑。

## 製作、語音與獨立檢查

1. 只讀 `<release>/generation-brief.json` 製作原創完整句。公開概念順序沿用 brief 的來源排序，不能公開 plan 的個人表現排序。依 [weekly-planning.md](weekly-planning.md) 建立 task README、來源與索引，每概念 Try／Say 各三個新變體，保留來源映射。原創內容由承接本次使用者要求的代理依 SOP 製作；Python runner 不自行呼叫另一個 LLM，也不把孩子資料傳給新的服務。
2. builder 產生完整題包及 speech jobs；將新週包登記到 App 的 `docs/nativecamp/lessons/catalog.json`。另外依任務庫規則在 `learning-tasks/catalog.json` 登錄同一份 task（`groupId: nativecamp`），再執行 `node scripts/build-work-catalog.mjs` 產生作品索引；這不是再註冊一個 App，也不手填 README 產物。不得變更已發布課程、週包或既有音檔。新包在整批通過前保留在工作分支，不合併到正式站。
3. 使用固定 normal-speed OpenAI 工具和私有 request journal。下列示例的 `op://` 是 secret reference，不能換成命令列中的明文 key；無法取得已授權的憑證時停止並回報。

```powershell
$env:OPENAI_API_KEY = 'op://<vault>/<OpenAI item>/credential'
op run -- uv run --python 3.13 learning-tasks/shared/nativecamp/build_openai_audio.py --lesson weekly-2026-09-27 --voice cedar --jobs learning-tasks/nativecamp-weekly-2026-09-27/source/speech-jobs.json --manifest learning-tasks/nativecamp-weekly-2026-09-27/source/nativecamp-audio-manifest.json --request-journal .local/nativecamp-weekly/2026-09-27/audio-requests.json
```

若已核可 DPAPI 保存並完成實機測試，可用同樣明確的 `Lesson`、`Voice`、`Jobs`、`Manifest`、`RequestJournal` 參數呼叫 `pwsh -NoProfile -File learning-tasks/shared/nativecamp/openai_credential.ps1 -Action run ...`。helper 只允許既有 audio builder，不接受任意 shell command。兩種模式都必須帶 `RequestJournal`；音色按既有課程規則選定後保存，不因重跑切換。

4. 每個付費請求送出前先 fsync 保存 `request-started`。完整回應經 hash／解碼／非靜音驗證，manifest 的 receipt 落盤後才標成 `response-verified` 並提升音檔。指紋一致的已完成檔案直接跳過；已保存且驗證的 `.part` 可恢復。結果不確定或 receipt 未落盤時，下一次執行仍會停止，不自動再次付費。不能刪 journal 或換檔名繞過阻擋；需先回報、核對供應商紀錄，取得可能再次計費的明確重試決定後才能人工調整該工作狀態。
5. 執行 `check_openai_audio.py` 對完整 manifest 做本機 ASR 抽樣，保留 `source/nativecamp-tts-asr.json`；檢查每個樣本的問題／答案關鍵字與尾句，不能以非靜音取代音文一致。ASR 不代表人耳自然度或 iPad 驗聽。
6. 由獨立 reviewer 檢查新情境、完整答案、合理替代句、來源概念、無私人資料，以及 ASR 抽樣字詞。reviewer 不需原始進度或個人排名。任何失敗只留下草稿，修正後重新核對受影響內容與音訊。

## Review receipt 與發布前置檢查

獨立 review 完成後，在私有 `<release>/review.json` 保存下列結構。`reviewer` 使用該次 reviewer 的 task／agent 識別，`artifacts` 取自 `review-hashes` 的輸出；檢查未完成不能填 true。

```json
{
  "releaseDate": "2026-09-27",
  "status": "passed",
  "reviewer": "independent-review-reference",
  "checks": {
    "originalQuestions": true,
    "completeAnswers": true,
    "naturalAlternatives": true,
    "sourceMapping": true,
    "noPrivateData": true,
    "asrWords": true,
    "independentReview": true
  },
  "artifacts": {}
}
```

```powershell
uv run --offline learning-tasks/shared/nativecamp/weekly_automation.py review-hashes --release 2026-09-27
uv run --offline learning-tasks/shared/nativecamp/weekly_automation.py preflight --release 2026-09-27
```

`preflight` 以剛 fetch 的 `origin/master` 作已整合基準；本機 HEAD 中已 commit、尚未 push 的週包仍可接續。遠端同日週包若有任何公開檔案不同就拒絕覆寫；全部相同時回 `alreadyIntegrated: true`，只需續做正式資源核對。工具也拒絕過期／未完成 review、與 plan 不符的概念、個人進度欄位，以及問題／場景／答案整組照抄舊題。檢查完整 builder 產物、每個音檔輸入指紋／hash／解碼／非靜音、ASR 的樣本 hash 及現有 catalog／runtime 契約；成功後才在私有 `automation.json` 保存 `ready` 與精確公開資源 hash。半批或中斷不會產生成功 receipt。人工修改任何已審核 artifact 都必須重新 review。

catalog 必須在該發布日恰有一筆 Weekly Review，且 ID、日期與完整 weekly metadata 和新包相符；漏登或同日重複都不能發布。公開 JSON 的發布 hash 取 Git clean 正規化後的 bytes，讓 Windows 工作目錄 CRLF 與 Git／Pages 的 LF 正確對應；只建立本機無引用 blob 供計算，不更動 index、工作檔或全 repo 換行設定。MP3 維持原始 bytes hash，正式資源仍逐 byte 比對，不能用忽略換行的寬鬆網路比對掩蓋發布差異。

發布前另外執行 repo 相關 Node／Python gate，核對 Git diff 只包含此週包來源、音檔、catalog 與索引；`.local/nativecamp-weekly/` 和憑證永遠不能進 staged files。確認最新遠端尚無相同發布日，透過既有 PR／CI／合併與 Pages 流程發布完整批次。若合併衝突、CI 失敗或同週已被其他程序發布，停止並回報，不覆寫舊包。runner 本身不執行 push、merge 或 deploy。

```powershell
uv run --offline learning-tasks/shared/nativecamp/weekly_automation.py verify-published --release 2026-09-27 --commit <完整部署commit>
```

`verify-published` 只讀固定正式站 `https://kids.linshuhuan.com/`，逐一核對 catalog、這一包 JSON 與所有新 MP3 的 SHA256，同時核對指定 commit 的 Git blob。全部相符才保存 `published`。失敗保留 `ready` 供診斷；不能靠本機檔案或 Pages job 顯示成功便宣稱正式資源一致。正式站驗證不替孩子作答、不寫家庭設定／進度。

## 中斷與通知

工作檔統一在精確 ignored 的 `/.local/nativecamp-weekly/`。`automation.lock` 防止兩個 runner 同時執行單一步驟，audio request journal 另有排他 lock；這些不是會自動到期的租約。中斷留下 lock 時先核對 PID／執行程序及工作檔，確定原程序已停止才人工移除，不能由排程直接搶鎖。發布期間也須以當週工作分支／PR、遠端同日查重和 commit／資源核對防止重複發布。

遇到不確定的付費請求，保留 `.part`、manifest、request journal；已驗證的回應可恢復，未驗證的結果等待人工判斷。發生 CLI／憑證／內容／音訊／CI／正式資源故障時回報該階段與安全摘要，不附 raw progress、環境變數、API body 或憑證。

向本次提出要求的使用者回報已完成的週包、略過原因或需處理的故障，並區分本機驗證與正式發布結果。未收到製作要求時不執行、不輪詢；不為了等待新練習或補發通知另建 heartbeat。

## 離線驗證

```powershell
uv run --python 3.13 pytest -q tests/test_nativecamp_weekly_automation.py tests/test_nativecamp_openai_audio.py tests/test_nativecamp_credential.py
node --test tests/test_nativecamp_planner.mjs tests/test_nativecamp_core.mjs tests/test_nativecamp_catalog.mjs
```

替身測試涵蓋固定唯讀 key、CLI 失敗與空週區分、日誌設定、摘要縮減、續作／排他鎖、內容與 review 綁定、ASR 舊 hash、半批阻擋、正式資源比對、不確定請求及 receipt 寫入中斷。另以真實 planner 驗證草稿已登 catalog、brief 遺失後的恢復與保存快照核對；在暫存 Git repo 設 `core.autocrlf=true`，驗證 CRLF JSON 經 Git LF 發布及 MP3 原始 bytes 全流程。全部測試使用假秘密與合成進度；不把這些結果當作正式憑證、排程或本週新題已交付的證據。
