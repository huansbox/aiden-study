# Native Camp 月曆與週日製作流程驗收

對應 [#82](https://github.com/huansbox/aiden-study/issues/82) 及 #83–#85；驗證日期 2026-09-18。製作入口見 [weekly-automation.md](../learning-tasks/shared/nativecamp/weekly-automation.md)。

## 畫面與資料

- Chrome 使用隔離 8794、test-token、記憶體 KV；原 8791 及原 checkout 保留，正式家庭設定與進度沒有寫入。
- 孩子畫面顯示 September 2026，Mon–Sun 七欄、9/18 今日與選取課程分別標記；9/20 Review 尚未開放，不能點入。
- 前後切月及 Shift+Tab／Enter 的鍵盤操作成功，切月後焦點保留。課程詳情跟隨目前選取，首次進入沿用既有預設選課；切月不改選課。
- 390px viewport 下，孩子頁與 Preview 的文件寬度及 scrollWidth 都是 375px（另含 scrollbar），無橫向溢出。已還原 viewport。這是桌面瀏覽器窄版驗證，未冒充 iPad 真機測試。
- 合成的 9/15 完成紀錄在日曆打勾、淡化、不可點；直接連到該課只顯示 Finished，沒有重作入口。
- Preview 可直接開尚未開放的週包、切換 Say it 並顯示答案。操作前後隔離進度 JSON 完全一致。家長摘要仍保留原課程導覽。
- Node 覆蓋閏年、跨月直連、同日多課與同老師編號、舊週包相容、新週包固定選題及原始進度保留。

## 排程執行條件

- 本機為 Taipei Standard Time，插電自動睡眠設定為 0；沒有修改電源設定。本機 heartbeat 仍需要 Windows 電腦及 Codex App 可用，關機時無法準時執行。
- 固定 Wrangler 4.132.0 已準備；以既有管理登入唯讀固定 Aiden Native Camp KV。關閉 Wrangler disk logs，原始回應只進 child process 管線。
- 第一次外部讀取失敗時安全停止；後續核對登入、擷取及 planner 各階段後成功。9/20 回 already-published；以 9/27 的窗口讀目前正式資料回 no-new-practice。這些結果沒有生成新週包，也沒有改寫孩子資料。
- 使用者另外授權 Windows 本機持久加密副本後，已從指定的 1Password 項目臨時注入，保存 current-user DPAPI 檔。新 PowerShell 程序 status=ready、OpenAI `/v1/models` probe HTTP 200。key 不進 repo、日誌、前端或分享網址。
- 同一 credential helper 的固定 audio 指令核對既有 9/17 全部 48 個音檔：verified=48、generated=0、apiRequests=0。另用已快取的 small.en 本機辨識 8 段樣本，關鍵內容一致；沒有上傳音訊，沒有新增付費請求。
- 假 key 測試確認加密檔不含明文、ACL 限目前使用者、獨立程序可解密、可替換／移除、錯誤與子程序結束碼保留。相同 Windows 使用者的其他程序仍可解密；移除本機副本不會撤銷原 API key。

## 程式驗證

- 與最新主線整合後，全 repo Node：481 passed。
- 全 repo Python：247 passed、1 skipped（既有未隨 Git 提供的私人 PDF 測試）。Windows DPAPI 測試本機通過；其他 OS 明確 skip。
- clean-context review 已修正 JSON object 欄位重排導致 planner 誤判不一致，並加入回歸測試。
- 整合檢查補齊孩子、Preview、parent 的新 core/catalog cache version；preflight 比對公開來源順序與私有計畫概念集，避免將排名順序當作內容順序。
- clean-context integration review 的三項 finding 已修正並通過回歸：依 Git 正規化 JSON bytes 核對 Windows 發布、使用保存快照恢復 brief 並驗證計畫、發布前要求 catalog 恰有同日唯一且契約一致的新週包。
- 發布與原生排程的最終狀態、commit、CI／Pages 與資源核對證據記於 #85；排程建立本身不作為新週包已生成的證據。
