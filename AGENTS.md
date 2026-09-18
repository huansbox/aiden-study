# Aiden Study repo guidance

## 文件入口

- 找既有作品先看 `README.md` 的「作品總覽」；主線外作品回查其 PR／分支，不把目前 checkout 當成全部成果。跨裝置工作前先確認分支與遠端，保留他處正在開發的內容。

## 家庭學習任務

- 規劃、建立或歸檔家庭學習活動前，先讀並遵循 `learning-tasks/README.md`；該檔是 task／app／shared 分類、資料夾規格與登錄操作的入口。任務資料以 `learning-tasks/catalog.json` 為準，App 仍以 `docs/registry.json` 為準；README 作品清單與家長白板是產物，不另手改同一份名稱、狀態或日期。
- 新增／修改登錄後執行 `node scripts/build-work-catalog.mjs`，以 `--check` 驗證；不漏掉主線外的已登錄來源、不把 `shared/` 算成作品。維護方式與日期／狀態語意見 `docs-dev/parent-whiteboard.md`。

## 練習不中斷

- 所有子 App 的任務完成、徽章、成就與獎勵提示，只能在回合／批次結束畫面出現。作答期間先保存成果，不彈出慶祝；正常的答對／答錯、提示與教學回饋保留。
- 共用統計用 `family.record()` 即時記錄，結束畫面就緒後呼叫 `family.finishRound()` 合併顯示獎勵；`setActive(false)`（暫停、看回饋或切背景）不代表回合完成。新回合開始會收掉前一回合提示。
- 回合界線：題庫與注音一批、拼字一輪、數織一題、長除法普通練習一整題／魔王挑戰整場。新增 App 時必須明確接上自身的結束畫面。
