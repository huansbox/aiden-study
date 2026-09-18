/* Separate first-answer and oral ratings; never turn these into one score. */
(() => {
  const esc = (value) => String(value).replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  function readSummary(body, lesson, date) {
    if (!body || !Number.isInteger(body.rev) || body.rev < 0 || !("data" in body))
      throw Error("Invalid progress response");
    if (body.rev === 0 && body.data === null) return null;
    const progress = window.NativeCampCore.validateProgress(body.data);
    if (!progress.lessons[lesson.id]) return null;
    return window.NativeCampCore.summarizeLesson(progress, lesson, date);
  }
  function summaryHTML(summary, lesson) {
    if (!summary) return "<p>No practice has been saved for this lesson yet.</p>";
    return `<h3>${esc(lesson.date)} · ${esc(lesson.title)}</h3><p>Done means the first practice round is complete. It does not mean permanent mastery.</p>` +
      ["try", "say"].map((mode) => {
        const result = summary[mode];
        const labels = mode === "try" ? ["Independent", "With help", "Incorrect"] : ["Got it", "With help", "Not yet"];
        const keys = mode === "try" ? ["independent", "helped", "incorrect"] : ["gotIt", "withHelp", "notYet"];
        const needsPractice = result.concepts.filter((concept) => concept.needsPractice);
        return `<h4>${mode === "try" ? "Try it" : "Say it"} · ${result.done ? "Done" : "In progress"}</h4><p>More practice: ${needsPractice.length ? needsPractice.map((concept) => esc(concept.title)).join(", ") : "No difficulty recorded yet"}.</p><div style="overflow-x:auto"><table><thead><tr><th>Concept</th><th>First answers</th>${labels.map((label) => `<th>${label}</th>`).join("")}<th>Past reviews</th></tr></thead><tbody>${result.concepts.map((concept) => `<tr><th>${esc(concept.title)}</th><td>${concept.attempted}</td>${keys.map((key) => `<td>${concept[key]}</td>`).join("")}<td>${concept.reviews}</td></tr>`).join("")}</tbody></table></div>`;
      }).join("") + "<p>Only submitted first answers are counted above. Corrections and later reviews do not change them. More practice also includes difficulty recorded in Weekly Review; Done means the practice amount is complete.</p>";
  }
  let requestId = 0;
  const lastRead = new Map();
  function mount(root, child) {
    const catalogAPI = window.NativeCampCatalog;
    let catalog = [], selectedId = new URLSearchParams(location.search).get("lesson"), sequence = 0;
    const heading = (progress) => `<h2>Native Camp Review</h2>${catalogAPI.navigation(catalog, selectedId, { child, progress, date: window.KidsFamilyCore.dateKey(), buttons: true })}${selectedId && catalog.some((entry) => entry.id === selectedId) ? `<a class="button" href="${esc(catalogAPI.href("../nativecamp/preview.html", child, selectedId))}">Preview questions</a>` : ""}`;
    let panel = document.getElementById("nativecamp-summary");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "nativecamp-summary";
      panel.className = "family-panel family-stack";
      root.appendChild(panel);
    }
    panel.lang = "en";
    panel.innerHTML = heading() + '<p role="status">Loading saved practice...</p>';
    const current = ++requestId;
    const refresh = async (lessonId) => {
      if (typeof lessonId === "string") selectedId = lessonId;
      const reading = ++sequence;
      const currentPanel = document.getElementById("nativecamp-summary");
      if (current !== requestId || !currentPanel) return;
      currentPanel.innerHTML = heading() + '<p role="status">Loading saved practice...</p>';
      try {
        const [body, nextCatalog] = await Promise.all([
          window.KidsFamily.request(`/v1/progress/${child}/nativecamp`),
          catalog.length ? catalog : catalogAPI.readCatalog({ base: "../nativecamp" }),
        ]);
        if (reading !== sequence || current !== requestId || document.getElementById("nativecamp-summary") !== currentPanel) return;
        catalog = nextCatalog;
        const selected = catalogAPI.select(catalog, selectedId === null ? "" : `?lesson=${encodeURIComponent(selectedId)}`);
        selectedId = selected.id;
        const lesson = await catalogAPI.readLesson(selected, { base: "../nativecamp" });
        const summary = readSummary(body, lesson, window.KidsFamilyCore.dateKey());
        if (reading !== sequence || current !== requestId || document.getElementById("nativecamp-summary") !== currentPanel) return;
        const previous = lastRead.get(child);
        if (previous && body.rev < previous.rev && (body.rev === 0 || previous.epoch === body.epoch))
          throw Error("Family storage is still updating");
        lastRead.set(child, { rev: body.rev, epoch: body.epoch });
        currentPanel.innerHTML = `${heading(body.data)}${summaryHTML(summary, lesson)}<p class="muted">Read from family storage just now. Practice that has not synced from another device is not shown.</p><button type="button" data-nativecamp-refresh>Refresh practice</button>`;
      } catch {
        if (reading !== sequence || current !== requestId || document.getElementById("nativecamp-summary") !== currentPanel) return;
        currentPanel.innerHTML = heading() + '<p role="status">Saved practice could not be loaded. Check your family connection and try again. No results are shown.</p><button type="button" data-nativecamp-refresh>Try again</button>';
      }
      currentPanel.querySelector("[data-nativecamp-refresh]").onclick = () => refresh();
      currentPanel.querySelectorAll("[data-lesson]").forEach((button) => {
        button.onclick = () => {
          const url = new URL(location.href);
          url.searchParams.set("lesson", button.dataset.lesson);
          url.searchParams.set("child", child);
          history.replaceState(null, "", url);
          return refresh(button.dataset.lesson);
        };
      });
    };
    refresh();
  }
  window.NativeCampParent = { mount, readSummary, summaryHTML };
})();
