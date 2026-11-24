"use strict";
const byId = id => document.getElementById(id);
const reading = JSON.parse(byId("reading").textContent);
const assets = JSON.parse(byId("assets").textContent);
const groups = [{title: "題名與作者", lines: reading.intro}, ...reading.paragraphs];
const lines = groups.flatMap(group => group.lines);
const frame = byId("frame");
const ctx = frame.getContext("2d");
const player = byId("player");
const ownPlayer = byId("own-player");
const recordPanel = byId("record-panel");
const record = byId("record");
const recordStatus = byId("record-status");
const model = byId("model");
const own = byId("own");
const paragraphSelect = byId("paragraph");
const lineSelect = byId("line");
const statusText = byId("status");
const labels = {listen:"聽這一句", shadow:"跟著念這句", whole:"播放這一段", all:"從題名聽全篇", model:"聽學校", own:"聽我念"};
const imageCache = new Map();
const cacheSize = 10;
let chosen = 0, playback = null, capture = null, recordedUrl = "";
let paintKey = "", paintRequest = 0;

function imageFor(key) {
  if (imageCache.has(key)) {
    const recent = imageCache.get(key);
    imageCache.delete(key);
    imageCache.set(key, recent);
    return recent;
  }
  const image = new Image();
  const loaded = new Promise((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => { imageCache.delete(key); reject(Error("圖片讀取失敗")); };
  });
  image.src = assets[key];
  imageCache.set(key, loaded);
  if (imageCache.size > cacheSize) imageCache.delete(imageCache.keys().next().value);
  return loaded;
}

function lastAt(items, second, field) {
  let index = items.length - 1;
  while (index >= 0 && items[index][field] > second) index--;
  return index;
}

function screenAt(second, fixedLine) {
  const line = fixedLine || lines[Math.max(0, lastAt(lines, second, "captionAt"))];
  const scene = reading.shots[Math.max(0, lastAt(reading.shots, second, "at"))];
  const count = lastAt(line.karaoke, second, "start") + 1;
  const key = JSON.stringify([line.id, scene.key, count]);
  if (paintKey === key) return;
  paintKey = key;
  const request = ++paintRequest;
  Promise.all([imageFor("art/" + scene.key), imageFor("caption/" + line.id)])
    .then(([art, caption]) => {
      if (request !== paintRequest) return;
      ctx.drawImage(art, 0, 0, 1920, 1080);
      ctx.drawImage(caption, 0, 0, 1920, 180, 0, 858, 1920, 180);
      if (count) {
        const edge = line.edges[count - 1];
        // Restore the original art first so anti-aliased outline pixels blend only once.
        ctx.drawImage(art, 0, 858, edge, 180, 0, 858, edge, 180);
        ctx.drawImage(caption, 0, 180, edge, 180, 0, 858, edge, 180);
      }
      frame.setAttribute("aria-label", (line.visual ? line.visual + " " : "") + line.text);
    }).catch(() => {
      if (request === paintRequest) {
        paintKey = "";
        statusText.textContent = "漫畫讀取失敗，請重新開啟練習頁。";
      }
    });
}

function stop() {
  if (playback) {
    cancelAnimationFrame(playback.raf);
    clearTimeout(playback.timer);
    byId(playback.kind).textContent = labels[playback.kind];
  }
  playback = null;
  player.pause();
  ownPlayer.pause();
}

function followLine(line) {
  if (lines[chosen] === line) return;
  clearTake();
  refreshRecordControls();
  recordPanel.open = false;
  recordStatus.textContent = "";
  presentLine(lines.indexOf(line));
}

function finish(active) {
  if (playback !== active) return;
  stop();
  if (active.kind === "own" || active.kind === "model") {
    recordStatus.textContent = active.kind === "own" ? "可以重錄一次，或換下一句。" : "再按「聽我念」比較看看。";
    return;
  }
  if (!active.single) followLine(active.last);
  screenAt(active.end, active.last);
  statusText.textContent = active.kind === "all" ? "全篇聽完了，換你看著紙本念一次。" :
    active.kind === "whole" ? "這一段聽完了，換你看著紙本念一次。" : "可以再聽一次，或換下一句。";
}

