# Aiden Study 獎勵插畫 — 第三波（補完剩餘 subtopic）

你是「設計圖片 session」。這是同一套獎勵插畫工作的續批，請延用前兩波的規格與目錄，補完還沒有圖的 subtopic。完整背景見 `docs-dev/reward-illustrations-brief.md`，但本文已自包含、可直接動工。

## 用途與調性
給小學三年級小孩在 iPad 上做題，每做完一批／通關時隨機跳一張當獎勵。調性：童趣、明亮、正向、單一主體清楚、平塗插畫、細節適中。每張要一眼看懂主題，不做雜亂場景。

## 規格（硬驗收）
- 尺寸：**1024×1024 WebP**。原生 ~1024 產出即可；**勿從更小圖（如 512）上採樣**（會在約 400px 顯示框糊掉）。master 1536 為理想非必須。
- 構圖：**1:1 正方形、滿版實底（自帶乾淨背景）**，不要透明去背。主體置中偏大，關鍵細節別放四角。
- 檔案：WebP，lossy q80–85，**單張 ≤ ~100KB**。
- 內容邊界：扣 subtopic，但**不要做成題目解答圖**。可出現具體物件／生活場景，但**避免可讀文字、數字算式、題目句子、商標、真實品牌**。
- 檔名：ASCII slug + 兩位數流水號（如 `wind_01.webp`），逐字檔名靠 manifest 對應。建議 slug 已列在下表，沿用即可。

## 目錄與 git 規範（重要）
- 圖檔只放 `docs/shared/rewards/`。
- master 原始大圖（1536 PNG 等）**不要** commit 進 `docs/`，放你工作區或 gitignore。
- **更新 manifest＝在「現有」 `docs/shared/rewards.json` 的 `pools` 物件裡「新增」key，不要覆蓋整檔**。現已存在 8 個 key（小數的認識、溫度對水的變化、天氣預報、聰明消費、`__generic__`、蔬菜生長的變化過程、影響蔬菜生長的因素、生存與適應），請保留，只把下表新 key append 進去。
- **不要碰 git**（不 add／不 commit／不 push）。放好圖＋更新 `rewards.json` 後告訴主 session，由主 session 跑審計＋commit/push。

## 已完成（不要重做）
小數的認識、溫度對水的變化、天氣預報、聰明消費、蔬菜生長的變化過程、影響蔬菜生長的因素、生存與適應、`__generic__`。

## 本波要做：剩餘 26 個 subtopic，共 84 張
> 表頭 key 為題庫 subtopic 原字串（**逐字、含全形，當 manifest key 不可改字**）。張數＝`clamp(ceil(題數/20),3,8)`。

| subtopic（逐字 key） | 張數 | 建議檔名 slug | 內容方向（扣主題） |
|---|---|---|---|
| 小數加減 | 3 | decimal_addsub | 小數直式、買東西找零 |
| 小數比大小 | 3 | decimal_compare | 兩數比大小、天平 |
| 圓的構造 | 3 | circle_parts | 圓心／半徑／直徑、時鐘盤子 |
| 圓規與畫圓 | 3 | compass_draw | 圓規畫圓 |
| 圓的大小比較 | 3 | circle_size | 大小不同的圓、套圈圈 |
| 乘除應用 | 3 | muldiv_apply | 分裝、買整箱算總價 |
| 乘除互逆 | 3 | muldiv_inverse | 方陣排列、乘除關係 |
| 乘除計算 | 3 | muldiv_calc | 直式乘除 |
| 時間計算 | 3 | time_calc | 經過時間、時刻表 |
| 時制互換 | 3 | time_format | 12／24 小時、上午下午 |
| 時刻與時間單位 | 3 | time_unit | 時鐘、行事曆 |
| 報讀表格 | 3 | read_table | 統計表、長條圖 |
| 蔬菜從哪裡來 | 3 | vegetable_source | 根莖葉花果實（紅蘿蔔／菠菜／花椰菜） |
| 影響物質變化的因素 | 3 | matter_change_factors | 加熱冷卻、巧克力融化 |
| 溫度對其他物質的影響 | 3 | temperature_other_matter | 熱脹冷縮、固體受熱 |
| 身體構造 | 4 | body_structure | 昆蟲身體、動物的腳／翅膀／鰭 |
| 動物分類 | 3 | animal_classification | 哺乳／鳥／魚／昆蟲分類 |
| 觀察方法 | 3 | observation_method | 放大鏡、觀察記錄 |
| 風 | 3 | wind | 風向、風車、旗子飄 |
| 氣溫測量 | 3 | temperature_measure | 溫度計、百葉箱 |
| 雨量降雨 | 3 | rainfall | 雨量筒、下雨、量杯 |
| 綠色消費 | 3 | green_consumption | 環保袋、回收、環保標章概念 |
| 地名的由來 | 5 | placename_origin | 地名招牌、古地圖、地形 |
| 探索家鄉的地名 | 3 | explore_placename | 探索地圖、路牌 |
| 傳說與文化保存 | 6 | legend_culture | 廟宇、傳說、文化資產 |
| 家鄉的人物與發展 | 3 | hometown_people | 開墾、橋樑、歷史人物 |

## manifest 範例（append 到現有 `docs/shared/rewards.json` 的 `pools`）
```json
"風": ["wind_01.webp", "wind_02.webp", "wind_03.webp"],
"身體構造": ["body_structure_01.webp", "body_structure_02.webp", "body_structure_03.webp", "body_structure_04.webp"],
"地名的由來": ["placename_origin_01.webp", "...共 5 張..."]
```
可漸進交付：一個主題補一個、上線一個都行；缺的主題程式側會自動往上 roll-up（不顯示也不出錯），不會卡作答。完成這 26 個後，全 33 個 subtopic 即補齊。
