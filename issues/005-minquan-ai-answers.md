## Parent PRD

`issues/prd.md`（Implementation Decisions：答案合併規則；Further Notes：複查清單）

## What to build

處理**無官方答案卷**的民權國小 4 份期末考卷（臺北市唯一來源）：題目卷括號為空，只有題目文字，答案由 AI 補並標記供人工複查。

- 萃取民權題目卷（格式B，空括號），只取題目文字、答案留空。
- 走 #4 分類器：偵測「無原始答案」→ 由 AI 補答案，並把這些題標記為「需複查」。
- **複查清單形式（預設，釘死，可後改）**：把 AI 補答案的題目輸出成 `skipped_questions.md` 同風格的期末複查清單檔，供家長逐題核對。
- 民權題目分類出正確 unit(3/4) 與 subtopic，併入 `docs/questions.json`。

## Acceptance criteria

- [ ] 民權 4 份題目卷萃取出是非＋選擇題（答案留空）
- [ ] 無官方答案的題由 AI 補答案
- [ ] AI 補答案的題被標記為需複查
- [ ] 產出期末複查清單檔（skipped 風格），列出所有 AI 補答案題
- [ ] 民權題目帶正確 unit/subtopic 併入 `docs/questions.json`
- [ ] 網站能練到民權題目

## Blocked by

- Blocked by `issues/004-ai-classifier-subtopic.md`

## User stories addressed

- User story 4
