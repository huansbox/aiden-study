(function (root) {
  "use strict";

  const duration = 4200;
  const supports = (model) => model?.id === "e500";

  function render(model) {
    if (!supports(model)) return "";
    const parts = model.steps.flatMap((step) => step.parts)
      .slice().sort((a, b) => a.z - b.z);
    // Completed artwork always uses the default full-mask sprite, regardless
    // of the order in which the child placed pieces within a pack.
    const rails = parts.filter((part) => /^p1-[123]$/.test(part.id));
    const train = parts.filter((part) => !/^p1-[123]$/.test(part.id));
    const colors = ["#ee7751", "#f5c956", "#5aa4b3", "#7daa83"];
    const confetti = [
      [105, 121, -24, 28], [174, 72, 18, -20], [263, 54, -16, 30],
      [370, 69, 24, -24], [471, 45, -20, 24], [579, 62, 20, -28],
      [684, 103, 24, 30], [731, 160, -18, -20],
    ].map(([x, y, dx, angle], index) =>
      `<g transform="translate(${x} ${y})"><g class="brick-celebration__confetti" style="--drift:${dx}px;--turn:${angle}deg;--delay:${2200 + index * 55}ms" fill="${colors[index % colors.length]}"><rect x="-8" y="-5" width="16" height="10" rx="2"/><rect x="-5" y="-8" width="4" height="4" rx="1"/><rect x="1" y="-8" width="4" height="4" rx="1"/><path d="M-6-3H6" stroke="#fff" stroke-opacity=".45" stroke-width="1.5"/></g></g>`
    ).join("");

    return `<section class="brick-celebration" data-celebration style="--celebration-duration:${duration}ms" aria-label="E500 完成慶祝">
      <div class="brick-celebration__heading" role="status">
        <p class="brick-kicker">42 組積木，全部完成</p>
        <h2>E500，出發！</h2>
        <p class="brick-celebration__message">你拼好的火車，準備出發了。</p>
      </div>
      <div class="brick-celebration__scene">
        <svg class="brick-celebration__art" viewBox="0 0 800 500" width="800" height="500" aria-hidden="true" focusable="false">
          <g class="brick-celebration__rails">${rails.map((part) => part.svg).join("")}</g>
          <g class="brick-celebration__train">${train.map((part) => part.svg).join("")}</g>
          <g class="brick-celebration__sprinkles">${confetti}</g>
        </svg>
      </div>
      <button class="brick-celebration__skip" type="button" data-action="celebration-skip">略過動畫</button>
    </section>`;
  }

  root.KidsBrickCelebration = { duration, supports, render };
})(typeof window === "undefined" ? globalThis : window);
