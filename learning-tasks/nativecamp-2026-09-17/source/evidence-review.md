# 2026-09-17 Khalid：來源與出題界線

課程頁已核對 2026-09-17 19:30（Asia/Taipei）與 Khalid。教材為 Discover 1 的94–95頁；教學內容依網站逐字稿、教材畫面與已取得錄音互相核對。私人網址、逐字稿與教材畫面只存 ignored 的 `private/`。

## 錄音覆蓋範圍

- 已取得track 1（311.679秒）與track 3（160.005秒），均為Opus、48 kHz、雙聲道，完整解碼通過；bytes、SHA256與檔案路徑見 [download-verification.json](download-verification.json)。
- **track 2未取得本機檔案。** 該段網站可播放且完整逐字稿可讀，下載嘗試未落檔。本次未對它宣稱完整下載、全段解碼或本機聲道核對；工具用途與文具合計改由網站內容及教材94頁交叉查證。
- track 3的0:00–1:45以本機faster-whisper 1.2.1／small.en抽查。詳細結果在 `private/local-source-check.json`，沒有上傳錄音或灌入預期文字；不是人耳完整驗聽或發音評分。
- `private/lesson-page-ax.txt`保留網站來源；`private/textbook-p94-95.png`保留教材視覺核對。教材播放也會被網站標為「學生」，不能把整段教材對話算成孩子獨立口說。

## 選入的概念

| Concept ID | 課內證據 | 本次取捨 |
| --- | --- | --- |
| `school-tools` | track 1約2:49–4:50辨識pen、pencil、eraser、ruler、backpack、notebook；track 2約1:01–3:01討論工具用途，教材94頁對應用途圖。 | 用新任務情境要求完整用途句；不只重做單字辨識。工具與用途有明確對應，口說列自然替代句。 |
| `supplies-together` | track 2約4:10–16:47的how many與文具合計；教材有6+9、15+5、8+9、3+4+5。 | 使用全新虛構人名與數量，題面明示各組，驗算後答完整句。不使用真實班級人數或照搬教材題目。 |
| `counting-now` | track 2課堂與教材聽力包含辨識正在計數的物品。 | 新角色逐一數文具，說 `They are counting …`；不因網站把播放內容標成學生而推定孩子已會或不會。 |
| `same-age` | track 3與教材95頁的How old are you對話；本機抽查約1:01–1:10可核對教材的完整年齡句及too。 | 以虛構人物年齡練自然完整句。採 `I'm … years old too`或`I'm … too`；不沿用老師約1:38省漏old的不自然句。 |

教材與網站對pens／pencils曾有轉寫或口頭歧異；不把該段當成孩子分不清字詞的證據。本次使用明確標示的原創文具情境，各題的物品、加法與答案一一核對。

未加入教材95頁F的writing numbers：本堂沒有進行到該部分。也不新增兒童錄音、自動口說評分、班級／家庭事實記憶題。

[lesson-source.json](lesson-source.json)是原創題文真相源；只有其中合成題文送OpenAI。兩段回放、教材畫面、詳細轉寫不放入公開題包或Git。
