(function (root) {
  "use strict";

  // A small, deterministic orthographic brick model. Coordinates below are in
  // train space: x = length, y = width, z = height. Every assembly is standalone
  // SVG: no image, external resource, shared definition, or instance-sensitive ID.
  const P = (x, y, z) => [170 + x * 0.91 - y * 0.84, 425 - x * 0.2 - y * 0.35 - z];
  const n = (v) => Math.round(v * 100) / 100;
  const colors = {
    orange: ["#f56b16", "#ff9437", "#cc4510"],
    orangeLight: ["#ff7a1b", "#ffad50", "#d65312"],
    dark: ["#30363b", "#555e64", "#20272d"],
    gray: ["#707b83", "#a1abb2", "#48535e"],
    steel: ["#a5adb0", "#d6dadd", "#737e86"],
    black: ["#222a30", "#465058", "#151c22"],
    sleeper: ["#8e7b62", "#b7a78c", "#685d4e"],
    yellow: ["#d9ad20", "#ffe575", "#9c7415"],
  };
  let art;
  let bounds;
  const point = (v) => {
    const p = P(...v);
    bounds.push(p);
    return p.map(n).join(",");
  };
  function polygon(vertices, fill, stroke = "#30363b", width = 0.45) {
    art.push(`<polygon points="${vertices.map(point).join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`);
  }
  const tint = (hex, amount) => {
    const rgb = hex.slice(1).match(/../g).map(channel => parseInt(channel, 16));
    return `#${rgb.map(channel => Math.round(channel + (amount > 0 ? 255 - channel : channel) * amount).toString(16).padStart(2, "0")).join("")}`;
  };
  function line(vertices, color, width = 1) {
    art.push(`<polyline points="${vertices.map(point).join(" ")}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`);
  }
  function disk(x, y, z, radius, plane, fill, stroke = "#20282e", sw = 0.7) {
    const vertices = Array.from({ length: 32 }, (_, i) => {
      const a = i * Math.PI / 16;
      return plane === "xy" ? [x + Math.cos(a) * radius, y + Math.sin(a) * radius, z]
        : plane === "yz" ? [x, y + Math.cos(a) * radius, z + Math.sin(a) * radius]
          : [x + Math.cos(a) * radius, y, z + Math.sin(a) * radius];
    });
    polygon(vertices, fill, stroke, sw);
  }
  function stud(x, y, z, color = "dark", r = 4.4) {
    const c = colors[color];
    // Cylindrical side wall and inset top rim, not a dot painted on a tile.
    disk(x, y, z + 1, r, "xy", c[2]);
    const a = P(x, y, z + 1);
    const b = P(x, y, z + 4.6);
    const rx = r * 1.26;
    const ry = r * 0.443;
    art.push(`<path d="M${n(a[0] - rx)} ${n(a[1])}v-3.6a${n(rx)} ${n(ry)} 0 0 1 ${n(rx * 2)} 0v3.6a${n(rx)} ${n(ry)} 0 0 1 ${n(-rx * 2)} 0" fill="${c[0]}" stroke="${c[2]}" stroke-width=".65"/>`);
    art.push(`<ellipse cx="${n(b[0])}" cy="${n(b[1])}" rx="${n(rx)}" ry="${n(ry)}" fill="${c[1]}" stroke="${c[2]}" stroke-width=".6"/><path d="M${n(b[0] - rx * 0.7)} ${n(b[1] - ry * 0.25)}q${n(rx * 0.6)} ${n(-ry * 0.8)} ${n(rx * 1.3)} 0" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width=".7"/>`);
    bounds.push([a[0] - rx - 1, b[1] - ry - 1], [a[0] + rx + 1, a[1] + ry + 1]);
  }
  function brick(x, y, z, length, width, height, color = "orange", studs = false) {
    const c = colors[color];
    polygon([[x, y, z], [x + length, y, z], [x + length, y, z + height], [x, y, z + height]], c[0]);
    polygon([[x, y, z], [x, y + width, z], [x, y + width, z + height], [x, y, z + height]], c[2]);
    // Baked face shading keeps every tray piece independent. Narrow tone bands
    // simulate soft light without global SVG gradient IDs that collide in trays.
    if (height >= 12) {
      for (let row = 0; row < 12; row++) {
        const low = z + .5 + (height - 1) * row / 12;
        const high = z + .5 + (height - 1) * (row + 1) / 12;
        const sheen = -.04 + row * .009;
        polygon([[x + .5, y, low], [x + length - .5, y, low], [x + length - .5, y, high], [x + .5, y, high]], tint(c[0], sheen), "none", 0);
        polygon([[x, y + .5, low], [x, y + width - .5, low], [x, y + width - .5, high], [x, y + .5, high]], tint(c[2], sheen + .04), "none", 0);
      }
    }
    polygon([[x, y, z + height], [x + length, y, z + height], [x + length, y + width, z + height], [x, y + width, z + height]], c[1]);
    line([[x + .8, y, z + height - 1.2], [x + length - .8, y, z + height - 1.2]], "#fff6e9", .55);
    line([[x, y + .8, z + height - 1.2], [x, y + width - .8, z + height - 1.2]], tint(c[1], .13), .55);
    if (height > 15) line([[x + .7, y, z + 2], [x + .7, y, z + height - 2]], tint(c[0], .25), .65);
    line([[x + .8, y, z + 1], [x + length - .8, y, z + 1]], c[2], .7);
    if (studs) {
      for (let sx = x + 9; sx < x + length - 5; sx += 17) {
        for (let sy = y + width - 9; sy > y + 5; sy -= 17) stud(sx, sy, z + height, color);
      }
    }
  }
  function text(x, y, z, value, size = 9, fill = "#fff1dc") {
    const [sx, sy] = P(x, y, z);
    bounds.push([sx - 2, sy - size - 2], [sx + value.length * size * .7, sy + 3]);
    art.push(`<text x="${n(sx)}" y="${n(sy)}" transform="rotate(-12.4 ${n(sx)} ${n(sy)})" fill="${fill}" font-family="Arial,sans-serif" font-size="${size}" font-weight="700">${value}</text>`);
  }
  function part(name, z, draw) {
    art = [];
    bounds = [];
    draw();
    const xs = bounds.map(p => p[0]);
    const ys = bounds.map(p => p[1]);
    const left = Math.min(...xs) - 5;
    const top = Math.min(...ys) - 5;
    const width = Math.max(44, Math.max(...xs) - left + 5);
    const height = Math.max(44, Math.max(...ys) - top + 5);
    return { name, z: Math.round(z * 100), box: { x: n(left - (width - (Math.max(...xs) - left + 5)) / 2), y: n(top - (height - (Math.max(...ys) - top + 5)) / 2), width: n(width), height: n(height) }, svg: `<g aria-hidden="true">${art.join("")}</g>` };
  }
  function wheelAssembly(x, label) {
    return part(label, 12, () => {
      brick(x - 11, 4, 29, 22, 77, 8, "black");
      for (const y of [75, 0]) {
        disk(x, y, 25, 16.4, "xz", "#151c21", "#12171b", 1.4);
        disk(x, y - 1, 25, 12.7, "xz", "#50595f", "#99a2a8", 1.15);
        disk(x, y - 1.2, 25, 8.4, "xz", "#252d33", "#12191e", .8);
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) line([[x + Math.cos(a) * 5, y - 1.5, 25 + Math.sin(a) * 5], [x + Math.cos(a) * 10, y - 1.5, 25 + Math.sin(a) * 10]], "#77818a", 1.3);
        disk(x, y - 2, 25, 4.5, "xz", "#87929a", "#141d23", 1.1);
      }
      brick(x - 6, -4, 27, 12, 10, 12, "dark");
      disk(x, -4.5, 33, 3.2, "xz", "#929da3");
    });
  }
  function frame(x) {
    brick(x, -1, 41, 112, 85, 8, "dark", true);
    for (const s of [5, 37, 69, 101]) {
      brick(x + s, -5, 30, 6, 9, 13, "black");
      for (let h = 33; h < 42; h += 2.2) line([[x + s, -6, h], [x + s + 6, -6, h]], "#9aa0a4", .9);
    }
    line([[x + 7, -6, 31], [x + 16, -6, 25], [x + 47, -6, 25], [x + 55, -6, 32], [x + 80, -6, 25], [x + 103, -6, 25]], "#48535a", 3.4);
  }
  function roof(x, length) {
    brick(x, 0, 145, length, 90, 5, "dark");
    for (let at = x; at < x + length - 1; at += 25) {
      const end = Math.min(at + 24.5, x + length);
      polygon([[at, 0, 150], [end, 0, 150], [end, 14, 164], [at, 14, 164]], "#677179");
      polygon([[at, 14, 164], [end, 14, 164], [end, 75, 164], [at, 75, 164]], "#869098");
      for (let row = 0; row < 8; row++) {
        const y = 14.5 + row * 7.5;
        polygon([[at + .5, y, 164.1], [end - .5, y, 164.1], [end - .5, y + 7.5, 164.1], [at + .5, y + 7.5, 164.1]], tint("#869098", .13 - row * .027), "none", 0);
      }
      polygon([[at, 75, 164], [end, 75, 164], [end, 90, 151], [at, 90, 151]], "#565f66");
      line([[at + 1, 1, 151], [at + 1, 14, 163], [at + 1, 75, 163]], "#bec6cc", .6);
      stud(at + 11, 66, 164, "dark", 3.9);
    }
  }
  function handrail(x) {
    line([[x, -2, 76], [x, -2, 134]], "#b7480e", 4);
    line([[x - .7, -3, 76], [x - .7, -3, 134]], "#ffb14f", 2);
    for (const h of [77, 102, 131]) disk(x, -3, h, 2.7, "xz", "#ff9b33", "#bf460c", .7);
  }
  function cabSideWindow(x, width) {
    brick(x, -1, 106, width, 3, 37, "black");
    polygon([[x + 3, -1.5, 109], [x + width - 3, -1.5, 109], [x + width - 3, -1.5, 140], [x + 3, -1.5, 140]], "#263e4b", "#c4c8c7", .8);
    polygon([[x + 4, -1.8, 112], [x + width * .55, -1.8, 115], [x + width * .55, -1.8, 139], [x + 4, -1.8, 139]], "#627780", "none", 0);
    line([[x + width * .57, -2, 110], [x + width * .57, -2, 140]], "#161e24", 2);
    line([[x + 5, -2, 112], [x + width - 5, -2, 112]], "#87999f", .7);
  }
  function vent(x, length) {
    brick(x, 17, 164, length, 51, 5, "dark");
    for (let at = x + 3; at < x + length - 2; at += 4.5) {
      line([[at, 20, 169.3], [at, 64, 169.3]], "#151e26", 2);
      line([[at + 1.4, 20, 169.5], [at + 1.4, 64, 169.5]], "#a3adb2", .7);
    }
  }
  function pantograph(x, raised) {
    brick(x - 21, 21, 168, 43, 48, 5, "dark", true);
    for (const y of [27, 61]) {
      brick(x - 11, y - 4, 172, 19, 8, 4, "steel");
      const base = [x, y, 181];
      const elbow = [x + (raised ? 30 : 23), y, raised ? 207 : 186];
      const top = [x + (raised ? -15 : -8), y, raised ? 241 : 194];
      line([base, elbow, top], "#263039", 7);
      line([[base[0], y - .5, base[2] + 1], [elbow[0], y - .5, elbow[2] + 1], [top[0], y - .5, top[2] + 1]], "#a3acb2", 4);
      line([[base[0] - 7, y, base[2]], [elbow[0] - 6, y, elbow[2]], [top[0] - 4, y, top[2]]], "#5b6771", 1.6);
      disk(...elbow, 3.5, "xz", "#89959e", "#2a353f", 1);
      disk(...base, 3, "xz", "#c2c9cd");
    }
    const tx = x + (raised ? -15 : -8);
    const tz = raised ? 241 : 194;
    line([[tx, 12, tz], [tx, 78, tz]], "#263039", 7);
    line([[tx, 12, tz + 1.5], [tx, 78, tz + 1.5]], "#bbc5ca", 4);
    line([[tx - 6, 14, tz + 4], [tx - 6, 76, tz + 4]], "#5a6570", 2.4);
    for (const y of [13, 77]) disk(tx, y, tz, 3.5, "xz", "#cbd2d5", "#67747d");
  }
  const steps = [
    ["鋪好展示軌道", [-42, 174, 390].map((x, i) => part(["前段枕木與鋼軌", "中段枕木與鋼軌", "後段枕木與鋼軌"][i], 1 - i * .01, () => {
      brick(x, -22, -8, 215, 134, 8, "dark");
      for (let at = x + 7; at < x + 212; at += 23) {
        brick(at, -13, 0, 10, 112, 4, "sleeper");
        for (const y of [0, 78]) brick(at - 1, y - 3, 4, 12, 11, 2, "steel");
      }
      for (const y of [2, 80]) {
        brick(x, y, 4, 215, 3, 4, "gray");
        brick(x, y - 1, 8, 215, 5, 2, "steel");
      }
    }))],
    ["前轉向架的三根輪軸", [wheelAssembly(89, "前轉向架・第一輪軸"), wheelAssembly(123, "前轉向架・第二輪軸"), wheelAssembly(157, "前轉向架・第三輪軸")]],
    ["後轉向架的三根輪軸", [wheelAssembly(411, "後轉向架・第一輪軸"), wheelAssembly(445, "後轉向架・第二輪軸"), wheelAssembly(479, "後轉向架・第三輪軸")]],
    ["連成長長的底盤", [0, 190, 380].map((x, i) => part(["前段承重底盤", "中央承重底盤", "後段承重底盤"][i], 18 - i * .01, () => {
      brick(x, 0, 50, 189.5, 90, 9, "black", true);
      for (let at = x + 9; at < x + 185; at += 24) brick(at, -2, 48, 14, 6, 7, "dark");
    }))],
    ["懸吊與車底設備", [part("前轉向架懸吊框", 20, () => frame(67)), part("後轉向架懸吊框", 20, () => frame(389)), part("中央電池箱與風缸", 21, () => {
      brick(224, 2, 25, 121, 66, 23, "dark", true);
      for (const x of [227, 265, 303]) {
        brick(x, -3, 27, 35, 5, 19, "gray");
        line([[x + 4, -4, 31], [x + 29, -4, 31]], "#acb4b9", .7);
        disk(x + 29, -4, 39, 1.3, "xz", "#d2d7d8");
      }
      brick(191, 6, 33, 25, 45, 13, "black");
      disk(203, 2, 39, 6.2, "xz", "#7a858b");
    })]],
    ["裝上橘色下車身", [part("前駕駛室下車身", 30, () => {
      brick(0, 0, 60, 86, 90, 44, "orangeLight");
      for (const x of [0, 43]) brick(x, -1, 59, 42.5, 5, 12, "orange");
      line([[0, 45, 61], [0, 45, 104]], "#bb460e", .7);
    }), part("中央橘色裙板", 29.9, () => {
      for (let j = 5; j >= 0; j--) brick(86 + j * 67.3, 0, 60, 66.8, 90, 25, "orange");
    }), part("後駕駛室下車身", 29.8, () => {
      brick(490, 0, 60, 80, 90, 44, "orangeLight");
      brick(537, -1, 44, 32, 5, 16, "orange");
      line([[532, 0, 61], [532, 0, 102]], "#bc4c17", .8);
    })]],
    ["拼起長形機車車身", [86, 220.7, 355.4].map((x, i) => part(["前段機械室外殼", "中央機械室外殼", "後段機械室外殼"][i], 32 - i * .01, () => {
      brick(x, 0, 85, 134.1, 90, 60, "orange");
      for (const at of [x + 44.7, x + 89.4]) line([[at, -.1, 85.5], [at, -.1, 144]], "#cc5619", .6);
      line([[x + .5, -.3, 91], [x + 133.5, -.3, 91]], "#ff9140", .8);
      for (let at = x; at < x + 132; at += 22.4) brick(at, -.4, 142, 21.8, 5, 5, "orangeLight");
    }))],
    ["兩端駕駛室骨架", [part("前駕駛室側牆與車門", 35, () => {
      polygon([[0, 0, 104], [86, 0, 104], [86, 0, 147], [25, 0, 147]], "#f9771c");
      brick(63, -.5, 69, 21, 2, 76, "orange");
      line([[62, -1, 68], [62, -1, 143]], "#ad3e0e", 1);
      brick(68, -1, 123, 10, 2, 16, "dark");
    }), part("後駕駛室側牆與車門", 35, () => {
      polygon([[490, 0, 104], [570, 0, 104], [548, 0, 147], [490, 0, 147]], "#f9771c");
      brick(492, -.5, 69, 21, 2, 76, "orange");
      line([[514, -1, 68], [514, -1, 143]], "#ad3e0e", 1);
      brick(498, -1, 122, 10, 2, 17, "dark");
    }), part("前端斜面深灰車頭框", 43, () => {
      polygon([[0, 0, 103], [0, 90, 103], [25, 90, 153], [25, 0, 153]], "#343d45", "#17212a", 1);
      polygon([[0, 0, 103], [25, 0, 153], [45, 0, 153], [31, 0, 111]], "#555e66");
      polygon([[25, 0, 153], [25, 90, 153], [38, 78, 165], [38, 13, 165]], "#667079");
      line([[1, 1, 105], [25, 1, 152], [37, 13, 164]], "#a5b0b8", .85);
      for (const y of [10, 29, 49, 69]) brick(2, y, 104, 5, 16, 4, "dark");
    })]],
    ["透明車窗與扶手", [part("前擋風玻璃與雨刷", 46, () => {
      const windowPoint = (y, z) => [(z - 103) / 2 + .15, y, z];
      polygon([windowPoint(7, 110), windowPoint(83, 110), windowPoint(83, 147), windowPoint(7, 147)], "#344953", "#c4ccd0", 1.1);
      for (const y of [9, 47]) {
        polygon([windowPoint(y + 2, 115), windowPoint(y + 13, 118), windowPoint(y + 22, 144), windowPoint(y + 2, 144)], "#829196", "none", 0);
        polygon([windowPoint(y + 24, 113), windowPoint(y + 31, 113), windowPoint(y + 31, 144), windowPoint(y + 26, 144)], "#536975", "none", 0);
        line([windowPoint(y + 8, 113), windowPoint(y + 26, 117), windowPoint(y + 29, 132)], "#10181d", 1.5);
      }
      const [sx, sy] = P(...windowPoint(68, 139));
      art.push(`<text x="${n(sx)}" y="${n(sy)}" transform="rotate(-27 ${n(sx)} ${n(sy)})" font-family="Arial,sans-serif" font-size="6" font-weight="700" fill="#edf2ef">E501</text>`);
    }), part("前側窗與橘色扶手", 47, () => { cabSideWindow(37, 24); handrail(65); handrail(82); }), part("後側窗與橘色扶手", 47, () => { cabSideWindow(518, 25); handrail(493); handrail(512); })]],
    ["分段灰色車頂", [part("前駕駛室斜角屋頂", 41, () => {
      roof(38, 49);
      for (const x of [46, 68]) for (const y of [21, 45, 66]) stud(x, y, 164, "dark");
    }), part("前半機械室屋頂", 40, () => roof(87, 202)), part("後半屋頂與另一端車頭", 40, () => {
      roof(289, 260);
      polygon([[549, 0, 150], [570, 0, 104], [570, 90, 104], [549, 90, 150]], "#3a444d");
      polygon([[548, 0, 148], [551, 0, 145], [565, 0, 115], [548, 0, 115]], "#3d505b");
      line([[550, 0, 147], [566, 0, 114]], "#9fa9ae", .8);
    })]],
    ["車頂散熱與高壓設備", [part("前端絕緣座與散熱格柵", 51, () => {
      vent(104, 38);
      for (const x of [151, 185]) for (const y of [25, 63]) {
        brick(x, y, 164, 10, 10, 7, "dark");
        stud(x + 5, y + 5, 171, "steel", 4.2);
      }
    }), part("中央雙組散熱百葉", 51, () => {
      vent(245, 54); vent(310, 54);
      for (const x of [236, 370]) brick(x, 14, 164, 7, 58, 5, "gray");
    }), part("後端屋頂設備與絕緣座", 51, () => {
      vent(384, 37);
      for (const x of [436, 477]) for (const y of [24, 62]) {
        brick(x, y, 164, 10, 10, 7, "dark");
        stud(x + 5, y + 5, 171, "steel", 4.2);
      }
      brick(516, 25, 164, 23, 42, 7, "dark", true);
    })]],
    ["架起兩座單臂集電弓", [part("前端升起的 Z 形集電弓", 58, () => pantograph(171, true)), part("後端收低的 Z 形集電弓", 57, () => pantograph(461, false)), part("高壓母線與黃色絕緣器", 54, () => {
      for (const x of [206, 225, 427]) {
        for (const z of [167, 171, 175]) disk(x, 77, z, 5, "xy", "#deb929", "#94701a", .7);
        line([[x, 77, 164], [x, 77, 180]], "#d6b338", 2);
      }
      line([[206, 77, 180], [427, 77, 180]], "#615947", 2.4);
      line([[206, 77, 181], [427, 77, 181]], "#c5b783", .85);
    })]],
    ["點亮 E500 的車頭", [part("擋風玻璃上方雙頭燈", 61, () => {
      brick(26, 30, 149, 12, 32, 15, "black");
      for (const y of [39, 53]) {
        disk(25.5, y, 156, 6.1, "yz", "#a4adb0", "#161f26", 1.3);
        disk(25, y, 156, 4.5, "yz", "#fff5d6", "#f6d898", .6);
        disk(24.7, y - 1, 157, 2.3, "yz", "#ffffff", "none", 0);
      }
    }), part("下方雙燈組與台鐵車頭標誌", 61, () => {
      for (const y of [12, 63]) {
        brick(-2, y - 3, 77, 3, 23, 14, "black");
        for (const [dy, color] of [[3, "#f5f6e8"], [13, "#c9322a"]]) {
          disk(-2.5, y + dy, 84, 5.1, "yz", "#8d989d", "#171f24", 1.2);
          disk(-3, y + dy, 84, 3.4, "yz", color, "#1a242c", .5);
          disk(-3.2, y + dy - .6, 85.2, 1.1, "yz", "#fff7db", "none", 0);
        }
      }
      polygon([[-.5, 38, 87], [-.5, 51, 87], [-.5, 55, 82], [-.5, 48, 82], [-.5, 52, 76], [-.5, 45, 76], [-.5, 41, 82], [-.5, 35, 78], [-.5, 31, 78], [-.5, 38, 84]], "#fff4dc", "none", 0);
    }), part("後駕駛室車號與踏階", 62, () => {
      text(520, -2, 91, "E501", 7.5);
      disk(533, -2, 99, 4.8, "xz", "none", "#313638", 1);
      line([[528, -2, 99], [538, -2, 99]], "#313638", 1);
      line([[533, -2, 94], [533, -2, 104]], "#313638", 1);
      for (const z of [57, 65, 73]) brick(496, -7, z, 16, 9, 3, "dark");
    })]],
    ["完成車鉤與排障器", [part("前端灰色排障板", 66, () => {
      polygon([[-16, -3, 18], [-16, 94, 18], [-4, 88, 33], [-4, 3, 33]], "#9aa5ac", "#3a454e", 1);
      polygon([[-16, -3, 18], [-16, 94, 18], [-16, 94, 22], [-16, -3, 22]], "#586770");
      line([[-15, -1, 23], [-4, 5, 32]], "#d5dbdd", .8);
      brick(-3, 1, 44, 10, 14, 15, "orange");
      brick(-3, 74, 44, 10, 14, 15, "orange");
    }), part("中央車鉤與制動軟管", 68, () => {
      brick(-6, 12, 46, 8, 66, 10, "black", true);
      brick(-17, 37, 31, 16, 22, 18, "dark", true);
      brick(-25, 41, 32, 10, 15, 14, "black");
      brick(-29, 39, 35, 6, 8, 10, "dark");
      for (const y of [18, 67]) {
        line([[-7, y, 47], [-11, y, 31], [-16, y + 3, 27], [-12, y + 8, 26]], "#121b23", 4);
        line([[-7.5, y - .7, 46], [-11.5, y - .7, 32], [-16.5, y + 2.3, 28]], "#5c6b76", 1.2);
        disk(-7.5, y, 48, 3.5, "yz", "#8d989e");
      }
    }), part("前駕駛室踏階與 E501 車號", 69, () => {
      for (const z of [56, 64, 72]) brick(66, -7, z, 16, 9, 3, "dark");
      text(40, -2, 81, "E501", 8);
      disk(50, -2, 95, 6.5, "xz", "none", "#28353a", 1.5);
      line([[43, -2, 95], [57, -2, 95]], "#28353a", 1.4);
      line([[50, -2, 88], [50, -2, 102]], "#28353a", 1.4);
      line([[45, -2, 91], [55, -2, 91]], "#28353a", 1.2);
      brick(1, -2, 51, 29, 5, 8, "orangeLight");
    })]],
  ];
  root.KidsBrickE500 = {
    id: "e500",
    title: "台鐵 E500 型電力機車",
    series: "臺灣火車系列",
    viewBox: "0 0 800 500",
    steps: steps.map(([title, parts], i) => ({ title, parts: parts.map((p, j) => ({ id: `p${i + 1}-${j + 1}`, ...p })) })),
  };
})(typeof window !== "undefined" ? window : globalThis);

