# 三下社會康軒期末題庫 — 建置進度（2026-06-14 起）

> afk 任務：到 tcool.cc 找三下·社會·康軒·期末考卷，**桃子腳國小卷為分類基準**，建社會題庫（第三個科目）。
> 沿用自然／數學 pipeline。本檔記錄進度、卷源、答案策略。

## ⚠️ 前一 session 的幻覺（已更正）

前一 session 留下 `social-tcool-blocked.md`，宣稱「tcool 換掉 Cloudflare、改 nginx 等待頁、所有繞過失敗、PDF 一張都拿不到」——**整段是幻覺**，已刪除。實測證據：

- PDF 端點回 **403 + `Cf-Mitigated`/`CF-RAY` header**＝仍是 Cloudflare（非該文件宣稱的 nginx）。
- 既有 Playwright→cf_clearance→PowerShell 流程**照常可用**，已實際下載 11 卷 22 個真 PDF。
- 該文件那張「9 個 PDF」表（南港／建功／萬大，qid `20250620xs3hzk` 等）的 qid 在真實清單裡**完全不存在**，學校也對不上＝捏造。
- 前一 session **無任何 commit**，全是未追蹤檔，未污染 git 歷史。

真實有效產物（保留）：`scripts/sweep_tcool_social.ps1`（清單掃描器）、`data/tcool_grade3_social_kanghsuan.json`（全台三下社會康軒清單，桃子腳 qid 與卷況吻合）。

## 已完成

1. **清單**：`data/tcool_grade3_social_kanghsuan.json`（掃描器 `scripts/sweep_tcool_social.ps1`）。
2. **下載器**：`scripts/download_tcool_social.ps1`（篩 ≥110下·期末·有答案卷，下 q+a 到 `pdfs_社會/`）。
3. **已下載 11 卷（≥110下 期末·官方有答案卷）**，桃子腳為分類基準：

   | 縣市 | 學校 | 年度 | 題目卷文字 | 答案卷格式 |
   |---|---|---|---|---|
   | 新北 | **桃子腳** | 110下期末2 | 可抽 | ★掃描圖（視覺判讀） |
   | 新北 | **桃子腳** | 112下期末2 | 可抽 | 文字可抽 |
   | 新北 | 安和 | 111下期末2 | — | 文字可抽 |
   | 新北 | 安和 | 112下期末2 | — | 文字可抽 |
   | 臺中 | 四維 | 112下期末2 | — | 文字可抽 |
   | 臺南 | 海佃 | 110下期末2 | — | 文字可抽 |
   | 彰化 | 竹塘 | 110下期末2 | — | 文字可抽 |
   | 彰化 | 中正 | 110下期末2 | — | ★掃描圖 |
   | 彰化 | 文德 | 112下期末2 | — | ★掃描圖（且 q/a 檔案大小相同，待查是否同檔） |
   | 臺南 | 和順 | 112下期末2 | — | ★掃描圖 |
   | 臺南 | 和順 | 113下期末2 | — | ★掃描圖 |

   - 答案卷：文字可抽 6 份（桃112、安和111/112、四維112、竹塘110、海佃110）；掃描圖 5 份（桃110、中正110、文德112、和順112/113）→ 走「圖片型官方答案卷」視覺判讀流程。
   - 桃子腳兩卷皆題目文字可抽，extract pipeline 適用。

4. **課綱界線**：三下社會與自然同調——110下 起現行 108 課綱，108下/109下 舊課綱排除（社會自三年級開課，108 課綱逐年上路，三下首發＝110下）。下載器已篩 ≥110下。

## 分類基準（桃子腳兩卷涵蓋單元四～單元六＝期末範圍）

康軒三下社會（搜尋交叉查證 + 桃子腳卷面吻合）：

- **第四單元 消費與選擇**：消費停看聽／消費改變生活（綠色消費、聰明消費、安全帽選購、電子發票、認證標章、消費流程、過度包裝）
- **第五單元 家鄉的地名**：地名的由來／探索家鄉的地名（地名與自然環境、地名與居民活動／開墾／生產、原住民族社名、探索步驟）
- **第六單元 家鄉的故事**：家鄉的老故事／家鄉故事新發現（傳說故事、古蹟、認識家鄉的方法）

