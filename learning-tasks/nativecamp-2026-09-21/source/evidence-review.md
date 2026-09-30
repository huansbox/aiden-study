# 2026-09-21 Alex：來源與查核範圍

課程 19:30（Asia/Taipei）；Oxford Discover 1；Communicate（頁面線索 114–115）、其後 Get Ready 與標題預測活動。來源概念與六題安排見 [lesson-brief.md](lesson-brief.md)。只公開去識別摘要，私人完整逐字稿、網址與錄音皆留 ignored 路徑。

## 原回放

已讀取 [download-verification.json](download-verification.json) 並核對本機 ASR 的來源 SHA256。track 1 為 11,575,845 bytes、1529.138 秒，Opus／2 聲道／48,000 Hz，完整解碼為 passed；輸出時間軸使用 asetpts=N/SR/TB 正規化，原檔未改。檔案相對路徑為 `../assets/audio/2026-09-21-track-1.webm`。

SHA256：`cd97d2b7cc4639571392f1694afa7b42b3d522e0f0526dac306f39c779130996`。這些是整合流程的下載和解碼證據；本文沒有重新下載原件，解碼通過也不等於內容、身分或發音都已驗證。

## 本機雙聲道抽查

已親讀 source/private/source-channel-asr.json：7 個時間窗，各辨識兩個聲道，共 570 秒來源範圍。模型 small.en，沒有 initial prompt，未上傳，未人耳全課驗聽，也未完成 speaker diarization。所有 sample sourceSha256 與原檔一致；每窗兩聲道均有非零 RMS。channel 0／1 不固定標成老師／學生，教材播放也可能進入聲道。

| track 1 時間 | 秒數 | 可支持的內容與界線 |
| --- | ---: | --- |
| 03:05–04:20 | 75 | 玩具詞彙與跟讀活動；games、comic book、doll、stickers、pins 等可辨。 |
| 07:20–08:50 | 90 | 教材音訊可辨 have／want、第三人稱 wants 及交換後所有關係；播放內容不可當成孩子獨立回答。 |
| 11:00–12:25 | 85 | 禮貌借物與交換角色練習可辨；只採借物句型，不複製對話或角色。 |
| 13:00–14:10 | 70 | verb／action word 及 sell、ride、grow、build 等動作詞。 |
| 14:50–16:15 | 85 | 以 sell、grow、mix 造句，局部轉錄有 Lego 等誤字；新題另用明確虛構動作。 |
| 16:40–17:55 | 75 | job、doctor、police officer、teacher 及成長後的職業願望提問。 |
| 21:50–23:20 | 90 | 前段含發音練習，後段明示由 titles、headings、pictures 推測主題。 |

沒有另做單字配對或 pants 發音評分；完整句需求用新題回應，但不公開課後私人對話、不把家長或老師的程度評語當成客觀測量。網站對部分教材詞語及 speaker 的標記有誤，不把錯字或「全部答對」的評語直接轉成孩子能力結論。

## 證據限制

網站和本機 ASR 皆可能漏字、誤標 speaker、把教材音檔當成學生發言。只據所列範圍確認出題內容，不宣稱孩子有固定錯誤、獨立答對、跟讀程度或發音掌握度；未取樣處仍只有網站線索。公開題文均另行原創，並非原錄音逐字重現。

正式 TTS 的輸入指紋、SHA256、完整解碼、無提示 ASR、獨立內容審查及發布檢查另留整合紀錄；本文不冒充这些項目已完成。
