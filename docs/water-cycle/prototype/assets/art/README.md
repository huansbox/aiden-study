# 第③④幕原型插圖素材

用途：水循環第③④幕的互動原型。對應 [Issue #229](https://github.com/huansbox/aiden-study/issues/229)。

三張圖均於 2026-10-22 使用 built-in `image_gen` 生成；沒有使用 API fallback，沒有程式繪圖、裁切、去背或修改像素。選用輸出原樣複製進本資料夾，SHA-256 比對一致，原始輸出保留。

## 素材與使用方式

| 檔案 | 尺寸 | 用途 |
| --- | --- | --- |
| `sky-warm-cool.png` | 1536 × 1024 | 第③幕空白天空舞台，左下暖桃色、右上涼藍色。沒有雲、鳥、水滴或操作提示。 |
| `cloud-garden.png` | 1536 × 1024 | 第④幕雲內舞台，上緣與兩側有白藍紙雲，中央及下緣留空，可往下落雨。 |
| `characters.png` | 1254 × 1254 | 真正透明 alpha 的 2 × 2 sprite sheet，每格 627 × 627。 |

兩張背景比例為 3:2，可直接鋪在 1200 × 800 舞台。角色表使用 `background-size: 200% 200%`，元素自身須為正方形：

| 象限 | `background-position` | 角色 |
| --- | --- | --- |
| 左上 | `0% 0%` | 正常麻雀 |
| 右上 | `100% 0%` | 冷麻雀、蓬毛縮翅 |
| 左下 | `0% 100%` | 無星笑臉水滴 |
| 右下 | `100% 100%` | 額頭有唯一金色五角星的笑臉水滴 |

## 核對與限制

- 已目視核對：背景沒有文字、箭頭、手指、風線、追蹤圈或預畫角色。天空沒有預畫雲。
- 雲內背景中央為淡藍空域，下方中央通往畫面外，未以實心雲封住下緣。
- 角色表為 `Format32bppArgb`；背景取樣 alpha 為 0，角色有保留原生的半透明水彩邊緣。四個角色均未跨格。
- 生成器輸出 1254 × 1254，並非常用的 1024 或 2048；四格仍是等大的正方形，可直接用 CSS 四象限。
- 各角色在格內有小幅位置差異，未經裁切或重排。縮放時以格中心定位；紙感邊緣為原生效果。
- 以 4 像素間距抽樣、alpha > 32 得到的可見範圍約為：正常鳥 `(84, 88)–(568, 580)`；冷鳥 `(672, 108)–(1140, 576)`；無星水滴 `(136, 672)–(548, 1180)`；金星水滴 `(740, 676)–(1152, 1184)`。座標為整張 sheet 的像素。

## 參考圖與原始輸出

已先目視參考使用者批准的粗分鏡，參考圖只用於畫風與角色描述；不是從分鏡裁切：

- Dropbox 相對路徑：`mywork/aiden-study/water-cycle/storyboard-v02-2026-10-22/scene-03-storyboard-v02.png`
- Dropbox 相對路徑：`mywork/aiden-study/water-cycle/storyboard-v02-2026-10-22/scene-04-storyboard-v02.png`

本機 built-in 原始輸出目錄：`C:\Users\linshuhuan\.codex\generated_images\01a16295-197a-7a80-8450-8d6188b5c635\`。這些本機路徑只記錄生成來源；執行原型使用本資料夾的相對路徑。

| 素材 | 原始輸出檔名 | SHA-256 |
| --- | --- | --- |
| `sky-warm-cool.png` | `exec-cf5ceec6-3a7b-4152-ac90-c2d58da10df5.png` | `B13F0BCEF01C979E155BD976F9C3BB7C2BFA8211D4804CB43280E3CBAE38AC7E` |
| `cloud-garden.png` | `exec-25512c5c-d040-457b-9e3f-05b61580d81b.png` | `72D876D5B09E55BAAC004B6D80B063E58EE6BDE8837A99536F95F0368645C2E0` |
| `characters.png` | `exec-dbfd0ecc-8337-4412-95d3-fb07da230c12.png` | `9633666EAAA5679BE5FE53172F3A7197E469C3C48EFE0726F092DA343711A122` |

## 實際生成 prompt

每個素材各一個 built-in 呼叫；兩張背景 `transparent_background: false`，角色表 `transparent_background: true`。

### `sky-warm-cool.png`

```text
Use case: illustration-story.
Asset type: interactive iPad landscape game stage background, 3:2 landscape canvas.
Primary request: Create a full-bleed quiet sky backdrop in a handmade cut-paper, watercolor and colored-pencil children's picture-book style. Match warm cream fibrous paper, softly torn layered color washes, gentle dry-brush pencil contours, and subtle tactile paper grain of the approved water-cycle storyboards.
Scene: Sky only. Pale peach warm air occupies the lower left and middle left, blending softly into pale blue cool air at the upper right. Leave a warm peach route along the left and lower edge. The transition is diffuse and organic, with no marked boundaries. A tiny subdued rock-and-grass hint may sit at the far bottom left, occupying no more than 4 percent of the canvas height.
Composition: The central area, top and bottom have abundant low-detail open space for independently animated actors. This is a usable empty game background, not a storyboard, not a screenshot and not a finished narrative panel. Paper texture remains understated.
Constraints: Absolutely no bird, no water droplet, no face, no dotted tracking circle, no wind line, no text, no letters, no finger, no hand, no arrow, no button, no UI, no grid, no frame. Do not paint any cloud: clouds will be added interactively. No object or visual focal point in the middle. Full bleed with no decorative border.
```

### `cloud-garden.png`

```text
Use case: illustration-story.
Asset type: interactive iPad landscape game stage background, 3:2 landscape canvas.
Primary request: Create an open-space view inside a cloud, matching a handmade cut-paper, watercolor and colored-pencil children's picture book with warm cream fibrous paper, softly torn layers, muted white and pale blue, and gentle dry-brush pencil texture.
Scene/backdrop: Soft white-and-pale-blue clouds form a loose upper rim and narrow partial side walls only. The central 65 percent is a broad very light blue low-detail air space with room for several independent movable water droplets. The lower center is OPEN, a clear air passage all the way to the bottom edge so animated droplets can fall out of the screen. There must not be a solid cloud bank across the bottom or across the central play area. Along the extreme lower corners only, a very small faraway landscape of muted blue-green hills and a thin hint of river valley can suggest the ground far below; occupy at most 8 percent of total height.
Style: Quiet watercolor washes, layered soft torn-paper cloud edges, understated paper fibers, tactile but uncluttered.
Composition: Empty practical interactive stage, no storyboard panels, no border, full bleed. Preserve plenty of open sky between and below clouds, not a canvas filled with solid cloud.
Constraints: No bird, no water droplet, no face, no star, no text, no letters, no finger, no hand, no arrow, no wind or motion line, no tracking circle, no button, no UI, no grid, no frame.
```

### `characters.png`

```text
Use case: illustration-story.
Asset type: production game sprite sheet with genuine transparent alpha.
Primary request: Create ONE SQUARE image split into an EXACT 2 by 2 arrangement of four equal square cells, with exactly one character per cell. No visible grid, no dividing lines, no labels, no frame and no background color; everything outside the four characters must be fully transparent. Each character must be completely contained inside its cell, centered at its cell center, with at least 15 percent transparent inset from every cell edge. Each character's visible bounding box should occupy about 65 percent of its own square cell, so the four objects have consistent apparent scale and never overlap or cross quadrants. CSS will use background-size 200% 200% and the four quadrant positions.
Character style: cute handmade paper-cut watercolor and colored-pencil picture-book characters, softly torn paper silhouette, warm subtle paper grain INSIDE characters only, delicate brown pencil details, no hard vector look, no cast shadow outside character.
TOP LEFT cell: normal small sparrow, rounded brown bird, cream belly and cheek, pink rosy cheek, black dot eyes, short golden-brown beak, small orange-brown feet, looking toward the right, compact gently folded wings. Warm brown layers of feather detail; friendly and calm. Keep bird round, like a simple watercolor baby sparrow from a storybook.
TOP RIGHT cell: EXACT SAME sparrow identity, palette and scale, but feeling cold with fluffed-up round feathers and both wings tucked close, slightly hunched cozy posture, squinting eyes. No external shiver marks, no accessories.
BOTTOM LEFT cell: one round cyan-blue teardrop with point at top, white watercolor highlight, one cheerful face comprising two black dot eyes, pink cheeks and a tiny smiling open mouth. NO star anywhere.
BOTTOM RIGHT cell: EXACT SAME cyan-blue teardrop identity, palette, size and single smiling face. Add exactly ONE small GOLD FIVE-POINT STAR on its forehead, above the face and below the tip. Star stays within the droplet body. No other star in any cell.
Constraints: Exactly four isolated sprites in the specified order. Only one face per droplet. No extra characters, no duplicate sprites, no environmental objects, no text, no letters, no grid, no colored rectangle, no opaque white background, no painted checkerboard, no floating decorations. Output genuine transparent background and preserve alpha. Square sheet is required so each of the four quadrants is square.
```

