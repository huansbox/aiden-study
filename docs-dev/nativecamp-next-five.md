# Native Camp：2026-09-18～21 五堂複習

使用者要求「再5堂課」，依 2026-09-27 可讀的 Native Camp 課程紀錄，排除已發布課程後，選取以下五堂。工作追蹤為 [#130](https://github.com/huansbox/aiden-study/issues/130)，基線為 `6c463288bdac6293507fd6260eb1ad32b3e0777d`。

| lesson ID | 課程時間（臺北） | 講師 | 固定聲音 |
| --- | --- | --- | --- |
| 2026-09-21 | 09/21 19:30 | Alex | Marin |
| 2026-09-20 | 09/20 20:30 | Kyla | Cedar |
| 2026-09-19-zibuyile | 09/19 19:30 | Zibuyile | Marin |
| 2026-09-19 | 09/19 08:00 | Edon | Cedar |
| 2026-09-18 | 09/18 19:30 | Zeus | Marin |

9/19 是兩堂獨立課，使用不同 lesson ID、題包、音檔及進度。新課原生使用 Build／Change／Fix，不建立 Updated／Original 改版切換；既有課程、音檔與作答紀錄保留。

## 來源與製作方式

每堂資料保存在 `learning-tasks/nativecamp-<lesson-id>/`，原始回放位於 ignored 的 `assets/audio/`；課程網址、完整網站逐字稿與本機分聲道 ASR 位於 ignored 的 `source/private/`。公開來源文件只保留課程身分、概念映射、時間範圍與去識別摘要；簽章下載網址不公開。

來源錄音完整解碼使用 `asetpts=N/SR/TB` 正規化解碼時間軸，不修改原始錄音。離線 `small.en` 分聲道取樣只核對教學範圍，不等於全課逐字核對、人耳驗聽或老師／學生完整身分分離。網站逐字稿的發言者標籤、漏字與誤字不能作為孩子能力評分。

## 出題與語音契約

沿用[製作 SOP](../learning-tasks/nativecamp-review-pilot/lesson-sop.md)。每概念 Try／Say 各三題；Try 前兩題使用完整句排列與實際條件變換，第三題是單字修正補強。字卡保留一至兩個合理混淆字，明示剩餘字數；多個自然排列須全數接受或以句首要求消除歧義。口說有可見的虛構情境與完整句提示，揭曉前不提供完整答案。

每課使用固定聲音、正常 speed 1.0 的 OpenAI 預製 MP3。API key 只由已授權的 Windows current-user DPAPI 與固定 helper 取用，request journal 私下保存；孩子重播不呼叫 API。問題朗讀稿以自然連接的句子呈現要求，避免尾端獨立指令被省略。付費回應若狀態不確定，不自動重送。

Weekly Review 維持按需製作；本次不新增週包、不恢復排程。

## 完成的內容與語音檢查

五堂合計 26 個概念、156 題、312 段有效 MP3。七段來源錄音已完整解碼，36 個分聲道取樣窗用於教學範圍核對。每題內容經 fresh-context 唯讀審查；其中四個提前讀出修正答案的問句已在第一次付費製作前修正。

312 段新音訊全部經離線 small.en 辨識；剩餘非平凡差異使用 large-v2 複查。目前 13 段複查中，9 段完整吻合，4 段只涉及指定句子的 wish list／wishlist 分詞與 Sara／Sarah 同音姓名拼法，已逐句獨立核定；沒有未解決差異。曾辨識不清的人名、食物與漏讀的句首提示，已重寫或簡化後重製，舊證據保存在 `supersededSamples`，不能當作目前新音檔仍有問題。

共 322 次已確認成功的 API 回應，其中 10 次為已確認成功後的品質重製；有效交付仍是 312 段。Speech API 二進位回應不提供實際帳單金額，未估作實際費用。沒有狀態不確定請求的自動重送。

逐檔內容、hash 與原有資源保護結果見 [integrity](nativecamp-next-five-integrity.json)；ASR 限制、逐句結果及歷史修正證據見 [crosscheck](nativecamp-next-five-asr-crosscheck.json)。本批不修改原有 17 包課程與 1,211 個音檔。

## 重建與驗證入口

```powershell
uv run --offline --python 3.13 learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-21 --check
node --test tests/test_nativecamp_next_five.mjs
node scripts/build-work-catalog.mjs --check
```

其餘四堂替換 `--lesson` 即可。文字來源為每堂 `source/lesson-source.json`；音文一致性由 `speech-jobs.json`、`nativecamp-audio-manifest.json`、`nativecamp-tts-asr.json` 互相比對。修改朗讀稿或答案後必須重新生成受影響聲音，不能把舊音檔 hash 配上新文字。

## 隔離瀏覽器驗證

整合自然科 #131 主線後，完整 Node 套件 747 項通過；Python 271 項通過、1 項依既有條件跳過。本批新增 18 項資料／進度／資源保護檢查，五堂 builder `--check` 與生成目錄 `--check` 均通過。

使用本機 8799 的合成家庭資料，未操作正式孩子進度。桌面與 390 × 844 窄版月曆可見五堂；9/19 同時列出兩位老師及不同課程連結，週一為首欄。

在 Zibuyile 課程 Preview 操作 Build、Change、Fix 與口說揭曉／播放；前後進度回應完全相同。窄版題目、字卡與口說提示沒有水平截斷。另於合成孩子頁完整完成 Try：第一概念刻意首次答錯再答對，其餘首次答對，實際走完 4 題 Build、4 題 Change、1 題 Fix，其餘三題 Fix 省略。回合中保留首次錯誤，獎勵只在結束頁顯示；進度只屬於這堂 Try，9/19 Edon 沒有新增紀錄。

本批驗證追蹤於 #130。CI 與正式資源查核以 issue／PR 的最終發布紀錄為準；iPad、孩子實際耗時與難度、人耳全檔自然度未測，不以本機瀏覽器或 ASR 代替。
