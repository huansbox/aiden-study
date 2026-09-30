(function (root) {
  "use strict";

  const ink = "#3f3140";
  const lightInk = "#6f5a68";
  const cream = "#fff4cf";
  const gold = "#ffd86b";
  const coral = "#e95f52";
  const red = "#c93e42";
  const teal = "#2f7e87";
  const paleTeal = "#84c8c8";
  const blue = "#477fbd";
  const paleBlue = "#91c9e8";
  const navy = "#314d71";
  const steel = "#7d93a1";
  const tire = "#24303b";

  const group = (...items) =>
    `<g aria-hidden="true">${items.flat().join("")}</g>`;
  const path = (d, fill, stroke = ink, width = 6, extra = "") =>
    `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`;
  const rect = (x, y, width, height, radius, fill, stroke = ink, sw = 6) =>
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
  const circle = (cx, cy, radius, fill, stroke = ink, sw = 6) =>
    `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
  const ellipse = (cx, cy, rx, ry, fill, stroke = ink, sw = 6) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
  const line = (x1, y1, x2, y2, width, color = ink) =>
    `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
  const piece = (name, box, z, ...art) => ({
    name,
    svg: group(...art),
    box: { x: box[0], y: box[1], width: box[2], height: box[3] },
    z,
  });
  const wheel = (name, cx, cy, radius, accent, z = 12) =>
    piece(
      name,
      [cx - radius - 7, cy - radius - 7, radius * 2 + 14, radius * 2 + 14],
      z,
      circle(cx, cy, radius, tire, ink, 7),
      circle(cx, cy, radius * 0.58, steel, cream, 5),
      circle(cx, cy, radius * 0.23, accent, ink, 4),
      line(cx - radius * 0.48, cy, cx + radius * 0.48, cy, 5, lightInk),
      line(cx, cy - radius * 0.48, cx, cy + radius * 0.48, 5, lightInk),
    );
  const lamp = (name, cx, cy, color, z = 38) =>
    piece(
      name,
      [cx - 32, cy - 25, 64, 50],
      z,
      path(`M${cx - 27} ${cy - 18}h40l14 18-14 18h-40l-8-18z`, color, ink, 5),
      ellipse(cx + 3, cy, 13, 10, cream, "none", 0),
    );
  const railSection = (name, x, width) =>
    piece(
      name,
      [x - 8, 399, width + 16, 79],
      3,
      line(x, 418, x + width, 418, 10, navy),
      line(x, 449, x + width, 449, 10, navy),
      ...[0.12, 0.38, 0.64, 0.9].map((at) =>
        line(x + width * at, 405, x + width * at, 462, 12, "#9b7653"),
      ),
    );
  const makeModel = (id, title, stepSpecs) => ({
    id,
    title,
    viewBox: "0 0 800 500",
    steps: stepSpecs.map(([stepTitle, parts], stepIndex) => ({
      title: stepTitle,
      parts: parts.map((part, partIndex) => ({
        id: `p${stepIndex + 1}-${partIndex + 1}`,
        ...part,
      })),
    })),
  });

  const car = makeModel("car", "紅色小跑車", [
    [
      "穩固的車底",
      [
        piece(
          "流線底盤",
          [140, 314, 515, 89],
          10,
          path("M164 322h410l72 30-18 42H176l-28-34z", "#d94a3d", "#782b2c", 8),
          path("M196 337h360l43 17H187z", "#f77b61", "none", 0),
          circle(230, 346, 9, gold, "#8b5a24", 4),
          circle(535, 346, 9, gold, "#8b5a24", 4),
        ),
        piece(
          "後輪軸座",
          [165, 351, 158, 53],
          20,
          path("M188 356h112l18 18-18 25H188l-18-25z", "#32465a", "#172431", 7),
          path("M205 365h78l10 10-10 12h-78l-10-12z", "#76b6c5", "none", 0),
          circle(194, 377, 10, gold, "#8b5a24", 4),
          circle(294, 377, 10, gold, "#8b5a24", 4),
        ),
        piece(
          "前輪轉向座",
          [477, 347, 162, 59],
          20,
          path("M500 352h108l26 22-22 27H500l-18-27z", "#32465a", "#172431", 7),
          path("M516 363h77l15 12-12 13h-80l-10-13z", "#76b6c5", "none", 0),
          circle(508, 376, 10, gold, "#8b5a24", 4),
          circle(602, 377, 10, gold, "#8b5a24", 4),
        ),
      ],
    ],
    [
      "跑車站穩了",
      [
        wheel("厚實後輪", 244, 390, 58, coral),
        wheel("靈活前輪", 555, 390, 58, coral),
        piece(
          "中央護板",
          [303, 357, 187, 55],
          16,
          path("M318 363h151l15 18-17 23H313l-13-23z", navy, ink, 6),
          path("M337 374h111l8 8-9 10H335l-7-10z", paleBlue, "none", 0),
        ),
      ],
    ],
    [
      "拼出低低車身",
      [
        piece(
          "後側翼子板",
          [137, 276, 196, 99],
          22,
          path("M150 365l18-66 58-18 78 21 24 63h-45c-6-38-72-44-82 0z", red, ink, 7),
          path("M174 311l53-16 51 14 10 18H169z", coral, "none", 0),
        ),
        piece(
          "車門下圍",
          [304, 298, 184, 78],
          22,
          path("M316 304h157l12 61H306z", coral, ink, 7),
          line(333, 326, 454, 326, 7, "#f9aa83"),
        ),
        piece(
          "前側翼子板",
          [468, 272, 205, 104],
          22,
          path("M474 365l18-58 57-27 77 17 40 38-9 30h-46c-7-38-75-45-84 0z", red, ink, 7),
          path("M517 308l40-16 57 13 22 19H496z", coral, "none", 0),
        ),
      ],
    ],
    [
      "裝上車頭",
      [
        piece("長跑車引擎蓋", [493, 233, 193, 91], 24, path("M508 315l16-51 105-23 48 31-18 46z", "#e85449", ink, 7), path("M540 274l84-18 25 15-104 24z", "#ff9075", "none", 0)),
        piece("圓弧車鼻", [624, 277, 104, 82], 25, path("M640 288l52 12 28 31-19 22h-69l-13-28z", red, ink, 7), path("M671 309l25 7 10 12-30 4z", gold, "none", 0)),
        piece("引擎散熱口", [509, 286, 93, 58], 31, path("M519 296h69l8 14-13 24h-62l-8-20z", tire, ink, 5), line(535, 305, 532, 325, 5, steel), line(553, 304, 551, 325, 5, steel), line(571, 303, 568, 324, 5, steel)),
      ],
    ],
    [
      "打造舒適座艙",
      [
        piece("座艙地板", [275, 265, 236, 65], 23, path("M288 272h210l7 43-219 8-17-25z", navy, ink, 6), line(314, 292, 470, 287, 7, paleBlue)),
        piece("駕駛座", [333, 202, 91, 102], 27, path("M349 211h44l17 59-15 27h-49l-9-28z", "#f5b55e", ink, 6), rect(349, 254, 54, 34, 13, gold, ink, 5)),
        piece("乘客座", [425, 203, 91, 101], 27, path("M441 212h43l18 57-15 28h-49l-9-28z", "#f5b55e", ink, 6), rect(441, 254, 54, 34, 13, gold, ink, 5)),
      ],
    ],
    [
      "闔上漂亮車門",
      [
        piece("左車門", [277, 278, 116, 91], 29, path("M290 285h91l8 77h-108z", coral, ink, 7), line(313, 303, 363, 303, 6, "#ffad8b"), rect(347, 315, 25, 10, 5, gold, ink, 3)),
        piece("右車門", [388, 276, 117, 93], 29, path("M397 283h91l13 79H393z", red, ink, 7), line(416, 302, 472, 302, 6, "#f98879"), rect(457, 314, 25, 10, 5, gold, ink, 3)),
        piece("側邊進氣肩", [451, 322, 87, 55], 32, path("M461 329h66l6 13-18 27h-57l-10-16z", tire, ink, 5), path("M477 341h35l-9 16h-32z", paleBlue, "none", 0)),
      ],
    ],
    [
      "架起拱形車頂",
      [
        piece("前擋風玻璃", [433, 160, 111, 123], 30, path("M451 270l-10-43 35-58h48l12 103z", paleBlue, ink, 7), path("M466 222l23-39h22l8 74h-58z", "#d8f3ff", "none", 0)),
        piece("後擋風玻璃", [250, 165, 112, 120], 30, path("M260 272l27-96h47l20 51-5 47z", paleBlue, ink, 7), path("M281 257l18-68h23l14 39-4 30z", "#d8f3ff", "none", 0)),
        piece("紅色弧形車頂", [306, 124, 190, 82], 32, path("M316 194l37-55 76-9 58 34-3 31z", red, ink, 8), path("M355 154l70-9 35 20H342z", "#f9826c", "none", 0)),
      ],
    ],
    [
      "補齊透亮車窗",
      [
        piece("左側大車窗", [302, 177, 102, 104], 33, path("M318 268l9-61 30-23h34l5 84z", "#7bc6e8", ink, 6), path("M341 213l21-16h16l3 54h-48z", "#d9f5ff", "none", 0)),
        piece("右側大車窗", [385, 176, 98, 105], 33, path("M394 268l3-84h32l37 26 9 58z", "#68b8dc", ink, 6), path("M411 198h13l26 18 6 35h-47z", "#d9f5ff", "none", 0)),
        piece("中央窗柱", [376, 168, 50, 119], 36, path("M388 176h24l7 102h-36z", cream, ink, 5), line(395, 194, 403, 258, 5, gold)),
      ],
    ],
    [
      "點亮前方道路",
      [
        lamp("左前大燈", 654, 306, gold),
        lamp("右前大燈", 684, 338, "#fff0a0"),
        piece("微笑水箱罩", [625, 332, 91, 58], 39, path("M636 339h70l4 18-20 24h-42l-18-24z", tire, ink, 5), line(650, 350, 692, 350, 5, steel), line(655, 364, 685, 364, 5, steel)),
      ],
    ],
    [
      "完成俐落車尾",
      [
        lamp("紅色尾燈", 165, 309, "#ff786b"),
        piece("後行李箱蓋", [116, 235, 168, 90], 28, path("M128 317l12-55 72-20 62 32-5 43z", red, ink, 7), path("M158 271l54-15 34 18-88 13z", "#f67b67", "none", 0)),
        piece("雙管排氣尾段", [105, 348, 100, 54], 37, path("M115 358h52l17 11-12 23h-57z", steel, ink, 5), circle(128, 375, 11, tire, cream, 4), circle(160, 375, 11, tire, cream, 4)),
      ],
    ],
    [
      "加上防撞與後視鏡",
      [
        piece("前防撞桿", [635, 359, 103, 54], 42, path("M646 367h74l12 15-19 23h-75l-8-17z", gold, ink, 6), line(660, 382, 707, 382, 6, cream)),
        piece("後防撞桿", [85, 354, 115, 55], 42, path("M99 362h82l12 19-18 20H94l-5-18z", gold, ink, 6), line(110, 379, 171, 379, 6, cream)),
        piece("雙邊後視鏡", [247, 197, 305, 67], 43, path("M260 225l35-18 22 10-5 26-39 9-17-12z", coral, ink, 5), path("M487 217l24-10 32 19 3 17-18 10-38-11z", coral, ink, 5), line(304, 232, 331, 249, 6, ink), line(487, 232, 465, 250, 6, ink)),
      ],
    ],
    [
      "貼上閃電跑帶",
      [
        piece("後段閃電貼", [151, 315, 171, 55], 45, path("M160 337l61-15 29 12 60-10-44 35-39-9-58 13z", gold, ink, 4)),
        piece("車門閃電貼", [299, 314, 194, 57], 45, path("M310 335l63-12 34 14 72-13-50 37-42-11-67 12z", cream, ink, 4)),
        piece("車頭閃電貼", [477, 313, 158, 55], 45, path("M487 335l49-13 29 12 57-7-40 32-36-9-50 11z", gold, ink, 4)),
      ],
    ],
    [
      "裝上輪心與尾翼",
      [
        piece("後輪星形輪心", [199, 345, 90, 90], 46, circle(244, 390, 34, cream, ink, 5), path("M244 361l8 19 21 2-16 13 5 21-18-11-18 11 5-21-16-13 21-2z", coral, ink, 4)),
        piece("前輪星形輪心", [510, 345, 90, 90], 46, circle(555, 390, 34, cream, ink, 5), path("M555 361l8 19 21 2-16 13 5 21-18-11-18 11 5-21-16-13 21-2z", coral, ink, 4)),
        piece("高翹小尾翼", [102, 197, 174, 71], 46, path("M120 205h139l-17 27H128z", red, ink, 6), line(145, 232, 139, 260, 9, ink), line(225, 232, 236, 258, 9, ink)),
      ],
    ],
    [
      "最後的冠軍細節",
      [
        piece("金色車頭徽章", [583, 246, 64, 57], 48, path("M614 253l9 15 18 4-13 12 2 13-16-7-16 7 2-13-13-12 18-4z", gold, ink, 4)),
        piece("專屬尾牌", [112, 320, 92, 52], 48, rect(119, 327, 78, 38, 9, cream, ink, 5), line(136, 346, 180, 346, 5, red)),
        piece("方向盤與儀表組", [397, 229, 79, 70], 48, circle(434, 264, 28, "none", ink, 8), circle(434, 264, 8, gold, ink, 4), line(434, 236, 434, 292, 5, ink), line(411, 276, 457, 249, 5, ink)),
      ],
    ],
  ]);

  const train = makeModel("train", "藍綠蒸汽火車", [
    ["鋪好三段鐵軌", [railSection("後段鐵軌", 55, 225), railSection("中段鐵軌", 280, 240), railSection("前段鐵軌", 520, 225)]],
    ["大輪子排排站", [wheel("後方動輪", 245, 390, 48, gold, 10), wheel("中央動輪", 388, 390, 55, gold, 10), wheel("前方動輪", 532, 390, 48, gold, 10)]],
    [
      "架起火車底座",
      [
        piece("後底架", [116, 334, 216, 63], 16, path("M128 342h190l9 39H118z", navy, ink, 7), line(151, 360, 295, 360, 7, paleBlue)),
        piece("中央底架", [308, 328, 204, 65], 16, path("M319 336h180l8 43H311z", teal, ink, 7), line(337, 356, 481, 356, 7, paleTeal)),
        piece("前底架", [490, 333, 196, 62], 16, path("M501 341h165l15 19-15 22H494z", navy, ink, 7), line(521, 360, 647, 360, 7, paleBlue)),
      ],
    ],
    [
      "接起長長鍋爐",
      [
        piece("鍋爐後筒", [275, 227, 143, 120], 22, path("M292 239h111l9 94H282z", teal, ink, 7), ellipse(347, 239, 55, 19, paleTeal, ink, 6), ellipse(347, 333, 65, 17, "#24646d", ink, 5)),
        piece("鍋爐中筒", [401, 225, 145, 122], 22, path("M414 237h119l7 96H407z", "#378e94", ink, 7), ellipse(474, 238, 59, 19, "#a7d9d2", ink, 6), ellipse(474, 332, 66, 17, "#24646d", ink, 5)),
        piece("鍋爐前筒", [526, 224, 135, 125], 22, path("M539 236h103l13 95-116 5z", teal, ink, 7), ellipse(590, 238, 52, 19, paleTeal, ink, 6), ellipse(597, 331, 58, 18, "#24646d", ink, 5)),
      ],
    ],
    [
      "裝上勇敢車頭",
      [
        piece("圓形煙箱門", [620, 231, 91, 115], 26, ellipse(664, 288, 38, 51, navy, ink, 7), circle(674, 288, 15, gold, ink, 5), line(647, 288, 692, 288, 5, steel)),
        piece("紅色排障器", [633, 329, 113, 82], 28, path("M646 342h48l45 54h-96l-7-24z", coral, ink, 7), line(663, 351, 655, 390, 6, cream), line(682, 350, 681, 393, 6, cream), line(700, 361, 710, 394, 6, cream)),
        piece("前端圓牌", [610, 187, 94, 68], 30, path("M624 219l18-24h38l17 24-17 26h-39z", gold, ink, 6), circle(660, 220, 12, cream, ink, 4)),
      ],
    ],
    [
      "蓋起司機車廂",
      [
        piece("駕駛室背牆", [95, 194, 106, 166], 23, path("M108 207h80l7 143h-91z", teal, ink, 7), line(126, 329, 175, 329, 7, paleTeal)),
        piece("駕駛室側牆", [181, 183, 122, 177], 24, path("M194 196h94l9 154H188z", "#3c9296", ink, 7), path("M211 221h58l7 58h-69z", paleBlue, ink, 5)),
        piece("寬大車廂屋頂", [82, 139, 229, 78], 30, path("M95 201l16-48 151-8 41 32-8 27z", navy, ink, 8), path("M127 165l127-7 21 14-164 11z", blue, "none", 0)),
      ],
    ],
    [
      "開出明亮車窗",
      [
        piece("司機方窗", [112, 215, 77, 86], 32, rect(121, 224, 59, 68, 12, paleBlue, ink, 6), path("M134 237h32v42h-32z", "#d9f5ff", "none", 0)),
        piece("副手方窗", [198, 213, 79, 88], 32, rect(207, 222, 61, 70, 12, "#72bddc", ink, 6), path("M221 236h33v42h-33z", "#d9f5ff", "none", 0)),
        piece("金色鍋爐束帶", [386, 222, 56, 128], 33, path("M400 230h25l9 108h-38z", gold, ink, 5), line(402, 248, 426, 248, 5, cream), line(399, 319, 430, 319, 5, cream)),
      ],
    ],
    [
      "豎起煙囪和汽笛",
      [
        piece("高高大煙囪", [546, 101, 103, 149], 34, path("M570 237l8-66-20-25 13-34h50l14 34-22 25 9 66z", tire, ink, 7), path("M566 112h61l10 23-77 3z", navy, ink, 5)),
        piece("圓頂蒸汽包", [432, 158, 91, 82], 34, path("M447 229l7-48 16-15h20l17 16 5 47z", gold, ink, 6), ellipse(479, 181, 26, 12, cream, ink, 4)),
        piece("雙聲汽笛", [346, 164, 76, 75], 36, path("M358 229l9-48h14l8 48z", gold, ink, 5), path("M387 229l8-55h14l7 55z", "#f2b94f", ink, 5), line(350, 229, 420, 229, 8, ink)),
      ],
    ],
    [
      "連起奔跑輪桿",
      [
        piece("長連動桿", [194, 365, 397, 63], 35, line(210, 405, 575, 379, 16, coral), circle(245, 402, 13, gold, ink, 5), circle(388, 392, 13, gold, ink, 5), circle(532, 382, 13, gold, ink, 5)),
        piece("上方搖臂", [295, 325, 249, 70], 36, line(309, 338, 526, 381, 13, cream), circle(316, 340, 11, gold, ink, 4), circle(520, 380, 11, gold, ink, 4)),
        piece("中央曲柄盤", [347, 350, 83, 84], 37, circle(388, 390, 35, coral, ink, 6), circle(388, 390, 13, gold, ink, 4), line(388, 355, 388, 425, 5, cream)),
      ],
    ],
    [
      "點亮火車前方",
      [
        lamp("前方金色大燈", 687, 237, gold, 40),
        piece("車頂小銅鐘", [260, 148, 81, 67], 39, path("M277 202l8-35 12-11h12l14 12 7 34z", gold, ink, 5), ellipse(303, 202, 28, 8, cream, ink, 4), circle(303, 209, 7, coral, ink, 3)),
        piece("車頭安全扶手", [647, 247, 90, 89], 41, path("M662 324v-49q0-16 16-16h35v65", "none", gold, 8), line(660, 324, 724, 324, 8, gold)),
      ],
    ],
    [
      "接上煤水車",
      [
        piece("煤水車底盤", [34, 347, 166, 57], 15, path("M45 354h141l9 35H38z", navy, ink, 6), line(61, 371, 174, 371, 6, paleBlue)),
        piece("煤水車箱", [43, 237, 146, 126], 22, path("M57 249h117l9 103H49z", "#357f86", ink, 7), path("M70 269h91l5 62H64z", paleTeal, "none", 0)),
        piece("亮黃煤水車沿", [36, 217, 162, 58], 31, path("M48 224h135l10 20-16 22H45l-7-23z", gold, ink, 6), line(66, 243, 169, 243, 5, cream)),
      ],
    ],
    [
      "煤水車也能滾動",
      [
        wheel("煤水車後輪", 82, 389, 36, gold, 12),
        wheel("煤水車前輪", 158, 389, 36, gold, 12),
        piece("亮晶晶煤塊", [53, 202, 132, 67], 34, path("M63 248l12-31 25 8 20-16 22 14 22-7 14 32z", tire, ink, 6), circle(96, 235, 8, steel, "none", 0), circle(145, 235, 7, steel, "none", 0)),
      ],
    ],
    [
      "刷上快速紅線",
      [
        piece("車廂紅線", [91, 303, 213, 55], 43, path("M101 316h189l8 17-14 17H96z", coral, ink, 4)),
        piece("鍋爐紅線", [281, 294, 239, 57], 43, path("M292 307h213l9 18-15 18H286z", coral, ink, 4)),
        piece("車頭紅線", [512, 294, 164, 57], 43, path("M523 307h137l10 18-14 18H518z", coral, ink, 4)),
      ],
    ],
    [
      "蒸汽火車出發",
      [
        piece("前後連結鉤", [18, 336, 749, 60], 46, path("M28 358h38l15 14-17 15H27", "none", ink, 11), path("M706 356h31l22 14-21 16h-35", "none", ink, 11)),
        piece("閃亮火車名牌", [421, 259, 140, 67], 46, path("M432 267h116l8 25-17 26h-96l-17-26z", gold, ink, 6), line(453, 292, 529, 292, 7, teal)),
        piece("蓬鬆白蒸汽", [527, 47, 159, 90], 48, circle(557, 95, 27, cream, ink, 4), circle(600, 77, 35, cream, ink, 4), circle(646, 94, 29, cream, ink, 4), ellipse(601, 111, 69, 19, cream, ink, 4)),
      ],
    ],
  ]);

  const plane = makeModel("plane", "藍色雙引擎飛機", [
    [
      "排好機身龍骨",
      [
        piece("機尾龍骨", [105, 224, 197, 70], 8, path("M119 253l38-21h132l8 28-25 26H143z", navy, ink, 7), line(161, 259, 271, 259, 6, paleBlue)),
        piece("中央龍骨", [279, 220, 243, 76], 8, path("M291 232h215l10 28-18 27H293l-8-26z", blue, ink, 7), line(316, 257, 477, 257, 7, paleBlue)),
        piece("機首龍骨", [501, 222, 180, 75], 8, path("M511 233h110l51 25-45 30H510l-8-27z", navy, ink, 7), line(531, 258, 637, 258, 6, paleBlue)),
      ],
    ],
    [
      "裝上起落架底座",
      [
        piece("左主起落架", [330, 287, 79, 112], 10, line(371, 296, 371, 363, 12, steel), path("M351 361h41l10 25-13 8h-42l-10-9z", navy, ink, 6), circle(358, 383, 15, tire, cream, 5), circle(384, 383, 15, tire, cream, 5)),
        piece("右主起落架", [424, 287, 79, 112], 10, line(463, 296, 463, 363, 12, steel), path("M444 361h40l11 25-13 8h-42l-10-9z", navy, ink, 6), circle(450, 383, 15, tire, cream, 5), circle(477, 383, 15, tire, cream, 5)),
        piece("機首起落架", [579, 284, 72, 98], 10, line(615, 292, 615, 349, 10, steel), path("M592 345h44l8 19-13 11h-38l-9-12z", navy, ink, 5), circle(615, 362, 14, tire, cream, 5)),
      ],
    ],
    [
      "合起藍色機腹",
      [
        piece("後段機腹", [138, 202, 190, 115], 17, path("M151 254l41-43h121l9 48-29 49H177z", blue, ink, 7), path("M179 250l31-25h83l6 28-19 35h-91z", paleBlue, "none", 0)),
        piece("中央機腹", [303, 198, 212, 123], 17, path("M315 209h181l13 51-29 51H326l-17-50z", "#4f91cf", ink, 7), path("M339 224h137l9 36-21 34H344l-12-34z", "#9dd5ee", "none", 0)),
        piece("前段機腹", [491, 204, 191, 112], 17, path("M503 215h111l58 41-56 49H511l-13-45z", blue, ink, 7), path("M525 229h80l40 27-38 31h-81l-7-27z", paleBlue, "none", 0)),
      ],
    ],
    [
      "接上尖尖機頭尾",
      [
        piece("圓尖機鼻", [632, 217, 111, 85], 21, path("M643 231l48 9 43 20-43 24-48 5-18-28z", cream, ink, 7), path("M683 250l29 10-30 12-24-3z", gold, "none", 0)),
        piece("收尖機尾", [70, 218, 101, 85], 21, path("M83 259l54-31 27 11-3 44-26 11z", cream, ink, 7), path("M99 258l35-17 15 5-2 29-14 5z", paleBlue, "none", 0)),
        piece("中央背脊", [242, 178, 342, 71], 23, path("M257 237l54-47h192l67 47z", "#5ba0d8", ink, 7), path("M323 204h169l35 25H292z", "#abdcef", "none", 0)),
      ],
    ],
    [
      "展開左右大機翼",
      [
        piece("上方大機翼", [322, 43, 196, 196], 14, path("M389 226l-55-17 73-154 48-6 49 35-66 145z", blue, ink, 8), path("M404 195l-42-10 60-116 27-4 30 20-54 120z", paleBlue, "none", 0)),
        piece("下方大機翼", [322, 279, 196, 182], 14, path("M389 286l-55 17 75 146 48 5 47-35-66-140z", blue, ink, 8), path("M405 310l-43 10 61 113 27 3 29-20-54-116z", paleBlue, "none", 0)),
        piece("厚實翼根", [346, 211, 150, 99], 20, path("M358 221h126l7 79H352z", navy, ink, 7), line(379, 245, 466, 245, 7, gold), line(376, 278, 468, 278, 7, gold)),
      ],
    ],
    [
      "裝好尾翼方向",
      [
        piece("上方水平尾翼", [111, 126, 136, 122], 15, path("M146 238l-27-21 68-80 45-4 8 28-57 84z", navy, ink, 7), path("M163 214l-20-6 52-57 23-2 3 12-45 62z", paleBlue, "none", 0)),
        piece("下方水平尾翼", [110, 273, 137, 117], 15, path("M145 279l-27 21 70 79 44 3 8-28-57-82z", navy, ink, 7), path("M162 303l-19 6 52 56 23 1 3-12-45-60z", paleBlue, "none", 0)),
        piece("高高垂直尾翼", [112, 150, 112, 124], 25, path("M139 259l13-95 28-8 34 20-23 88z", coral, ink, 7), path("M158 238l8-66 11-3 18 11-17 62z", "#ff9b7d", "none", 0)),
      ],
    ],
    [
      "蓋上透明駕駛艙",
      [
        piece("大駕駛艙罩", [522, 174, 128, 100], 29, path("M535 257l18-64 35-12 43 27 12 49z", "#74bedf", ink, 7), path("M557 242l12-39 17-6 27 17 7 28z", "#d9f5ff", "none", 0)),
        piece("左駕駛座", [543, 215, 70, 67], 27, path("M557 272l4-40 15-10 20 9 8 41z", gold, ink, 5), line(568, 242, 590, 242, 5, cream)),
        piece("右駕駛座", [590, 214, 69, 69], 27, path("M600 272l5-41 15-10 20 10 8 41z", "#f5b55e", ink, 5), line(612, 242, 635, 242, 5, cream)),
      ],
    ],
    [
      "掛上雙引擎",
      [
        piece("上方噴射引擎", [390, 100, 119, 128], 27, path("M406 211l-8-73 25-28h46l28 27-9 74z", navy, ink, 7), ellipse(448, 136, 43, 24, tire, cream, 5), circle(448, 136, 13, gold, ink, 4)),
        piece("下方噴射引擎", [390, 286, 119, 129], 27, path("M406 301l-8 75 25 28h46l28-27-9-76z", navy, ink, 7), ellipse(448, 378, 43, 24, tire, cream, 5), circle(448, 378, 13, gold, ink, 4)),
        piece("雙引擎連接梁", [376, 189, 147, 136], 26, path("M389 203h119l8 108H386z", "#3e77ad", ink, 7), path("M405 221h88l5 72h-95z", paleBlue, "none", 0)),
      ],
    ],
    [
      "補上翼尖與襟翼",
      [
        piece("上方紅翼尖", [326, 36, 139, 74], 31, path("M337 91l70-46 44 3 8 31-111 24z", coral, ink, 6), path("M377 76l35-21 25 2 3 11-56 14z", gold, "none", 0)),
        piece("下方紅翼尖", [326, 404, 139, 70], 31, path("M337 421l70 45 44-3 8-30-111-24z", coral, ink, 6), path("M377 437l35 19 25-2 3-10-56-14z", gold, "none", 0)),
        piece("成對藍色襟翼", [336, 100, 83, 313], 30, path("M349 112l54 13-18 95-42-10z", navy, ink, 6), path("M349 400l54-13-18-94-42 10z", navy, ink, 6), line(362, 138, 355, 191, 5, paleBlue), line(362, 375, 355, 322, 5, paleBlue)),
      ],
    ],
    [
      "排出明亮客艙窗",
      [
        piece("前排客艙窗", [466, 214, 99, 89], 34, ...[0, 1, 2].map((i) => rect(476 + i * 28, 228, 21, 51, 9, "#d9f5ff", ink, 4))),
        piece("中排客艙窗", [366, 214, 109, 89], 34, ...[0, 1, 2].map((i) => rect(377 + i * 31, 228, 23, 51, 9, paleBlue, ink, 4))),
        piece("後排客艙窗", [253, 214, 119, 89], 34, ...[0, 1, 2].map((i) => rect(265 + i * 34, 228, 25, 51, 9, "#d9f5ff", ink, 4))),
      ],
    ],
    [
      "裝上登機門與貨艙",
      [
        piece("前登機門", [531, 205, 69, 101], 36, rect(540, 214, 51, 83, 13, cream, ink, 6), circle(578, 254, 5, coral, ink, 2), line(551, 231, 580, 231, 5, paleBlue)),
        piece("後登機門", [196, 204, 70, 102], 36, rect(205, 213, 52, 84, 13, cream, ink, 6), circle(244, 254, 5, coral, ink, 2), line(216, 231, 246, 231, 5, paleBlue)),
        piece("機腹貨艙門", [330, 273, 168, 62], 36, path("M343 283h142l8 21-17 23H344l-8-22z", gold, ink, 6), line(366, 303, 466, 303, 6, cream)),
      ],
    ],
    [
      "刷上天空跑線",
      [
        piece("機尾藍白跑線", [117, 239, 193, 50], 40, path("M126 249h174l5 14-16 16H128l-7-15z", cream, ink, 4), line(147, 263, 281, 263, 7, coral)),
        piece("機身中央跑線", [290, 237, 214, 54], 40, path("M300 247h192l6 17-17 17H301l-7-17z", cream, ink, 4), line(322, 264, 474, 264, 7, coral)),
        piece("機首金色跑線", [489, 238, 173, 53], 40, path("M499 248h121l35 16-34 17H499l-6-17z", gold, ink, 4), line(518, 264, 623, 264, 6, cream)),
      ],
    ],
    [
      "旋轉引擎風扇",
      [
        piece("上引擎銀風扇", [405, 94, 87, 87], 43, circle(448, 136, 36, steel, ink, 6), ...[0, 45, 90, 135].map((deg) => `<path d="M448 136l0-28" fill="none" stroke="${cream}" stroke-width="7" stroke-linecap="round" transform="rotate(${deg} 448 136)"/>`), circle(448, 136, 9, coral, ink, 3)),
        piece("下引擎銀風扇", [405, 335, 87, 87], 43, circle(448, 378, 36, steel, ink, 6), ...[0, 45, 90, 135].map((deg) => `<path d="M448 378l0-28" fill="none" stroke="${cream}" stroke-width="7" stroke-linecap="round" transform="rotate(${deg} 448 378)"/>`), circle(448, 378, 9, coral, ink, 3)),
        piece("機腹降落燈排", [477, 276, 99, 55], 43, path("M488 283h76l7 18-13 22h-70l-7-21z", navy, ink, 5), circle(505, 302, 9, gold, cream, 3), circle(529, 302, 9, gold, cream, 3), circle(553, 302, 9, gold, cream, 3)),
      ],
    ],
    [
      "藍天飛機完成",
      [
        piece("金色機鼻雷達", [675, 226, 74, 73], 46, path("M687 239l31 8 24 14-25 16-31 8-10-23z", gold, ink, 6), circle(714, 261, 8, cream, ink, 3)),
        piece("尾翼彩色旗", [128, 168, 83, 79], 46, path("M141 235l10-56 27-8 25 18-16 51z", cream, ink, 5), path("M153 210l37-17-4 16-37 17z", coral, "none", 0), line(155, 186, 194, 221, 5, blue)),
        piece("雙翼星星徽章", [340, 87, 119, 339], 46, path("M393 99l9 18 20 3-15 14 4 20-18-10-18 10 4-20-15-14 20-3z", gold, ink, 4), path("M393 358l9 18 20 3-15 14 4 20-18-10-18 10 4-20-15-14 20-3z", gold, ink, 4)),
      ],
    ],
  ]);

  const legacyModels = [car, train, plane];
  const models = [root.KidsBrickE500, root.KidsBrickEmu3000, root.KidsBrickR200, root.KidsBrick700T, root.KidsBrickN700S].filter(Boolean);

  root.KidsBrickModels = {
    version: 1,
    title: "積木列車收藏",
    models,
    legacyModels,
    get(id) {
      return [...models, ...legacyModels].find((model) => model.id === id) || null;
    },
  };
})(typeof window === "undefined" ? globalThis : window);
