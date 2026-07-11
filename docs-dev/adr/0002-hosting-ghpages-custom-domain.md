# 託管留 GitHub Pages，自訂網域解耦網址與託管

脈絡：進度同步服務（注音 PRD）選了 Cloudflare Worker＋KV，曾順帶考慮「整站遷 Cloudflare Pages 統一平台」；且平台網址將印在小孩 iPad 的主畫面圖示上，綁死 github.io 會讓日後任何搬遷都要重裝圖示、搬進度。

決定：託管不搬、留 GitHub Pages；在本 repo（project site）掛子網域 **`kids.linshuhuan.com`**（DNS 在既有 Cloudflare zone 加一筆；取中性名而非 aiden，因平台涵蓋兩兄弟），網址從此不含 github.io 也不含 repo 名。

為什麼：同步 Worker 從任何網域都能呼叫，搬託管對「記憶進度」零加分（注音 PRD reviewer 的解耦裁決仍然成立）；反而 CF Pages 是「一個專案＝一個站」，要多 app 同網域子路徑得另加轉發層，逆風。真正要的解耦是「網址不綁託管平台」——自訂網域達成後，將來換託管只動 DNS 指向，圖示與 localStorage（皆綁 origin）全部不動。

Consequences：github.io → 新網域是一次性 origin 搬遷（各裝置進度走逃生門手動搬），須趕在 hub 圖示裝上小孩裝置之前完成，並與 monorepo 路徑重整（ADR-0001）併成同一波。