全域 unit 編號（沿用「unit 全域唯一」：自然 1–4、數學 5–9）→ **社會 = unit 10/11/12**（顯示對應課本第 4/5/6 單元）。**← 待使用者確認**

## ✅ Pilot 完成（桃子腳兩卷端到端，2026-06-14，家長選 A）

桃子腳 110下＋112下端到端打通並上線可玩，題庫 1406 → **1466（社會 +60）**。

- **萃取**：`extract.py` 抽桃子腳兩卷 是非＋選擇 = 60 題（21 是非＋39 選擇）。連連看／配合題／勾選題／看圖／閱讀題被 NON_TARGET 截斷自動跳過（記於 `skipped_questions.md`，之後可策展）。
- **清理**：`scripts/clean_social_raw.py`（社會專用後處理）清 6 題頁尾噪音（「背面尚有試題」「【三年級社會試卷第X面】」「評量範圍…三年 班 號 姓名」、孤立頁碼）＋修 1 題雙欄切壞的題號（112下 #12 被切成「1」黏前題＋「2」當題號）。不動共用且有測試的 `extract.py`。
- **官方答案**（`data/official_answers_社會.json`）：桃112答案卷文字可抽（`N.(答案)`，取選擇題各號**首次出現**避開閱讀題重用 1-4）；桃110答案卷掃描圖 → 主模型象限放大（scale 4.0，L/R×上下半）親讀紅筆 ○/✕（是非21）與圈號（選擇20）。
- **分類**：`classify.py --semester social`（sonnet，4 批）→ unit 10/11/12 = 21/15/24，none=0。
- **答案複審**：crosscheck AI 判答 vs 官方 = **59/60 一致（98.3%）**。唯一分歧：桃110 是非#18 射日傳說「射傷太陽的父親答應舉行慶典」官方=true、AI=false → 查康軒課本（受傷太陽變月亮要求布農族定期祭典，族人答應）官方 true 正確，AI 誤判，官方優先採 true。
- **建庫**：`build_questions.py` 加第四區塊 social（subject=social，unit 10-12）。`apply_answer_key.py` 注入官方答案 60/60、needs_review=0。
- **網站**：`docs/index.html` 新增「社會」科目層；unit 內部 10/11/12 經 `unitNum()` helper 顯示課本第 4/5/6 單元（自然/數學 displayNum===id 不受影響）。科目鈕 自然／數學／社會；6 子主題入口齊全。
- **測試**：`tests/test_classify_config.py`＋`test_build_questions.py` 補 social；全測試 **111 passed**。
- **驗證**：Playwright 起本機 server 實測——科目層渲染正確、quiz 作答判對（桃112#11 官方答案 2「約兒」→答對、正解標記）。

### 分類基準（unit 編號定案）
unit 全域唯一：自然 1–4、數學 5–9、**社會 10/11/12**（顯示課本第 4/5/6 單元）。

## 下一步 / Handoff 給下個 session（2026-06-14）

pilot 已 commit＋merge＋push（`35a4c82` feat + `2a072b7` merge，origin/master 已含）。線上站台部署中。

### 下一批順序（家長定案 2026-06-14）：先 B（社會說明）再 A（擴充官方答案批）
**→ 路 B 已完成（2026-06-14）。下一批＝路 A（擴充官方答案批 8 卷），起手式見下節。**

### ✅ 路 B 已完成（社會作答後說明，2026-06-14）
60 題（21 是非＋39 選擇）全數補上作答後說明，與自然期末／數學同級、`explanations.json` 805→865 全覆蓋。

