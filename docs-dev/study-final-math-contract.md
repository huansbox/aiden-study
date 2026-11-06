# 四上數學後半冊：基本輸入與作者交付

追蹤 [#249](https://github.com/huansbox/aiden-study/issues/249)。本段只支援 unit 24–28 的基本題型；原題要求列式、直式對齊、作圖、量測或開放答案時，不能改成只填最後數字。本文件中的例子都是合成資料。

## 題型與輸入

| 類型 | 必要欄位與限制 |
| --- | --- |
| `multiple_choice` | 原四個 `options`，`answer` 為 `"1"`–`"4"` |
| `true_false` | `options=[]`，`answer="true"` 或 `"false"` |
| `choice_set` | 原 2–10 個 `options`，`answer=""`，`answerSet` 為不重複、非空的 1-based 字串索引陣列；完整集合相同才正確，順序不計 |
| `fill_in_blank` | `answer=""`，1–9 個 `blanks`；題幹保留對應全形 `（１）` 標記。可以混合下列輸入 |

每個 blank 都有 `input` 與字串 `answer`，其餘欄位依型態限定：

- `number`：正規化非負整數，1–8 位數。不接受 `accept` 或估讀誤差。
- `decimal`：非負十進位字串，整數部分最多八位，小數部分最多兩位。作答接受 `.52`、`7.90` 等等值寫法，拒絕單位、逗號、科學記號及超過兩位小數。
- `comparison`：`<`、`>`、`=`。
- `select`：答案是原 `options` 的 1-based 字串索引。只要題組含 select，頂層需有 2–15 個原選項；沒有 select 則 `options=[]`。不得補造干擾項。
- `text`：答案最多20字，可有最多8個 `aliases`；比對採 NFKC 與前後空白正規化，不做子字串或模糊比對。
- `fraction`：必須有 `form`，答案為 `n/d`、`w n/d` 或允許的整數，各數字最多六位。`improper` 要求假分數；`proper_or_improper` 要求分數形式；`mixed` 要求正整數部分加真分數；`mixed_or_whole` 另允許整數。可有最多8個明列、同值且同形式的 `accept` 字串。預設保留指定分母，不自動接受約分。`any` 與開放答案 predicate 尚未開放。

數學 unit 24–28 可附既有 PNG `material`，單張仍為32 KiB、雙邊1600px；不開放 table。舊數學 unit 15–19 的型態、媒體與輸入守衛保持。

## 三份 production delta

交付 JSON object，不用頂層 array。三份檔案的 `schemaVersion=1`、`packId="g4-s1-math-u1"`、`revision` 相同；候選 revision 由整合者指定。私用原題與答案不得提交 Git。

`curated-delta.json`：

```json
{
  "schemaVersion": 1,
  "packId": "g4-s1-math-u1",
  "revision": 23,
  "items": [{
    "practiceId": "FINAL-SYNTHETIC-01",
    "originalId": "synthetic-paper-II-1",
    "paperId": "synthetic-paper",
    "questionPage": 1,
    "answerPage": null,
    "concept": "合成概念",
    "adaptation": "保留原條件的合成說明",
    "verification": "independently_solved_twice_no_official_answer",
    "question": {
      "id": "math-g4s1-synthetic-final-01-v1",
      "subject": "math",
      "unit": 25,
      "type": "fill_in_blank",
      "text": "合成題目（１）",
      "subtopic": "合成概念",
      "options": [],
      "answer": "",
      "blanks": [{"input": "decimal", "answer": "0.52"}]
    }
  }]
}
```

`question` 不放 `source`；builder 會從來源 mapping 生成。除適用型態的 `blanks`／`answerSet`／`parts`／`material` 等已支援欄位外，不加 `HOLD`、`needsRuntime` 或審查註記；這些保存在獨立 ledger。

`explanations-delta.json` 的外層同前三個版本欄位，第四欄為 `entries`，每筆只有 `{"id":"…","text":"合成解說。"}`。

`mapping-delta.json` 外層為 `schemaVersion`、`packId`、`revision`、非空 `sourceTask`、非空 `sourceMapping`、`items`。每筆精確欄位如下：

`appId`、`practiceId`、`originalId`、`paperId`、`questionPage`、`answerPage`、`concept`、`contextPolicy`、`digitalAdaptation`、`sourceAdaptation`、`reviewStatus`、`unit`。

`appId` 對應 question.id；其餘來源欄位與 curated 一致；`sourceAdaptation` 等於 curated.adaptation，`reviewStatus` 等於 curated.verification。固定格式的 digitalAdaptation 是 type 本身；填空使用 `fill_in_blank:<input>`，混合輸入則用 `fill_in_blank:mixed`，不要以第一格型態代表整組。

核答聲明依實際證據填入，不能把 available 或 pending 升格：有對版官方逐格核對者用 `independently_recomputed_and_matches_official` 與正整數 answerPage；沒有取得官方而已完成兩份獨立解答核對者用 `independently_solved_twice_no_official_answer` 與 `answerPage=null`。如有非雙盲流程，另在 ledger 如實保留，不把「獨立核答」改述為「全部雙盲」。

整合前依 root 核准集合選入，保留原完整 rev22 基線。題文、選項、答案、解說或圖改動都必須附明確來源定位與獨立核對，schema 通過不等於內容核准。孩子端大主題映射由整合階段統一接入，不因新增細標籤產生大量選單。
