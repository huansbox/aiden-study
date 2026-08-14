# 家庭學習任務庫

這裡保存場館、旅行、節慶與其他一次性學習活動的可重建成品，以及從實作中得到、可供下一個任務參考的經驗。它是新 session 規劃家庭學習任務時的第一個搜尋入口。

## 開始新任務

1. 先在下方索引依對象、情境與玩法找相近案例。
2. 閱讀相近任務的 `README.md`、經驗文件與可用素材；只沿用符合本次孩子、場地與時間限制的部分。
3. 判斷新需求是一次性 `task` 還是長期 `app`，不要因為會用到 HTML 或圖片就一律做成 app。
4. 判定為 task 後，立即建立 `learning-tasks/<task>/`，從一開始就把 source、assets 與 output 寫在該處；同時加入本索引並標示狀態，避免多 session 工作散落到 `docs-dev/` 或臨時目錄。
5. 任務完成後，把索引狀態改為「已完成」，並補齊任務日期、最終成品與再製說明。
6. 同一原則、模板或素材在第二個不同任務實際重用後，再整理到 `shared/`；第一次出現時先留在原任務，避免過早抽象。

## 任務索引

| 任務 | 狀態 | 日期 | 對象 | 情境與玩法 | 可重用經驗／素材 |
| --- | --- | --- | --- | --- | --- |
| [新竹動物園小小探險](hsinchu-zoo-adventure/) | 已完成 | 2026-08-14 | 5.5 歲弟弟；一位成人陪同 | 火車地理、園區選路、動物特徵觀察、昆蟲分類；卡片可任意中止 | [幼兒現場觀察任務卡經驗](hsinchu-zoo-adventure/design-lessons.md)、大 Poker／A4 二分標籤卡來源、圖資與 PDF |
| [怎麼和 AI 一起做出探險卡](ai-collaboration-showcase/) | 已完成 | 2026-08-14 | 不熟悉 AI 工具的家人 | 用爸爸的真實原話與修改前後案例，說明如何觀察結果、持續給回饋並保留最後決定權 | 手機優先靜態故事頁、[Cloudflare Pages](https://ai-zoo-cards-story.pages.dev/) |

搜尋建議：`幼兒`、`5～6 歲`、`旅行`、`場館`、`動物`、`觀察卡`、`地圖`、`火車`、`可中止`、`A4 二分標籤`、`大 Poker`。

## 分類邊界

| 類型 | 放置位置 | 判斷方式 |
| --- | --- | --- |
| 學習 app | `docs/<app>/` | 長期反覆使用、由 hub 開啟，通常有互動狀態或進度；在 `docs/registry.json` 登記 |
| 學習任務 | `learning-tasks/<task>/` | 有特定活動、場地或日期的素材包；完成後仍值得重印、改編或參考 |
| 任務共用資源 | `learning-tasks/shared/` | 已由至少兩個不同任務實際驗證可重用的原則、模板或素材 |
| 開發文件 | `docs-dev/` | ADR、pipeline 設計、技術研究、人工驗收與 repo 維運文件 |

這套做法延續平台 monorepo 的核心原則：用同一棵 repo 樹對抗遺忘，讓新工作先看見可沿用的內容；但不把一次性任務註冊成 app，也不為所有活動抽一套大型 framework。決策脈絡見 [`docs-dev/adr/0007-learning-task-library.md`](../docs-dev/adr/0007-learning-task-library.md)。

## 任務資料夾規格

建議結構如下；沒有相應內容時不必建立空資料夾。

```text
learning-tasks/<task>/
  README.md          任務目的、對象、用法、內容索引與再製方式
  source/            可編輯真相源、prompt、題目與設計規格
  assets/            成品實際使用的圖片、音訊或其他素材
  output/            可直接使用或列印的 PDF、preview 等交付物
  design-lessons.md  從本任務提煉、但尚未證明跨任務通用的經驗（選用）
```

歸檔時遵循以下原則：

- 保留重建最終交付物所需的來源、實際引用素材、最終成品與少量代表性 preview。
- 不保存每一輪 render、未採用生成圖或重複 master；Git history 不是生成暫存區。
- `README.md` 要讓沒看過原對話的新 session 能知道「這是什麼、適合誰、如何使用、如何重建」。
- 建立任務時就加入索引，狀態使用「進行中」；完成後改為「已完成」。多 session 工作的進度與 blocker 仍依 repo 的 tracker／HANDOFF 規則管理，不把細節複製進本索引。
- 已完成且沒有後續工作的任務不另開 issue，也不留在執行中 `HANDOFF` 或 roadmap；commit、task README 與本索引就是歷史入口。
- `shared/` 只收經跨任務驗證的內容，並由使用它的任務反向連結，避免形成無人知道用途的素材堆。
