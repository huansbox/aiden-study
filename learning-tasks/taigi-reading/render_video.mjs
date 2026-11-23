import { spawn, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

const width = 1920;
const height = 1080;
const fps = 24;
const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    paragraph: { type: "string" },
    start: { type: "string" },
    end: { type: "string" },
    jobs: { type: "string", default: "4" },
  },
});
if (positionals.length !== 2) {
  throw new Error("Usage: node render_video.mjs <private-root> <output.mp4> [--paragraph N] [--start seconds] [--end seconds]");
}

const privateRoot = resolve(positionals[0]);
const output = resolve(positionals[1]);
const recording = join(privateRoot, "source", "01_阮小妹.mp3");
const practicePage = join(privateRoot, "mock", "index.html");
const sourceDir = join(privateRoot, "source");
const playwrightModule = process.env.TAIGI_PLAYWRIGHT_MODULE;
const { chromium } = await import(playwrightModule ? pathToFileURL(resolve(playwrightModule)).href : "playwright");

function schoolAudioDuration() {
  const result = spawnSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", recording,
  ], { encoding: "utf8" });
  if (result.status !== 0) throw result.error ?? new Error(result.stderr);
  const duration = Number(result.stdout.trim());
  if (!(duration > 0)) throw new Error("The school recording has no valid duration.");
  return duration;
}

async function ffmpeg(args) {
  await new Promise((resolveRun, rejectRun) => {
    const process = spawn("ffmpeg", ["-v", "error", ...args], { stdio: ["ignore", "ignore", "inherit"] });
    process.on("error", rejectRun);
    process.on("exit", (code, signal) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`FFmpeg failed: ${code ?? signal}`));
    });
  });
}

function lineCues(line) {
  const groups = line.karaoke;
  if (!groups?.length || groups.map(({ text }) => text).join("") !== line.text ||
      groups.some(({ start, text }, index) => !text || !Number.isFinite(start) ||
        start < line.start || start >= line.end || (index > 0 && start <= groups[index - 1].start))) {
    throw new Error(`Missing or invalid karaoke groups at ${line.start}s`);
  }
  return groups;
}

const renderedHtml = await readFile(practicePage, "utf8");
const htmlData = renderedHtml.match(/<script id="mock-data" type="application\/json">([\s\S]+?)<\/script>/);
if (!htmlData) throw new Error("Practice page has no mock-data. Rebuild it first.");
const paragraphs = JSON.parse(htmlData[1]);
if (!options.paragraph && paragraphs.length !== 5) {
  throw new Error("Build all five paragraphs before rendering the full article.");
}
const allLines = [];

for (const [paragraphIndex, paragraph] of paragraphs.entries()) {
  if (options.paragraph && paragraphIndex + 1 !== Number(options.paragraph)) continue;
  const file = paragraphIndex === 0 ? "segments.json" : `paragraph-${paragraphIndex + 1}.json`;
  const manifest = JSON.parse(await readFile(join(sourceDir, file), "utf8"));
  if (manifest.length !== paragraph.lines.length) throw new Error(`Rebuild the page after changing ${file}.`);
  for (const [lineIndex, line] of manifest.entries()) {
    if (line.text !== paragraph.lines[lineIndex].text || !Number.isFinite(line.start) ||
        !Number.isFinite(line.end) || line.start < 0 || line.start >= line.end) {
      throw new Error(`Invalid or stale source at ${file} / ${lineIndex + 1}.`);
    }
    if (allLines.length && line.start < allLines[allLines.length - 1].end) {
      throw new Error(`Audio intervals overlap at ${file} / ${lineIndex + 1}.`);
    }
    allLines.push({ ...line, paragraphIndex, lineIndex, cues: lineCues(line) });
  }
}
if (!allLines.length) throw new Error("There is no matching paragraph to render.");