function updatePlayback(active) {
  if (active !== playback) return;
  const t = player.currentTime;
  if (t >= active.end) return finish(active);
  screenAt(t, active.single ? active.last : undefined);
  if (!active.single) {
    const line = lines[Math.max(0, lastAt(lines, t, "captionAt"))];
    if (active.current !== line) {
      active.current = line;
      followLine(line);
      statusText.textContent = active.kind === "all" ? "正在播放全篇。" : "正在播放這一段。";
      const next = lines[lines.indexOf(line) + 1];
      if (next) {
        const shot = reading.shots[Math.max(0, lastAt(reading.shots, next.captionAt, "at"))];
        Promise.all([imageFor("art/" + shot.key), imageFor("caption/" + next.id)]).catch(() => {});
      }
    }
  }
}

async function togglePlay(kind) {
  const same = playback?.kind === kind;
  stop();
  if (same) { statusText.textContent = "已停止。"; return; }
  if (capture) { cancelCapture(); recordStatus.textContent = "已取消錄音。"; }
  const group = groups[paragraphSelect.selectedIndex];
  const first = kind === "all" ? lines[0] : kind === "whole" ? group.lines[0] : lines[chosen];
  const last = kind === "all" ? lines[lines.length-1] : kind === "whole" ? group.lines[group.lines.length-1] : first;
  const active = {kind, last, single:first === last,
    start:kind === "all" ? reading.start : first.start, end:kind === "all" ? reading.end : last.end};
  playback = active;
  byId(kind).textContent = "停止播放";
  statusText.textContent = kind === "shadow" ? "讓學校先念一兩個音，再跟著念。" : "";
  try {
    if (kind === "own") {
      ownPlayer.src = recordedUrl;
      await ownPlayer.play();
      return;
    }
    player.currentTime = active.start;
    screenAt(active.start, first);
    await player.play();
    if (playback !== active) return;
    const tick = () => {
      updatePlayback(active);
      if (playback === active) active.raf = requestAnimationFrame(tick);
    };
    const checkEnd = () => {
      updatePlayback(active);
      if (playback !== active) return;
      const remaining = active.end - player.currentTime;
      active.timer = setTimeout(checkEnd, Math.max(10, remaining * 1000));
    };
    tick();
    checkEnd();
  } catch {
    if (playback !== active) return;
    stop();
    (kind === "own" || kind === "model" ? recordStatus : statusText).textContent = "音檔播放失敗，請再試一次。";
  }
}

function selectLine(index) {
  stop();
  cancelCapture();
  clearTake();
  refreshRecordControls();
  recordPanel.open = false;
  recordStatus.textContent = statusText.textContent = "";
  presentLine(index);
  screenAt(lines[index].start - 0.001, lines[index]);
}

function presentLine(index) {
  chosen = index;
  const line = lines[index];
  const groupIndex = groups.findIndex(g => g.lines.includes(line));
  const group = groups[groupIndex];
  if (lineSelect.dataset.group !== String(groupIndex)) {
    lineSelect.replaceChildren(...group.lines.map((l, i) => new Option((i + 1) + "　" + l.text, l.id)));
    lineSelect.dataset.group = String(groupIndex);
  }
  paragraphSelect.selectedIndex = groupIndex;
  lineSelect.selectedIndex = group.lines.indexOf(line);
  byId("hint").textContent = line.hint || "";
  byId("hint-panel").hidden = !line.hint;
  byId("meaning").textContent = line.meaning || "";
  byId("meaning-panel").hidden = !line.meaning;
  byId("previous").disabled = index === 0;
  byId("next").disabled = index === lines.length - 1;
}
function refreshRecordControls() {
  record.disabled = capture?.finishing === true;
  record.textContent = capture?.recorder ? "錄好了" :
    capture ? "取消錄音" : recordedUrl ? "重錄一次" : "開始錄音";
  model.hidden = own.hidden = !recordedUrl || Boolean(capture);
}

function clearTake() {
  if (!recordedUrl) return;
  if (ownPlayer.getAttribute("src") === recordedUrl) {
    ownPlayer.removeAttribute("src");
    ownPlayer.load();
  }
  URL.revokeObjectURL(recordedUrl);
  recordedUrl = "";
}

function releaseStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

function cancelCapture() {
  if (!capture) return;
  const attempt = capture;
  capture = null;
  if (attempt.recorder && !attempt.finishing && attempt.recorder.state !== "inactive") {
    attempt.recorder.stop();
  }
  releaseStream(attempt.stream);
  refreshRecordControls();
}

