# 繪本版驗證

目前版本與驗收正本：[Issue #225](https://github.com/huansbox/aiden-study/issues/225)。

## 2026-10-21 初輪自動化驗證

此輪在獨立 review 之前，證明基本可操作與語音控制；不能單獨代表 review 後的雨滴合併、降雹大小或實圖熱區正確。修正後的針對性回歸另列於下。

- `node --test tests/test_water_cycle.mjs`：7 項通過。涵蓋可反覆縮水、雲中小水滴但沒有自動降雨、水滴碰合、接雪／融雪／再玩、冰粒托住→長大→落下、任意地面路線與狀態隔離、雙語 42 段 jobs／MP3 與六張背景、來源／網站產物一致。
- `tests/helpers/water-cycle-browser-check.mjs` 使用既有隔離 loopback server，以真實 HTMLAudioElement、音量 0 驗證。
- Chromium：1280×800、1024×768、390×844、844×390 全通。每尺寸走完六個故事場景與結尾，驗拖雲、水滴拖碰、點選／鍵盤替代、48px 目標且中心不被遮擋、無橫向溢出、語言與家長設定、字幕預設隱藏。
- fresh Chromium touch：390×844、hasTouch／isMobile 新 context，以真正 tap 與 CDP touchStart／Move／End／Cancel 驗封面啟動、太陽、水滴拖碰、向上托冰粒、取消拖曳後正常點擊；家長面板原生捲動確實觸發 pointercancel，修正後保持 modal 與已勾設定。
- WebKit：1024×768 完整故事、設定、拖曳／點選替代與真實語音流程通過。
- 水窪整個可點範圍會隨水面縮小，乾沙不再觸發水窪回饋；主角打招呼只改視覺，不重新播放旁白。
- 語音：確認只有一個 Audio 物件、實際播放、0.8 倍速、暫停／繼續、切頁／回封面、pagehide 停止；另驗真實 pending 音檔載入中暫停、HTTP 503 後重試、play() 拒播後重試。拒播案例只注入一次 NotAllowedError，復原後仍用真實媒體播放。
- 測試找到並修正拖曳後短暫誤吞下一頁點擊；目前只抑制同一物件 action 的相容 click。
- helper 產生四張代表截圖與 report.json；個別機器的 QA 暫存路徑記在 Issue，不放進公開成品。

## 獨立 review 後修正與回歸

- 雨：一般 motion 實際確認兩滴靠攏、單一較大水滴出現、同一大滴下落。reduced motion 顯示一顆大滴，能再點重玩；不再把兩個原位小滴分別掉落當成合併。
- 雪：場中補雲；初始空手套，接雪才出現雪花，English 暖陽接雪後才出現，融化後顯示水滴。未接雪不能先觸發融雪。
- 冰雹：上托長大冰粒仍在雲裡、保留正確下一步旁白；向下拖／點才落下。落雹保持成長後大小，風仍存在，地上大雹保留並另出現新小冰粒，沒有把同一顆地上冰雹移回雲裡。
- 河谷：熱區改為不重疊多邊形；實點圖中水面 (45%,80%)、主河 (58%,62%)、平靜水面 (23%,75%)、右岸土壤 (60%,95%)、左岸 (20%,59%)，確認對應水／土回饋，不只測按鈕中心。
- 1024×768 與 768×1024：上述故事／熱區、初始冰粒完整位於雲的可見範圍、翻頁後焦點移到新頁物件及 Enter 連續操作通過。滲土角色縮小的是內層畫面，觸控目標仍至少 48px。
- 保留修正後 fresh touch／原生 modal scroll、cancel 與設定保持回歸；WebKit 1024×768 以新雪／河谷操作重跑完整流程通過。7 項單元回歸、build --check、diff --check 通過。
- CSS／app／model／art／content 採一致穩定 query tag：`v=20261021-storybook`。沒有改動語音稿或新增付費音訊。
- 專門重現 review 修正：`WATER_CYCLE_ENGINE=review`；產出報告另存，不覆蓋初輪證據。最後全 repo 檢查與正式發布證據由 Issue 記錄。

## 最後整合與小幅視覺修正

- 全 repo Node：1105 pass；Python：279 pass／1 skip。最後 Chromium 四尺寸、fresh touch 與音訊復原流程通過。
- 中文與英文各抽查 3 段新版音檔，以 ASR 對照稿與音檔 hash。英文核心內容忠實；中文有「水窪／水窩」「凍／動」同音辨字，不將 ASR 用字差異當作已證實發音錯誤。ASR 抽查不等於全段人耳驗聽或孩子理解度驗收。
- 最後只微調 reduced motion 粒子：隱藏凍住的雪／雹裝飾粒子，保留手套雪花與落地大冰雹；雨改為 6 顆錯落短滴，不顯示長直線柵欄。1024×768 的雨、接雪與落雹三頁已實際目視，並確認雨滴 6 個不同高度、雪／雹裝飾粒子為隱藏。
- 此 CSS 微調後重建、build --check 與 7 項作品測試通過；未重跑全 repo，沒有改動語音或主流程。

## 雲端發布快取修正（2026-10-21）

- PR #226 最終 HEAD `c11fc7a` 的 Node／Python CI 成功後，合併為 `99b5b7d`；該主線的 test、work-catalog 與 Pages 部署均成功。
- 雲端在 Pages 部署前探測正式資源，原 CSS tag 首次回應為舊檔 `MISS`；部署後 HTML／模組已與 Git 一致，CSS 仍為舊檔 `HIT`、`max-age=14400`。正式瀏覽器實見封面沒有新版滿版樣式，故未將此次部署當成公開驗收完成。
- 僅為 stylesheet URL 增加 `&release=1`，保留原 `v=20261021-storybook`；不重寫 CSS、故事、插圖、語音或共用程式。最終 Pages 與正式站 smoke 以 Issue #225 後續 checkpoint 為準。

## 尚未由上述證明

- 一般流程使用 reduced motion，另有一般 motion 的雨滴合併序列測試；這不等於所有動畫的真機驗收，不能只從狀態測試推論動畫表現。
- 本機 Chromium 不代表 iPad Safari 真機；pagehide／visibility handler 也不是作業系統背景播放政策實測。
- 工具生成的解碼、非靜音、hash 檢查不等於全段人耳驗聽。
- 沒有孩子理解度、英文適配或共玩投入度的試用結論。
- helper 可用 `WATER_CYCLE_WEBKIT=1` 加跑，或 `WATER_CYCLE_ENGINE=webkit`／`touch` 單獨重現 WebKit／fresh touch。

## 舊版證據

2026-10-20 的六站介面、長語音、四條件比較表與舊瀏覽器報告屬 #220 歷史驗證。它們不適用此版重寫的 UI、腳本、42 段語音或新背景；需要時由 Git history 與原 Issue 查閱。
