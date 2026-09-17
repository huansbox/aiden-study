/* Separate first-answer and oral ratings; never turn these into one score. */
(() => {
  const esc = (value) => String(value).replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  function readSummary(body, lesson, date) {
    if (!body || !Number.isInteger(body.rev) || body.rev < 0 || !("data" in body))
      throw Error("Invalid progress response");
    if (body.rev === 0 && body.data === null) return null;
    const progress = window.NativeCampCore.validateProgress(body.data);
    return window.NativeCampCore.summarizeLesson(progress, lesson, date);
  }
  function summaryHTML(summary, lesson) {
    if (!summary) return "<p>No practice has been saved for this child yet.</p>";
    return `<h3>${esc(lesson.date)} · ${esc(lesson.title)}</h3><p>Done means the first practice round is complete. It does not mean permanent mastery.</p>` +
      ["try", "say"].map((mode) => {
        const result = summary[mode];
        const labels = mode === "try" ? ["Independent", "With help", "Incorrect"] : ["Got it", "With help", "Not yet"];
        const keys = mode === "try" ? ["independent", "helped", "incorrect"] : ["gotIt", "withHelp", "notYet"];
        return `<h4>${mode === "try" ? "Try it" : "Say it"} · ${result.done ? "Done" : "In progress"}</h4><div style="overflow-x:auto"><table><thead><tr><th>Concept</th><th>First answers</th>${labels.map((label) => `<th>${label}</th>`).join("")}<th>Review</th></tr></thead><tbody>${result.concepts.map((concept) => `<tr><th>${esc(concept.title)}</th><td>${concept.attempted}</td>${keys.map((key) => `<td>${concept[key]}</td>`).join("")}<td>${concept.due ? "Ready today" : "—"}</td></tr>`).join("")}</tbody></table></div>`;
      }).join("") + "<p>Only submitted first answers are counted above. Corrections and later reviews do not change them.</p>";
  }
  let requestId = 0;
  const lastRead = new Map();
  function mount(root, child) {
    let panel = document.getElementById("nativecamp-summary");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "nativecamp-summary";
      panel.className = "family-panel family-stack";
      root.appendChild(panel);
    }
    panel.lang = "en";
    panel.innerHTML = '<h2>Native Camp Review</h2><p role="status">Loading saved practice...</p>';
    const current = ++requestId;
    const refresh = async () => {
      const currentPanel = document.getElementById("nativecamp-summary");
      if (current !== requestId || !currentPanel) return;
      currentPanel.innerHTML = '<h2>Native Camp Review</h2><p role="status">Loading saved practice...</p>';
      try {
        const [body, response] = await Promise.all([
          window.KidsFamily.request(`/v1/progress/${child}/nativecamp`),
          fetch("../nativecamp/lessons/2026-09-15.json", { cache: "no-store" }),
        ]);
        if (!response.ok) throw Error();
        const lesson = await response.json();
        const summary = readSummary(body, lesson, window.KidsFamilyCore.dateKey());
        if (current !== requestId || document.getElementById("nativecamp-summary") !== currentPanel) return;
        const previous = lastRead.get(child);
        if (previous && body.rev < previous.rev && (body.rev === 0 || previous.epoch === body.epoch))
          throw Error("Family storage is still updating");
        lastRead.set(child, { rev: body.rev, epoch: body.epoch });
        currentPanel.innerHTML = `<h2>Native Camp Review</h2>${summaryHTML(summary, lesson)}<p class="muted">Read from family storage just now. Practice that has not synced from another device is not shown.</p><button type="button">Refresh practice</button>`;
      } catch {
        if (current !== requestId || document.getElementById("nativecamp-summary") !== currentPanel) return;
        currentPanel.innerHTML = '<h2>Native Camp Review</h2><p role="status">Saved practice could not be loaded. Check your family connection and try again. No results are shown.</p><button type="button">Try again</button>';
      }
      currentPanel.querySelector("button").onclick = refresh;
    };
    refresh();
  }
  window.NativeCampParent = { mount, readSummary, summaryHTML };
})();