async function startCapture() {
  stop();
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    recordStatus.textContent = "這個瀏覽器無法錄音。可以用 Chrome 開啟這個練習檔再試。";
    return;
  }
  const attempt = { stream: null, recorder: null, finishing: false };
  capture = attempt;
  recordStatus.textContent = "若瀏覽器詢問，請允許麥克風。";
  refreshRecordControls();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (capture !== attempt) {
      releaseStream(stream);
      return;
    }
    attempt.stream = stream;
    const recorder = new MediaRecorder(stream);
    attempt.recorder = recorder;
    const chunks = [];
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });
    recorder.addEventListener("stop", () => {
      releaseStream(stream);
      if (capture !== attempt) return;
      capture = null;
      if (chunks.length) {
        clearTake();
        const recorded = new Blob(chunks, { type: recorder.mimeType || chunks[0].type });
        recordedUrl = URL.createObjectURL(recorded);
        recordStatus.textContent = "錄好了。先聽學校，再聽我念。";
      } else {
        recordStatus.textContent = "這次沒有錄到聲音，可以再試一次。";
      }
      refreshRecordControls();
    });
    recorder.addEventListener("error", () => {
      if (capture !== attempt) return;
      cancelCapture();
      recordStatus.textContent = "錄音中斷，可以再試一次。";
    });
    recorder.start();
    recordStatus.textContent = "正在錄音。自己念完這一句，再按「錄好了」。";
    refreshRecordControls();
  } catch (error) {
    if (capture !== attempt) return;
    cancelCapture();
    recordStatus.textContent = error.name === "NotAllowedError" ?
      "麥克風未開放。可以從瀏覽器允許麥克風後再試。" : "無法開始錄音，請確認麥克風可用。";
  }
}

record.addEventListener("click", () => {
  if (!capture) {
    startCapture();
  } else if (!capture.recorder) {
    cancelCapture();
    recordStatus.textContent = "已取消錄音。";
  } else {
    capture.finishing = true;
    record.disabled = true;
    recordStatus.textContent = "錄音處理中。";
    capture.recorder.stop();
  }
});
recordPanel.addEventListener("toggle", () => {
  if (recordPanel.open) return;
  if (capture) {
    cancelCapture();
    recordStatus.textContent = "";
  }
  if (playback?.kind === "own" || playback?.kind === "model") stop();
});
window.addEventListener("pagehide", () => {
  stop();
  cancelCapture();
  clearTake();
  recordStatus.textContent = "";
  refreshRecordControls();
});
for (const kind of Object.keys(labels)) byId(kind).addEventListener("click", () => togglePlay(kind));
// Browsers and system media keys can send transport events without a button click.
for (const media of [player, ownPlayer]) {
  const ownsPlayback = () => playback && (playback.kind === "own") === (media === ownPlayer);
  media.addEventListener("play", () => {
    if (!ownsPlayback()) media.pause();
    else if (media === player && media.currentTime >= playback.end) finish(playback);
  });
  media.addEventListener("pause", () => {
    // A queued pause may arrive after another selection has started this same element.
    if (!media.paused || !ownsPlayback()) return;
    if (media.ended || (media === player && media.currentTime >= playback.end)) {
      finish(playback);
    } else {
      const target = media === ownPlayer || playback.kind === "model" ? recordStatus : statusText;
      stop();
      target.textContent = "已暫停。";
    }
  });
  media.addEventListener("ended", () => {
    if (ownsPlayback()) finish(playback);
  });
}
player.addEventListener("timeupdate", () => {
  if (playback && playback.kind !== "own" && !player.paused) updatePlayback(playback);
});
for (const [i, g] of groups.entries()) {
  paragraphSelect.add(new Option(i ? "第 " + i + " 段　" + g.title : g.title));
}
paragraphSelect.addEventListener("change", () => selectLine(lines.indexOf(groups[paragraphSelect.selectedIndex].lines[0])));
lineSelect.addEventListener("change", () => selectLine(lines.indexOf(groups[paragraphSelect.selectedIndex].lines[lineSelect.selectedIndex])));
byId("previous").addEventListener("click", () => selectLine(chosen - 1));
byId("next").addEventListener("click", () => selectLine(chosen + 1));
document.title = reading.title + "｜台語朗讀練習";
byId("title").textContent = reading.title;
byId("author").textContent = "作者　" + reading.author;
player.src = assets.audio;
selectLine(reading.intro.length);
