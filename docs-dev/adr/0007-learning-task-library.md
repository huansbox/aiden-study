# 一次性家庭學習活動歸入 learning-tasks 任務庫

脈絡：全家學習平台已用 monorepo、`docs/<app>/` 與 registry 解決學習 app 散落和日後遺忘的問題。新竹動物園探險卡證明，repo 也會累積另一類成果：有特定活動情境、可重印或改編，但不需要部署、保存進度或出現在 hub 的一次性學習任務。若繼續散放在 `docs-dev/`，新 session 不容易區分成品、可重用經驗與技術文件，也沒有固定入口可搜尋。

決定（2026-08-14）：新增 `learning-tasks/` 作為家庭學習任務庫。每個任務使用獨立資料夾；`learning-tasks/README.md` 是索引與操作規則的唯一真相源。Codex 的 `AGENTS.md` 與 Claude Code 的 `CLAUDE.md` 都只負責把新 session 導向該索引。

任務與 app 的邊界：長期反覆使用、由 hub 開啟並通常保存互動狀態或進度者，仍放在 `docs/<app>/` 並由 `docs/registry.json` 管理；有特定活動、場地或日期的素材包放在 `learning-tasks/<task>/`，不登記為 app。ADR、pipeline、技術研究與人工驗收仍屬 `docs-dev/`。

共用策略：沿用 ADR-0001「同一棵樹先讓內容看得見」的精神，不先打造大型 framework。原則、模板或素材第一次出現時留在任務內；至少被第二個不同任務實際重用後，才提升到 `learning-tasks/shared/`，並記錄使用案例與適用邊界。

代價：同一 repo 多一種頂層內容，且 README 索引需要人工同步。以單人維護規模而言，單一 Markdown 索引比新增 schema、產生器或資料庫簡單；若任務量大到人工索引經常失準，再評估結構化 registry。
