# 四上自然首批 Study 題包

本批承接 [#117](https://github.com/huansbox/aiden-study/issues/117)，把四上自然接進既有 Study 家庭題包與家長試玩。自然暫定單元為 S1「地表的靜與動」、S2「水生生物與環境」；正式段考範圍尚未公布。收卷來源與限制見[自然候選卷](../learning-tasks/grade4-sem1-science-exam1/README.md)。

## 固定題包與保護範圍

- 沿用 `g4-s1-math-u1` packId、`c:study:g4-s1-math-u1` KV key、`/v1/packs/g4-s1-math-u1` route 與 `data/private/study/g4-s1-math-u1/` 私人根目錄。歷史名稱不表示內容只有數學。
- 公開題庫不納入私用題。數學 rev4 的 57 個題目與解說須逐值不變。公開 `mapping-metadata.json` 的原 57 個 row 保持原樣；自然 row 沿用相同 12 欄，由 `science-g4s1-...-v1` ID 與 unit 20／21 驗證科目。Math 仍只可用 unit 15～19。
- 題包維持 schemaVersion 1、128 KiB、每批最多 10 題。自然支援四選一與 `true_false`；是非題 `options` 必須為 `[]`、`answer` 為 `"true"` 或 `"false"`。孩子進度只記題目 ID 與結果，題文、答案、解說不進備份／同步／公開回報。
- 題目原件、轉寫、核答與含內容 QA 只在 ignored private root；公開文件只放來源定位、概念／方法與缺口統計，不放題文或答案。

## 本機重建與驗證

先確認正式 rev4 歸檔 SHA256 為 `72D77B98221ABA497B8C50F78BAD89DFC79BCB0AC6D7A5FE39B1AAEBF59CF1A6`，再將必要三檔複製到本 worktree 精確 ignored root。自然內容須經來源覆核後才合併 curated、explanations 與公開 mapping，三者 revision 一致後由 `uv run python scripts/build_private_study_pack.py` 重建。正式 pack hash 需由整合驗證核定，不能以 synthetic fixture 代替。

正式 pack 為 revision 5、77 題、53,239 bytes、SHA256 `98150515D8897C0240316D173FD8D94B47EDAE0804C05A271BB0431DBBE6B22C`。再次執行私人合併腳本與 builder 得到相同 hash；production parser 與唯讀 verifier 均通過。以 rev4 歸檔逐值比較，原 57 題的 question 與 explanation 不變，公開 mapping 原 57 row 也不變。新增 20 題與公開 selection 的 ID／來源投影一致。

**2026-09-23 正式發布**：merge commit `cb2e2cc19227b614c141db4fc0b89ccccc7ed298` 的 Pages 公開資產已逐 byte 讀回；Worker deployment `bf359a23-46a1-450a-b58c-3d361f3ec852`／version `807a397e-2ba7-423c-821a-f9f15d8873fe` 維持 100%。正式 `c:study:g4-s1-math-u1` 先讀回原 rev4 的 57 題、40,358 bytes 與核定 hash，再一次 forward put rev5；立即讀回及 78 秒後讀回皆為 77 題、53,239 bytes，原始 bytes 與核准包完全一致。未觸碰孩子進度 `p:` key。

canonical repo 的 ignored `data/private/study/g4-s1-math-u1/rev5-release/README.md` 與 `manifest.json` 保留發布前的 rev4 基線、自然 delta、fresh review、合併來源、候選 pack、必要來源 PDF 與公開定位快照；31 個歸檔檔案已核對 SHA256，其中 30 個複製檔與來源逐 byte 相同。這兩檔是歷史候選快照，正式發布稽核另見 `data/private/study/g4-s1-math-u1/rev5-release/release-audit/kv-20260923T0445Z/release-summary.json`，含發布前、立即與傳播後讀回的 count／bytes／hash，原始題包讀回留在同一 ignored 稽核目錄。

`node scripts/verify_private_study_pack.mjs <核准的SHA256>` 唯讀確認精確 ignored 輸出與 production parser；`node scripts/build-study-pattern-report.mjs --check` 只計算數學 57 題。自然覆蓋另按公開 selection metadata 整理首批概念、方法與後續缺口，不把原卷作答格當成可獨立上線的 activity。

能力驗證使用 synthetic 題包與隔離家庭服務；正式 Worker／Pages／KV 與發布後讀回已依序完成。**實體 iPad 尚未驗證**；舊 iPad checklist 豁免不因本批重新啟用。

### 隔離畫面驗收

在本機可用的 Playwright package 路徑設 `CODEX_PLAYWRIGHT_PACKAGE`，執行 `node tests/helpers/study-science-browser-check.mjs`。腳本啟動本機 fake KV 服務，分別用 390×844、768×1024、1024×768 viewport 的獨立 browser context 驗證 Study 與家長試玩；僅載入 synthetic 題包與 test-token。試玩 context 用現有 session API 交換隔離測試 Cookie，不開啟會產生背景請求的家長頁。逐尺寸驗證首頁自然入口、Study 單元與是非選項、試玩科目與單元切換、答錯後揭答、60 題固定導覽、實際 `innerWidth`、CSS 欄數、水平溢出、觸控選項高度、browser／KV 哨兵與嚴格 request allowlist。截圖存在 ignored `data/private/study/g4-s1-math-u1/browser-qa/`，不進 Git。

2026-09-23 的 synthetic 檢查：三個 viewport 的 `innerWidth` 都符合設定；Study 選項高度 56px；試玩篩選欄數依序為 1／3／3，導覽欄數為 2／3／3；390px 導覽 select 為 358px，768px 與 1024px 都是 280px；三者均無水平溢出，也未改動試玩進度、cache、session 或 fake KV 哨兵。這是模擬尺寸的 browser QA，並非實體 iPad 操作。
