# Native Camp 課後複習：2026-09-19 Zibuyile

課程：2026-09-19 19:30（Asia/Taipei）；lesson ID：`2026-09-19-zibuyile`。依實際課程內容製作 4 概念、24 題，主題為水果內部、I／you 視角、合併數量、How many 問句。所有人物、物品與數量是原創虛構情境，Say it 由家長陪同。

Try it 各概念使用 Build／Change／Fix 三階段，要求完整句；Change 改變句型、條件、單複數或說話視角。每概念 Say it 三題，提供短句架、示範與合理替代句。本堂是全新課，沒有 tryRevision；Preview 不顯示 Updated／Original。完成課程收起，首次紀錄保留。

## 來源與使用

- [lesson-source.json](source/lesson-source.json)：可編輯題文真相源。
- [lesson-brief.md](source/lesson-brief.md)：來源時間、概念取捨、各題答案與家長判準。
- [evidence-review.md](source/evidence-review.md)：已下載原音、局部本機雙聲道 ASR 與未確認界線。
- [download-verification.json](source/download-verification.json)：各軌格式、雜湊、bytes 與完整解碼證據。

本堂網站逐字稿指出教材書本第 102–103 頁（檔案頁約 104 起），主要是水果、pit／seeds、把雙方數量合併與完整問答，最後有標點用途。網站回放分三軌，第二與第三軌高度重疊，不能算成兩次獨立教學或孩子兩次練習。

私人錄音保留 ignored 的 assets/audio，詳細逐字稿／ASR 及存取連結保留 ignored 的 source/private；不隨 Git 提供。來源支持課內內容，不代表孩子掌握度判讀。

## 再製與交付

從 repo 根目錄執行：

```powershell
uv run --offline --python 3.13 learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-19-zibuyile
uv run --offline --python 3.13 learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-19-zibuyile --check
```

builder 產生 docs/nativecamp/lessons/2026-09-19-zibuyile.json 與 source/speech-jobs.json，共 48 段問題／答案語音工作。正式聲音指定 OpenAI Marin、speed 1.0，只製作原創文字，未使用老師或孩子聲音。依[共用工具](../shared/nativecamp/README.md)與[原課 SOP](../nativecamp-review-pilot/lesson-sop.md)另行製作音檔；改過語音文字必須重製受影響 MP3，單跑 builder 不算音文已一致。

已完成原創題包、OpenAI 預製語音與逐檔 ASR、獨立內容審查，以及合成進度的桌面／窄版操作驗證。詳見[本批交付與驗證](../../docs-dev/nativecamp-next-five.md)及[#130 發布紀錄](https://github.com/huansbox/aiden-study/issues/130)。人耳全檔自然度、iPad 真機、孩子難度與耗時未測。

本堂不新增 Weekly Review，也不建立或恢復排程；只有家長明確要求時另做週複習。