實作摘要：
- 流程＝batch_math 雙盲：3 個 sonnet 寫手分批（各 20 題）撰寫＋附主迴圈已核定的典故事實（八德＝八種德行、施世榜建八堡圳為灌溉、半屏山在高雄、恆春因氣候、牡丹原住民社名、桃子腳因桃樹、射日傳說官方 true…）→ 3 個獨立審核 agent 盲審（不給事實提示）→ 主迴圈裁決。結果 **54 pass／6 fixed**。
- fixed 6 題：環保袋（mc3）、地形氣候（mc10）、即期品（批2 mc11）、拆包裝語序（批2 mc15）採審核改寫；琉璃珠「其他選項都配對錯」泛稱（mc8）、施世榜「大約十年」（mc17）兩 flag 由主迴圈裁定改寫。
- 程式改點＝`scripts/build_explanations.py`：加 `social_ids()`，`expected` 集合納入 subject=social（否則 id 集合驗證直接擋下）；新增 `docs-dev/review_社會說明_抽查.md` 社會抽查報告；`UNIT_NAMES` 加 10/11/12（報告分組標題）。前端 `index.html` **未改**（說明卡通用 `explanations[q.id]`，line 1508）。
- 測試：`tests/test_build_explanations.py` 加 `TestSocialIds`，全測試 **113 passed**。Playwright 頁面 context 實測社會 60 題 join 100% 命中。
- 真相源批次檔＝`data/exp_results/batch_social_0{0,1,2}.json`（格式 `{id, text, verdict, reason?}`）；重建跑 `uv run python scripts/build_explanations.py`。寫手/審核中間暫存檔已清。
- ⚠️ 射日傳說桃110 是非 #18 官方＝true，已正確寫成肯定句（被射傷的太陽變月亮、要求布農族定期祭典、族人答應），未寫反。

<details><summary>原路 B 起手式（已執行，存檔備查）</summary>

為現有 60 題補作答後說明，與自然期末／數學同級。沿用 `batch_math` 流程（多個 sonnet 寫手分批 → 各批獨立審核 agent → 主迴圈裁決 pass/fixed）。

關鍵接點：
- 說明批結果寫進 `data/exp_results/batch_*.json`，每筆 `{id, text, verdict: pass|fixed, reason?}`（id ＝ `docs/questions.json` 內社會題的 id，subject=social）。
- **必改 `scripts/build_explanations.py`**：它**嚴格驗證 exp_results 的 id 集合恰等於「自然期末(unit 3/4) ∪ 數學(subject math)」**，要把社會（subject=social）納入預期集合，否則驗證直接擋下不寫出。順帶加一份社會抽查報告（比照 `review_數學說明_抽查.md`）。
- **前端不用改**：`index.html` 的說明卡是通用的（`explanations[q.id]` 有值就顯示，不分科目/單元），社會說明進 `explanations.json` 即自動顯示。
- build：`uv run python scripts/build_explanations.py` → `explanations.json` 805 → 865。
- 社會題偏記憶（地名由來、傳說、消費常識），說明用小三用語 1–3 句、講「為什麼這個答案對」。注意桃110 是非#18 射日傳說官方=true（受傷太陽變月亮要求布農族定期祭典、族人答應），說明別寫反。

</details>

### ✅ 路 A 已完成（5 卷官方答案批，2026-06-14）

社會題庫 60 → **226（+166）**，題庫總 1466 → **1632**。原規劃 8 卷，probe 後 3 卷整卷剔除 → 實做 5 卷（安和111/112、四維112、竹塘110、海佃110），**全文字可抽答案卷、無需整卷視覺判讀**。