let intro = [];
if (!options.paragraph) {
  try {
    intro = JSON.parse(await readFile(join(sourceDir, "video-intro.json"), "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    intro = [{ start: 4.45, text: "阮小妹" }, { start: 7.761, text: "許阿派" }];
  }
}
const firstLine = allLines[0];
const lastLine = allLines[allLines.length - 1];
const start = Number(options.start ?? (intro.length ? Math.max(0, intro[0].start - 0.23) : firstLine.start));
const end = Number(options.end ?? lastLine.end);
const audioDuration = schoolAudioDuration();
if (!(0 <= start && start < end && end <= audioDuration)) {
  throw new Error(`Invalid film interval: ${start} to ${end} (audio: ${audioDuration})`);
}
if (options.paragraph && start < firstLine.start) {
  throw new Error(`The selected paragraph starts at ${firstLine.start}s.`);
}

const totalFrames = Math.ceil((end - start) * fps);
const frameAt = (time) => Math.round((time - start) * fps);
const jobs = Number(options.jobs);
if (!Number.isInteger(jobs) || jobs < 1 || jobs > 8) throw new Error("--jobs must be an integer between 1 and 8.");

const shots = allLines
  .map((line, index) => ({
    ...line,
    firstFrame: Math.max(0, frameAt(line.start)),
    finalFrame: Math.min(totalFrames, frameAt(allLines[index + 1]?.start ?? end)),
  }))
  .filter((shot) => shot.firstFrame < shot.finalFrame);
if (!shots.length && !intro.length) throw new Error("The selected interval contains no scenes.");
if (!shots.length || shots[0].firstFrame > 0) {
  shots.unshift({ intro, firstFrame: 0, finalFrame: shots[0]?.firstFrame ?? totalFrames });
}

const filmCSS = `
html, body {
  width: 100%; height: 100%; overflow: hidden;
  background: radial-gradient(ellipse at 50% 0%, #f8eee1, #e6cbb1);
}
body > main { width: 100%; max-width: none; height: 100%; padding: 0; }
body > main > :not(section), body > main audio,
section:not(:has(#stage)), section:has(#stage) > :not(#stage) { display: none !important; }
section:has(#stage) { margin: 0; border: 0; border-radius: 0; background: transparent; }
#stage {
  position: absolute; top: 1.7%; left: 10.5%; width: 79%; min-height: 0;
  background: transparent;
}
#stage .sister-scene {
  border-radius: 20px;
  box-shadow: 0 12px 32px #4e2f1b30;
}
#film-caption {
  position: absolute; left: 4%; right: 4%; bottom: 2.5%; margin: 0 auto;
  width: fit-content; max-width: 92%; padding: 8px 44px 12px;
  color: #fff2e1; background: #34251e;
  border: 2px solid #62452e; border-radius: 22px;
  text-align: center; font: 650 clamp(47px, 3.2vw, 63px)/1.24 "PingFang TC", "Noto Sans TC", "Sarasa Term TC Nerd Font", sans-serif;
  line-break: strict;
}
#film-caption .past { color: #ffd36d; }
#film-caption .current {
  color: #261b14; background: #ffd36d; border-radius: 7px;
  box-decoration-break: clone; -webkit-box-decoration-break: clone;
}
#film-intro {
  position: absolute; inset: 10% 15%; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 22px;
  color: #30241c; background: #fff5e8; border: 3px solid #d0aa81;
  border-radius: 44px; box-shadow: 0 18px 38px #4e2f1b20;
  font-family: "PingFang TC", "Noto Sans TC", "Sarasa Term TC Nerd Font", sans-serif;
}
#film-intro[hidden] { display: none; }
#film-intro-title, #film-intro-author { margin: 0; border-radius: 18px; }
#film-intro-title { font-size: 144px; font-weight: 700; padding: 4px 42px 10px; }
#film-intro-author { font-size: 61px; font-weight: 650; padding: 4px 28px 8px; }
#film-intro .current { background: #ffd36d; }
`;

async function preparePage(browser) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
  await page.goto(pathToFileURL(practicePage).href, { waitUntil: "load" });
  await page.addStyleTag({ content: filmCSS });
  await page.evaluate(async () => {
    const caption = document.createElement("div");
    caption.id = "film-caption";
    caption.hidden = true;
    const introCard = document.createElement("div");
    introCard.id = "film-intro";
    introCard.hidden = true;
    for (const id of ["film-intro-title", "film-intro-author"]) {
      const element = document.createElement("p");
      element.id = id;
      introCard.append(element);
    }
    document.body.append(caption, introCard);
    await document.fonts.ready;
  });
  return page;
}

async function setupShot(page, shot) {
  return await page.evaluate(({ intro, paragraphIndex, lineIndex, cues }) => {
    const caption = document.getElementById("film-caption");
    const introCard = document.getElementById("film-intro");
    const stage = document.getElementById("stage");
    introCard.hidden = !intro;
    stage.hidden = Boolean(intro);
    caption.hidden = Boolean(intro);
    if (intro) {
      document.getElementById("film-intro-title").textContent = intro[0]?.text ?? "阮小妹";
      document.getElementById("film-intro-author").textContent = intro[1]?.text ?? "許阿派";
      return 0;
    } else {
      selectParagraph(paragraphIndex);
      showLine(lineIndex);
      stage.classList.add("playing");
      caption.replaceChildren(...cues.map(({ text }) => {
        const word = document.createElement("span");
        word.textContent = text;
        return word;
      }));
      if (!stage.firstElementChild) throw new Error("The current sentence has no scene.");
      caption.style.fontSize = "";
      const largestCaption = document.documentElement.clientHeight * 0.975 - stage.getBoundingClientRect().bottom - 8;
      let fontSize = Number.parseFloat(getComputedStyle(caption).fontSize);
      while (caption.getBoundingClientRect().height > largestCaption && fontSize > 37) {
        fontSize -= 3;
        caption.style.fontSize = `${fontSize}px`;
      }
      if (caption.getBoundingClientRect().height > largestCaption) {
        throw new Error(`Subtitle exceeds its safe area at paragraph ${paragraphIndex + 1}, sentence ${lineIndex + 1}.`);
      }
      const animations = stage.getAnimations({ subtree: true });
      let animationDuration = 0;
      for (const animation of animations) {
        const { endTime, fill } = animation.effect.getComputedTiming();
        const holdsFinalState = fill === "forwards" || fill === "both";
        const motionLimit = holdsFinalState ? 3000 : 2300;
        const duration = Number.isFinite(endTime) ? Math.min(endTime, motionLimit) : 1750;
        animationDuration = Math.max(animationDuration, duration);
        animation.pause();
        animation.currentTime = 0;
      }
      return animationDuration;
    }
  }, shot);
}

function shotEvents(shot, animationDuration) {
  const events = new Set([shot.firstFrame]);
  if (shot.intro) {
    for (const { start: at } of shot.intro) events.add(frameAt(at));
  } else {
    const motionFrames = Math.ceil(animationDuration * fps / 1000);
    for (let delta = 1; delta <= motionFrames; delta++) events.add(shot.firstFrame + delta);
    for (const { start: at } of shot.cues) events.add(frameAt(at));
    events.add(frameAt(shot.end + 0.4));
  }
  return [...events].filter((frame) => frame >= shot.firstFrame && frame < shot.finalFrame).sort((a, b) => a - b);
}

async function captureShot(page, directory, shot) {
  const animationDuration = await setupShot(page, shot);
  const frames = shotEvents(shot, animationDuration);
  const captures = [];
  for (const frame of frames) {
    const state = {
      intro: Boolean(shot.intro),
      elapsedMs: Math.min(animationDuration, (frame - shot.firstFrame) * 1000 / fps),
      active: (shot.intro ?? shot.cues).reduce((index, cue, next) => frameAt(cue.start) <= frame ? next : index, -1),
      hideCaption: !shot.intro && frame >= frameAt(shot.end + 0.4),
    };
    await page.evaluate(({ intro, elapsedMs, active, hideCaption }) => {
      if (intro) {
        for (const [index, id] of ["film-intro-title", "film-intro-author"].entries()) {
          document.getElementById(id).classList.toggle("current", index === active);
        }
        return;
      }
      const caption = document.getElementById("film-caption");
      caption.hidden = hideCaption;
      for (const [index, token] of Array.from(caption.children).entries()) {
        token.className = index < active ? "past" : index === active ? "current" : "";
      }
      const stage = document.getElementById("stage");
      for (const animation of stage.getAnimations({ subtree: true })) animation.currentTime = elapsedMs;
    }, state);
    const name = `frame-${String(frame).padStart(6, "0")}.jpg`;
    await page.screenshot({ path: join(directory, name), type: "jpeg", quality: 91 });
    captures.push({ frame, name });
  }
  return captures;
}

await mkdir(dirname(output), { recursive: true });
const browserOptions = process.env.TAIGI_CHROME
  ? { executablePath: process.env.TAIGI_CHROME } : { channel: "chrome" };
const browser = await chromium.launch({ headless: true, ...browserOptions });
let directory;
try {
  directory = await mkdtemp(join(tmpdir(), "taigi-video-"));
  const captures = [];
  let nextShot = 0;
  await Promise.all(Array.from({ length: Math.min(jobs, shots.length) }, async () => {
    const page = await preparePage(browser);
    try {
      for (let index = nextShot++; index < shots.length; index = nextShot++) {
        captures.push(...await captureShot(page, directory, shots[index]));
        if ((index + 1) % 10 === 0 || index === shots.length - 1) {
          console.log(`Rendered shot ${index + 1}/${shots.length}`);
        }
      }
    } finally {
      await page.close();
    }
  }));
  captures.sort((a, b) => a.frame - b.frame);
  if (captures[0]?.frame !== 0) throw new Error("First frame was not rendered.");

  const concat = ["ffconcat version 1.0"];
  for (const [index, item] of captures.entries()) {
    const nextFrame = captures[index + 1]?.frame ?? totalFrames;
    concat.push(`file '${item.name}'`, `option framerate ${fps}`, `duration ${((nextFrame - item.frame) / fps).toFixed(9)}`);
  }
  concat.push(`file '${captures[captures.length - 1].name}'`, `option framerate ${fps}`);
  const list = join(directory, "timeline.ffconcat");
  await writeFile(list, concat.join("\n") + "\n");

  const temporaryVideo = join(dirname(output), `.${process.pid}-taigi.mp4`);
  try {
    const videoFilter = [
      `fps=${fps}`,
      "scale=in_color_matrix=bt601:out_color_matrix=bt709:in_range=full:out_range=tv",
      "format=yuv420p",
      "setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709",
    ].join(",");
    await ffmpeg([
      "-y", "-f", "concat", "-safe", "0", "-i", list,
      "-ss", String(start), "-i", recording, "-map", "0:v", "-map", "1:a",
      "-t", String(end - start), "-vf", videoFilter, "-c:v", "libx264",
      "-preset", "veryfast", "-crf", "17", "-c:a", "aac", "-b:a", "192k",
      "-movflags", "+faststart", temporaryVideo,
    ]);
    await rename(temporaryVideo, output);
  } finally {
    await rm(temporaryVideo, { force: true });
  }
  console.log(`Rendered ${shots.length} shots / ${captures.length} frames → ${output}`);
} finally {
  await browser.close();
  if (directory) await rm(directory, { recursive: true, force: true });
}
