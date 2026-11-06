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
- `decimal`：非負十進位字串，整數部分最多八位，小數部分最多兩位。作答接受 `.52`、`7.90` 等等值寫法，拒絕單位、逗號、科學記號及超過兩位小數。可選 `range` 指定連續容許區間；`answer` 是區間內示例，不能拿幾個離散示例代替連續範圍。
- `comparison`：`<`、`>`、`=`。
- `select`：答案是原 `options` 的 1-based 字串索引。只要題組含 select，頂層需有 2–15 個原選項；沒有 select 則 `options=[]`。不得補造干擾項。
- `text`：答案最多20字，可有最多8個 `aliases`；比對採 NFKC 與前後空白正規化，不做子字串或模糊比對。
- `fraction`：必須有 `form`，答案為 `n/d`、`w n/d` 或允許的整數，各數字最多六位。`proper` 要求真分數；`improper` 要求假分數；`proper_or_improper` 要求分數形式；`mixed` 要求正整數部分加真分數；`mixed_or_whole` 另允許整數。可有最多8個明列、同值且同形式的 `accept` 字串。預設接受同形式的有理數等值答案（包括約分），以整數交叉相乘判斷；不因浮點誤差接受近似值。只有原題明示指定分母時，才加選用的 `denominator`（1–999999 整數），其值必須與 `answer` 及各 `accept` 的書寫分母相同。`any` 保留原題允許的整數、真假分數與合理帶分數，不接受小數或算式。整數含0；帶分數整數部分可為0，分數部分須0≤n<d；接受0/n及零分子的等值表示，拒絕不標準的 `2 7/3`。仍使用各數最多六位、分母非零與BigInt交叉相乘。只適用固定值 `fraction`，不擴大 `fraction_interval` 的形式守衛。
- `fraction_interval`：開放分數答案。`answer` 固定為空字串，必須有 `form`、`count`（1–4）、`distinct: true`、`range`。每個答案獨立填整數／分子／分母，作答值為 `count` 個字串的陣列。各答案都要符合形式及區間，而且有理數值兩兩不同；相同數值換分母不能算兩個答案。答案提示說明完整條件，不以少數示例冒充全部答案。

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

## 精確區間

`range` 固定包含 `min`、`max`、`minInclusive`、`maxInclusive`。上下界使用 `[分子, 分母]`；分子是非負 safe integer，分母是正 safe integer（上限 9007199254740991），下界必須小於上界。包含端點與否由兩個 boolean 明示，拒絕額外欄位。JavaScript 用 BigInt、Python 用整數交叉相乘。小數的上下界仍不得超過 99999999.99，且 `answer` 必須位於區間。

合成範例：

```json
{"input":"fraction_interval","answer":"","form":"mixed","count":2,"distinct":true,"range":{"min":[2,1],"max":[5,2],"minInclusive":false,"maxInclusive":false}}
```

這個範例接受 `2 1/3` 與 `2 1/4`，拒絕 `2 1/3` 與 `2 2/6`，也拒絕端點 `2 1/2`。這是有界資料契約，不執行題包提供的程式或任意 predicate。

所有新增欄位、上下界、端點政策與輸入個數都參與 semantic revision 比對。新契約只走 math 24–28；舊單元的判分方式保持不變。Study 與家長試玩共用輸入及判分，答後每格導覽顯示「答對／要修正」；切換格子保留結果，修改答案才清除舊結果。

## U7 有引導的小數列式

僅 unit 25 可用 `decimal_expression`：

```json
{"input":"decimal_expression","answer":"6.8-1.25","value":"5.55"}
```

`answer` 是不含等號的參考算式，`value` 是結果；兩者均參與 semantic。結果與各字面數字最多四位整數、兩位小數。允許加減、括號、可選 `＝結果`；以百分位整數精確計算。實際作答必須有運算子、結果正確、數字字面值的 multiset 與參考相同（`6.80` 與 `6.8` 同值）。只寫 `5.55`、用其他數字湊出結果，或寫錯等號右側都不通過。完整文法、界限與 Python API 見 [操作契約](study-math-interactions.md#有引導的小數列式與直式前置步驟)。

換算題可將 `decimal` 換算格、`decimal_expression` 列式格與 `decimal` 結果格放在同一道題；每格結果明示，整題只記一次成果。保留原題文並另寫明本次數位引導路線；不可宣稱所有原始自由解法均支援。私人 provenance 記錄數位引導改編，公開測試一律使用合成資料。

## Production 核答 provenance

math 24–28 的 mapping `reviewStatus` 僅接受三種完成狀態；`pending`、未知字串或其他科目專用狀態不得建包。math 15–19 的既有規則不受這個新增 gate 影響。

| reviewStatus | 適用證據 | answerPage |
| --- | --- | --- |
| `independently_recomputed_and_matches_official` | 獨立重算且與取得的官答一致 | 正整數 |
| `independently_solved_twice_no_official_answer` | 未取得官答，已完成兩次獨立解題 | null |
| `independently_recomputed_with_documented_official_correction` | 已取得官答，經獨立重算及具體證據確認需修正官答／定義解讀 | 正整數 |

第三種不能冒充「官答一致」或「沒有官答」。修正理由摘要放既有 `sourceAdaptation`，完整證據與核定理由保存於私人內容 ledger；不增加題包中的私密資訊欄位。curated verification 仍須與 mapping reviewStatus 一致。此 gate 是資料狀態與頁碼一致性的檢查，不會自行完成內容獨立審查或 production 核准。

## 操作題接入

七種 `interaction` 型態由 [四種運算操作契約](study-math-interactions.md) 與 [三種幾何操作契約](study-math-geometry.md) 定義；`digitalAdaptation` 等於type。`scene.image`沿數學PNG32KiB/1600px限制，真實寬高須等於scene寬高，圖與工具共用同一校準座標。所有interaction欄位納入同ID不可變更的semantic。操作草稿只存在各孩子本機，不改已評分進度同步契約；送出或重設會清除，preview只用記憶體。