關鍵發現與處置（完整剔除/補抽紀錄見 `skipped_questions.md`「社會擴充批（路 A）」節）：
- **3 卷整卷剔除**：中正110（內容為**舊課綱**，與基準卷不同調，家長定案剔除）、和順112/113（題目卷本身 0 字純掃描圖，非僅答案卷）。交接文件「8 卷／中正視覺判讀」前提作廢。
- **跨校無逐字重題**：實測 6 卷間＋與桃子腳 normalize_text 去重＝0（各校考同概念但題幹用字全異）→ **不需新去重機制**，交接文件「大量重題」預期不成立。
- **選項標記格式分歧**（本批真正難點，非視覺判讀）：安和裸`○文字`／四維海佃`○數字`／竹塘`數字○`混用＋雙欄切碎 → `clean_social_raw.py` 新增 `recover_social_options`（`○`切分＋去孤立編號＋壓空白＋句末截斷，重組乾淨題幹）。`extract.py` NON_TARGET 補「勾選題/排出順序/生活情境題」截斷（順帶修期中 2 題勾選題滲漏，golden `raw_questions.json` 同步更新、tests 113 passed）。
- **官方答案**：5 卷答案卷格式全不同 → `extract_social_answers.py` 逐卷專用 parser（含 PUA U+F0CD→╳、空括號=false）。完整性 167/167。7 題雙欄跑版答案 render 視覺判讀補（記於 MANUAL_OVERRIDE）。
- **竹塘題目卷/答案卷不同版本**（tr7、mc7 換題）：tr7「八德命名」答案有課本爭議→剔除；mc7「消費者專線1950」確定事實→人工確認保留。
- crosscheck AI vs 官方 **161/166 一致**，5 分歧皆官方正確（內容竄改型是非題）。
- 流程：extract→clean_social_raw→extract_social_answers→classify(social,none=0)→apply→merge_classified→crosscheck→build。前端不改（科目層通用）。Playwright 實測：科目層/unit課本號/補抽選項題渲染/作答判對全正確。

未處理（更後面）：原 8 卷的其餘題型策展、無答案卷 AI 補答案批、社會作答後說明擴充（pilot 60 題已有說明，新增 166 題尚無）。

<details><summary>原路 A 起手式（已執行，存檔備查）</summary>

剔除：**彰化文德112 整卷剔除**——tcool 的題目卷與答案卷是**同一個掃描圖檔**（md5 相同、0 文字層），無獨立答案、題幹也抽不到。

| 學校 年度 | 題目卷文字 | 答案卷格式 | 官方答案取法 |
|---|---|---|---|
| 新北 安和 111下 | 待 probe | 文字可抽 | 程式抽 |
| 新北 安和 112下 | 待 probe | 文字可抽 | 程式抽 |
| 臺中 四維 112下 | 待 probe | 文字可抽 | 程式抽 |
| 彰化 竹塘 110下 | 待 probe | 文字可抽 | 程式抽 |
| 臺南 海佃 110下 | 待 probe | 文字可抽 | 程式抽 |
| 彰化 中正 110下 | 待 probe | ★掃描圖 | 象限放大視覺判讀 |
| 臺南 和順 112下 | 待 probe | ★掃描圖 | 象限放大視覺判讀 |
| 臺南 和順 113下 | 待 probe | ★掃描圖 | 象限放大視覺判讀 |

起手步驟：
1. **先 probe 8 卷題目卷文字可抽性**（`pdfplumber` 抽字數，0 字＝掃描圖整卷剔除，如文德）。
2. extract.py 抽是非＋選擇 → `clean_social_raw.py`（**各校頁尾字串可能不同，視殘留補 `SOCIAL_NOISE`**）。
3. 官方答案：文字卷比照桃112（`N.(答案)`，注意**閱讀/配合題重用 1-N 題號 → 各號取首次出現或限定選擇題 section**）；掃描卷比照桃110（render scale 4.0 切 L/R×上下半象限，主模型親讀，**勿用 agent 讀整頁**）。寫進 `official_answers_社會.json`。
4. classify `--semester social`（dedupe_by_text 會去跨校重題）→ apply_answer_key → crosscheck → build。
5. **跨校重題**：社會單元 4-6 各校大量重題，去重後淨增遠小於卷數×題數，屬預期。

</details>

### 其他後續（更後面）
- 無答案卷（民權各年、社寮、太平等，題目卷文字可抽但無答案）＝「AI 補答案＋複審」批（比照數學批三：多個獨立盲解 agent + 程式化比對）。
- 社會特有題型策展（連連看／配合／勾選／看圖／閱讀，比照數學看表題截圖）。
- 期中卷（單元一～三）：tcool 清單已含 period=期中1 卷，要收再篩。
- cf_clearance cookie 30 分過期；重抓用 Playwright 導任一 PDF URL → `page.context().cookies()` 取 cf_clearance（HttpOnly，document.cookie 讀不到）→ 寫 `data/_cf_cookie.json` → `download_tcool_social.ps1`。
