# 同步由各 app 內嵌共用 sync client，不由 hub 代辦

脈絡：進度同步（CF Worker＋KV）需要有人負責在對的時機上傳/下載。hub 代辦（app 零改動）曾是候選，但小孩練完直接按 Home 離開、不會回 hub——上傳時機不可靠，對「抗 iOS 7 天清除」是致命傷（被清前最新進度沒送出，雲端救回的是舊資料）；共用 iPad 切人另有互蓋時序風險。

決定：接同步的 app 各自內嵌 **sync client**（開啟時 pull、進度變更後 debounce push、離線靜默略過）；sync client 抽成**同 origin 共用腳本**（`/shared/sync-v<N>.js`，`<script src>` 引入、零 build）。app 本機存檔 key 加 child 維度（哥哥／弟弟各一份並存，離線切人不互蓋）；既有舊存檔一律歸哥哥。

為什麼破「複製再改」：注音 PRD 的複製拍板針對 **app 資產**（獎勵選圖、批間畫面）——各 app 演化方向不同，共用會互相牽制；sync client 是**平台基建**——協定與 bugfix 必須所有 app 一處生效，複製反而讓修正要 N 處移植。邊界規則：app 邏輯複製、平台基建共用。腳本檔名帶版本號，協定不相容時開新檔，舊 app 不被默默弄壞。
