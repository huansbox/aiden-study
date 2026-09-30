(function (root) {
  "use strict";

  const duration = 6000;
  const trainNames = { e500: "E500", emu3000: "EMU3000", r200: "R200", '700t': "700T", n700s: "N700S" };
  const supports = (model) => Object.hasOwn(trainNames, model?.id);

  function render(model, { audioEnabled = true } = {}) {
    if (!supports(model)) return "";
    const parts = model.steps.flatMap((step) => step.parts)
      .slice().sort((a, b) => a.z - b.z);
    // Completed artwork always uses the default full-mask sprite, regardless
    // of the order in which the child placed pieces within a pack.
    const rails = parts.filter((part) => /^p1-[123]$/.test(part.id));
    const train = parts.filter((part) => !/^p1-[123]$/.test(part.id));
    // The three 224-unit track sections repeat every 672 world units.
    // Repeat the complete assembly along its projected axis, never its image
    // bounding-box width (which also includes the track's diagonal width).
    const railArtwork = rails.map((part) => part.svg).join("");
    const extendedRails = [-1, 0, 1].map((repeat) =>
      `<g class="brick-celebration__rail-section" transform="translate(${repeat * 535.5} ${repeat * -138})">${railArtwork}</g>`
    ).join("");
    const colors = ["#ee7751", "#f5c956", "#5aa4b3", "#7daa83"];
    const confetti = [
      [105, 121, -24, 28], [174, 72, 18, -20], [263, 54, -16, 30],
      [370, 69, 24, -24], [471, 45, -20, 24], [579, 62, 20, -28],
      [684, 103, 24, 30], [731, 160, -18, -20],
    ].map(([x, y, dx, angle], index) =>
      `<g transform="translate(${x} ${y})"><g class="brick-celebration__confetti" style="--drift:${dx}px;--turn:${angle}deg;--delay:${2550 + index * 55}ms" fill="${colors[index % colors.length]}"><rect x="-8" y="-5" width="16" height="10" rx="2"/><rect x="-5" y="-8" width="4" height="4" rx="1"/><rect x="1" y="-8" width="4" height="4" rx="1"/><path d="M-6-3H6" stroke="#fff" stroke-opacity=".45" stroke-width="1.5"/></g></g>`
    ).join("");

    const name = trainNames[model.id];
    return `<section class="brick-celebration" data-celebration style="--celebration-duration:${duration}ms" aria-label="${name} 完成慶祝">
      <div class="brick-celebration__heading" role="status">
        <p class="brick-kicker">${parts.length} 組積木，全部完成</p>
        <h2>${name}，出發！</h2>
        <p class="brick-celebration__message">你完成的積木列車，出發了。</p>
      </div>
      <div class="brick-celebration__scene">
        <svg class="brick-celebration__art" viewBox="0 0 800 500" width="800" height="500" aria-hidden="true" focusable="false">
          <g class="brick-celebration__rails">${extendedRails}</g>
          <g class="brick-celebration__train">${train.map((part) => part.svg).join("")}</g>
          <g class="brick-celebration__sprinkles">${confetti}</g>
        </svg>
      </div>
      <div class="brick-celebration__actions">
        <button class="brick-celebration__sound" type="button" data-action="sound" aria-pressed="${audioEnabled}" aria-label="${audioEnabled ? "關閉" : "開啟"}拼裝音效">${audioEnabled ? "音效開" : "音效關"}</button>
        <button class="brick-celebration__skip" type="button" data-action="celebration-skip">略過動畫</button>
      </div>
    </section>`;
  }

  root.KidsBrickCelebration = { duration, supports, render };
})(typeof window === "undefined" ? globalThis : window);
