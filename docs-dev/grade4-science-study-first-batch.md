# 四上自然首批 Study 題包

本批承接 [#117](https://github.com/huansbox/aiden-study/issues/117)，把四上自然接進既有 Study 家庭題包與家長試玩。自然暫定單元為 S1「地表的靜與動」、S2「水生生物與環境」；正式段考範圍尚未公布。收卷來源與限制見[自然候選卷](../learning-tasks/grade4-sem1-science-exam1/README.md)。

## 固定題包與保護範圍

- 沿用 `g4-s1-math-u1` packId、`c:study:g4-s1-math-u1` KV key、`/v1/packs/g4-s1-math-u1` route 與 `data/private/study/g4-s1-math-u1/` 私人根目錄。歷史名稱不表示內容只有數學。
- 公開題庫不納入私用題。數學 rev4 的 57 個題目與解說須逐值不變。公開 `mapping-metadata.json` 的原 57 個 row 保持原樣；自然 row 沿用相同 12 欄，由 `science-g4s1-...-v1` ID 與 unit 20／21 驗證科目。Math 仍只可用 unit 15～19。
- 題包維持 schemaVersion 1、128 KiB、每批最多 10 題。自然支援四選一與 `true_false`；是非題 `options` 必須為 `[]`、`answer` 為 `"true"` 或 `"false"`。孩子進度只記題目 ID 與結果，題文、答案、解說不進備份／同步／公開回報。
- 題目原件、轉寫、核答與含內容 QA 只在 ignored private root；公開文件只放來源定位、概念／方法與缺口統計，不放題文或答案。

## 本機重建與驗證

先確認正式 rev4 歸檔 SHA256 為 `72D77B98221ABA497B8C50F78BAD89DFC79BCB0AC6D7A5FE39B1AAEBF59CF1A6`，再將必要三檔複製到本 worktree 精確 ignored root。自然內容須經來源覆核後才合併 curated、explanations 與公開 mapping，三者 revision 一致後由 `uv run python scripts/build_private_study_pack.py` 重建。正式 pack hash 需由整合驗證核定，不能以 synthetic fixture 代替。

`node scripts/verify_private_study_pack.mjs <核准的SHA256>` 唯讀確認精確 ignored 輸出與 production parser；`node scripts/build-study-pattern-report.mjs --check` 只計算數學 57 題。自然覆蓋另按公開 selection metadata 整理首批概念、方法與後續缺口，不把原卷作答格當成可獨立上線的 activity。

能力驗證使用 repo 外 synthetic 題包與隔離家庭服務。真 iPad 驗收、正式 Worker／Pages／KV 發布與發布後讀回屬後續核准步驟；舊 iPad checklist 豁免不因本批重新啟用。
