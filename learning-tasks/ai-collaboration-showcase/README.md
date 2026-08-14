# 怎麼和 AI 一起做出探險卡

> 建立日期：2026-08-14
> 對象：不熟悉 AI、GitHub 或軟體開發術語的家人
> 狀態：第一版已完成並部署
> 網址：https://ai-zoo-cards-story.pages.dev/

## 目的

用新竹動物園探險卡的真實製作過程，讓孩子媽媽看見：好成品不是靠一句神奇指令產生，而是由使用者持續觀察草稿、用日常語言指出差距、請另一雙眼睛檢查，最後由人決定何時完成。

主敘事固定採用「爸爸當時真的怎麼說 → 這句哪裡有效 → 成品因此怎麼改」，盡量保留原本的中英文混用、不確定語氣與短句，不重寫成完美 prompt。

## 內容

- `source/index.html`：單頁故事網站真相源，零外部相依。
- `source/build-site.mjs`：建立 Cloudflare Pages 部署目錄。
- `source/_headers`：禁止搜尋引擎索引的回應 header。
- `assets/before/`：對話過程中使用者實際看到並回饋的舊版截圖。
- `assets/pdf-pages/`：最終 PDF 的 5 頁網頁預覽。
- `output/site/`：本機 build 產物，不進 Git；含完整 PDF，直接交給 Cloudflare Pages 部署。

## 建置與預覽

```bash
node learning-tasks/ai-collaboration-showcase/source/build-site.mjs
uv run python -m http.server 8788 -d learning-tasks/ai-collaboration-showcase/output/site
```

部署到既有的 Cloudflare Pages 專案：

```bash
npx wrangler pages deploy learning-tasks/ai-collaboration-showcase/output/site \
  --project-name ai-zoo-cards-story \
  --branch master
```

最終 PDF 的真相源仍是 `../hsinchu-zoo-adventure/output/hsinchu-zoo-adventure-cards-half-label-a4.pdf`，build 時才複製到部署目錄，避免 Git 保存第二份 15 MB 檔案。

## 隱私與用語

- 公開頁面只稱「爸爸」「媽媽」「弟弟」，不放孩子姓名、帳號、電腦路徑或完整歷史對話。
- 爸爸原話盡量逐字保留；只選和協作方法有關的片段。
- `agent review` 在主敘事翻成「請沒有參與前面討論的 AI，換一雙眼睛檢查」；原術語只在爸爸原話中保留。
- 網站可由知道網址的人直接觀看，但以 `noindex`／`nofollow` 避免搜尋引擎收錄。
