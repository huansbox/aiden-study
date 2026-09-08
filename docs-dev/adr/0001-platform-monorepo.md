# aiden-study 重整為全家學習平台 monorepo

脈絡：給小孩的學習 app 散在多個 repo（aiden-math、spelling-bee-trainer、99timestable⋯），時間一久維護者連做過什麼都會忘（world-cup 專案已失蹤，GitHub 與本機皆無）；且學習專案是階段性的（這陣子 spelling bee、之後長除法、之後寫字⋯），會持續有新 app 進來、舊 app 退役。

決定：aiden-study repo 重整為全家學習平台 monorepo——hub＋registry 為主體，各學習 app（含題庫本身）降為 `docs/` 下的並列子資料夾，未來新學習 app 預設開在子資料夾；既有外部 repo 的 app（aiden-math、spelling-bee-trainer）併入時程與網域切換同一波，只痛一次。

為什麼：單人維護下「所有專案在同一棵樹」是對抗遺忘的結構性解法，勝過靠紀律維護的跨 repo 目錄檔；新 app＝開資料夾，零開 repo 儀式。

## Considered Options

- 多 repo＋user site（`huansbox.github.io`）當 hub：零搬遷，但目錄完整性靠紀律，且每個新 app 都要開 repo。
- 全新乾淨 repo 從零建平台：多付一次搬題庫 pipeline（PDF、data、百餘測試）的工錢，只換到 repo 名，不值——自訂網域掛上後 repo 名從網址消失，變純內部代號。
- 程式重用**不是**本決策的理由：app 之間仍維持「複製再改、不抽共用模組」（注音 PRD 經審查的拍板）；同 repo 的加分在「看得見有什麼可以抄」。
