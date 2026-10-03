# 四上數學角度看圖題（#151）

2026-10-03：[本批追蹤](https://github.com/huansbox/aiden-study/issues/151)。家長核准從既有歷屆卷挑選 3～5 個完整 activity，補角大小、角度分解與量角器相關判讀，完成獨立核答、E2E、正式發布與 housekeeping。候選與實際收錄分開記錄；未經管理端發布讀回不列為已上線。

## 原卷與作答目標

沿用原卷完整相關頁、共用指示、必要圖形與標示。題圖直接從原 PDF 的題目頁裁出；保留原幾何比例，不以答案卷或 AI 生成圖替代。量角器四選項以 2×2 重新排版，保留每圖標號、文字、刻度與中心對準差異，減少 iPad 上的上下捲動。相依兩空仍算一個 activity。要求畫角、實際量測或全部列舉的題另行處理，不能只留下最終數字而宣稱已保留原能力。

量角器使用是否正確與量角器刻度讀值是不同模式；依本批實際原題分類，不把其中一種當成兩種都已補齊。正式學校範圍仍待公告；本批依既有暫定 U3 核心對照。

本批從五個候選選出四個 activity、五個作答格：安和 114 `I-04`、`II-02a+II-02b`，桃子腳 113 `V-04`，桃子腳 112 `V-2`。四題皆有官方答案，仍逐題由作者與 reviewer 分別重算／判讀，再核對官方答案。桃子腳 114 `II-3` 缺官方答案，高倍率檢視發現細微角差造成判讀不確定，因此排除；作者五題原稿與勘誤保留，正式包只取核准四題，不以猜測答案補足題數。

量角器題必須保留原圖的中心對準、起始零線與刻度細節；最終 2×2 排版不能因縮圖抹掉判斷所需的差異。逐選項核答與說明只存私人審查證據。

## 呈現契約

沿用自然題既有 `material.kind = png` 與 `StudyMaterial.render/bind` 圖片放大介面，只新增數學 `subject: math`、`unit: 17` 的 PNG 白名單。維持每張解碼後最多 32 KiB、寬高各 1～1600、alt 最多 200 code points、完整題包 256 KiB；不開放數學 table、其他數學單元媒體、任意 URL 或 SVG。

作答沿用四選一、整數與比較符號輸入；沒有另建互動量角器或作圖工具。圖形與題文只放固定 ignored private root，不新增公開圖片檔。Python builder、瀏覽器與 Worker 共用 parser 必須採同一白名單。既有 `material` 語意守衛繼續禁止同 ID 偷換圖形或標示。

## 基線與驗證

本批基線是已發布 revision 9，104 個 activity（數學 64／自然 40）、135176 bytes，SHA256 `b1817152bd4b8ea067de7d8d9cb663870c9a836072dabd9675a113dcb399d346`；canonical `data/private/study/g4-s1-math-u1/rev9-release/` 保持唯讀。新 worktree 的 `angle-batch/baseline/` 五份 inputs／pack／mapping／分類已逐 byte 核對，管理端固定內容 key 也回讀相同基線。

候選需核舊 104 題、解說與 mapping 完整逐值保留，舊 64 題數學分類不變；作者原稿、PNG 出處與指紋、獨立解題、官方答案可用性、核准集合及可重建來源隨 private archive 保存。公開只保留 provenance、分類與批次狀態。

統籌核准的 revision 10 候選為 108 個 activity（數學 68／自然 40）、186717 bytes，SHA256 `fe6ab5874454e88fedfdf8f56305d8d52fd1bab188b311a8588f4884f5a65fd1`；距 256 KiB 上限尚餘 75427 bytes。U1～U5 題數為 20／14／9／14／11，共 45 種主要題型；本批新增三種，兩道角度加減活動共用一種，不把每個填空獨立算題型。正式發布前仍以 rev9 為已上線版本。

`angle-batch/approval.json` 精確綁定四個核准 ID、16 份作者／原圖／來源／雙重 review 輸入指紋與上述候選包指紋。五份作者候選含排除項保留原稿；PNG 實檔、嵌入 bytes、provenance、source PDF 與 reviewer 證據交叉核對，不能只改外部圖檔就通過。重建入口為私人 `angle-batch/integration/rebuild_rev10.py --check`／`--promote`，候選驗證為 `verify_rev10.py --candidate`；先依封存的 RESTORE.md 恢復至新 worktree，再執行，不直接改寫歸檔。

E2E 使用隔離 test-child、fake KV 及 Chromium 768×1024／1024×768，阻擋非本機連線；涵蓋新增題正誤、重試、重載、多空、放大圖片／關閉、舊包升版保留進度與半批、家長試玩不寫孩子進度、即時 `family.record()` 與僅批末 `family.finishRound()`。此為尺寸模擬，不能視為實體 iPad／Safari 實測。實際驗證結果與發布指紋以 #151 最新交接為準。

上述隔離流程與畫面檢查已通過；統籌與獨立 reviewer 目視核對代表截圖，外部網路請求為零，測試 server 已退出。完整 Node 775 項及 Python 275 項通過（1 項既有缺 PDF 跳過）；另通過公開報表／catalog 一致性與核准閘門正負向檢查。來源內容、分類、runtime 及私人整合另經獨立 review，既有 PNG 出處與嵌入圖未互相綁定的發現已修正並驗證。

## 發布與收尾

本批修改 runtime 白名單，Worker bundle 也會包含新版 parser。順序為核准 PR／CI → 核對現役 Worker 與 Git 基線 → 部署新版 Worker → 合併並等 Pages 完成 → 首次請求 HTML 精確引用的新 loader URL 並核 bytes → 再核 live rev9 基線 → 一次前向發布核准新版題包 → 立即與超過 60 秒管理端讀回。Pages 完成前不請求新 query，避免 CDN 將舊檔快取到新 URL。

不使用正式家庭 session 或孩子 `p:` 進度資料。出現問題停在該階段，保留原有效內容與進度；題包不回退 revision。私人可重建資料與證據逐檔 manifest 核對後才封存本批 worktree；其他原卷、rev9 歸檔及 session 保留。長期決策以 Wiki [Study 私用題包容量](https://github.com/huansbox/aiden-study/wiki/Study-Private-Pack) 為正本。
