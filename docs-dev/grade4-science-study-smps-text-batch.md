# 深美114四上文字題補題

39 個獨立文字活動／39 個來源作答格已完成轉寫、兩次獨立解答、root批准與隔離驗證，於2026-10-05隨 **rev18 正式發布**。現役全科309活動（數學68／自然217／社會24），自然281作答格；legacy rev12與Worker `808dccba-a4d0-4b4a-afa4-5b6c8789c990`不變。

本批只使用既有深美114四上期中原卷，沒有新增原卷或校方答案。累計來源仍11卷30頁、3份答案10頁；本卷沒有官方答案。39 題為21個是非、18個四選一，unit20有22題、unit21有17題，每活動只對應一個來源格，沒有必要圖表或共同閱讀依賴。作者 stable appId 與 practiceId 保留；原270活動、mapping及全部解說逐值保持。

逐活動中立來源定位見 [selection](../data/study/g4-s1-science-exam1/smps-text-selection-metadata.json)，七卷最新狀態見 [backlog overlay](../data/study/g4-s1-science-exam1/smps-text-backlog-metadata.json)。公開資料只有 ID、定位、格式、概念與審查／發布狀態；完整題文、選項、答案、解說、原件與 QA 都保存在精確 ignored private 目錄。

七卷原有537格中，累計已發布49格／47活動（既有10格／8活動＋本批39格／39活動），另剩127候選（文字63／材料49／改寫15）、37格範圍待確認、317格其他或後續主題、7格來源缺損。[rev17七卷盤點](grade4-science-seven-paper-audit.md)與原 metadata 保留歷史快照，最新 overlay 不重複整份537列。

原四卷的97格future、23格範圍待確認、3格既有排除保持。115學年度四上第一次正式評量範圍尚未取得；地表與水生環境仍是康軒教學語境下的暫定核心，不代表本題必考。森林等混合題組與必要材料留待後續完整審查。

V-05 經 source-first 獨立審查與最新 root v2 決策，沿用原題的一般教材情境及原選項，解說保留限制；本批沒有語意修題。XII-05、XII-06 只修復來源字形。v1 決策與作者 v1 稿保留私人歷史，正式內容綁定 v2，沒有套用已被取代的情境限縮。

## 組包與驗證

完整發布 source 為578371 bytes，SHA256 `4c494fcd1e36dd40b3e910dcb070b399d76f0adc9366ad384db023cf938d8bfc`；manifest 為28215 bytes，SHA256 `f19cb3c56173c5e547d1d5bff2cfed95e6f1bfaf39f3618c8dd98d3d662133f1`。共9份shard；unit21自動拆成兩份，每份均不超過262144 bytes。只有自然unit20／21內容改變，其餘六個單元的shard保持。

來源、核答與 root approval 綁定實際作者 v2 SHA，39題均為 `independently_solved_twice_no_official_answer`；沒有將「與 key 判分一致」當作科學正確的證據。七大既有自然主題皆覆蓋，未增加主題或 runtime。

真 renderer 在768×1024與1024×768逐題核對39題，共78次題文／原選項順序／完整解說顯示，以及78次錯答、錯題、reload、答對、批次結束與接續流程。家長試玩前後，合成孩子 localStorage與隔離Worker進度皆保持；未讀正式孩子進度、token或cookie。

unit21兩份shard全部取得後才標ready；缺其中一份時停在首頁、未標ready，補齊重試後才進入答題，reload重用已驗證完整cache。初次新增檢查把 runtime Map當成普通陣列，已修正QA判斷；實際請求200／503→200／200及ready Map狀態證據另存，正式runtime未改。兩種方向均無水平溢出，pageErrors與外部請求為空。

檢查範圍包含公開mapping rev18、作品目錄與數學題型報告全部定稿後的Node全套823 tests；最終結果與凍結指紋保存於本批ignored `delivery/node-tests-post-projection.log`及v2 freeze。數學題型報告只更新mapping總數行，數學68活動／45種模式保持。Python278通過、1個既有regression skip。worktree沿用canonical既有Node依賴，缺少的fake-indexeddb6.2.5只置本批ignored測試目錄，以本批loader供測試，不改production或canonical依賴。

本次仍是Playwright隔離容器驗證，未做實體iPad Safari或主畫面容器效能實測。

## 重建、發布與還原 checkpoint

ignored `data/private/study/g4-s1-math-u1/science-smps-text-batch/baseline/` 保存完整rev17 curated／explanations／mapping／source／manifest／8shards；`rev18-candidate/` 保存完整新authoring及catalog。入口為本批 `delivery/build_rev18.py`，使用canonical uv環境，必須提供真實內容批准與獨立review證據。不能回用legacy或只有39題的delta作前版。

[PR #188](https://github.com/huansbox/aiden-study/pull/188)實際內容merge為 `1ce270e2901eeaa355eb3e0d2f4e1ab057a9b7ac`；[merge CI](https://github.com/huansbox/aiden-study/actions/runs/37274192399)及[Pages](https://github.com/huansbox/aiden-study/actions/runs/37274216200)成功，19個實際引用資產的bytes均與merge Git blob一致。root正式核准content-only發布後，三份新immutable shards各完成首次及至少60秒後讀回，再單次前向寫manifest，亦完成兩階段讀回；最後收據時間為2026-10-05T06:59:42.186194Z。legacy rev12指紋保持、Worker同版100%，未改孩子進度。

下一批完整基線入口採canonical `data/private/study/g4-s1-math-u1/rev18-release/private/science-smps-text-batch/rev18-candidate/`，curated／explanations／mapping均在該目錄本身，完整source／manifest／9shards在其catalog/。本文件於封存前建立；本機／Dropbox副本與housekeeping完成狀態、最後文件merge、plan SHA及收據以#178最新封存checkpoint為準。使用前核逐檔readback與兩副本各自從自身production snapshot／authoring獨立重建的收據，確認source／manifest／每shard的exact bytes；不以此文件宣稱copy、同步或清理已完成。[#178](https://github.com/huansbox/aiden-study/issues/178)保持open，繼續追蹤剩餘候選與正式範圍。
