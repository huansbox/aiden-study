window.KidsSpellingChild = ({
  family,
  words,
  batchSize,
  onAnswer,
  onView,
  initialBatch = 0,
}) => {
  document.body.classList.add("spelling-child");
  const el = document.createElement("main");
  el.className = "family-self-spelling child-card";
  document.body.appendChild(el);
  let batch = family.task()?.batch ?? initialBatch,
    mode = family.task() ? "test" : "cards",
    index = 0,
    roundCount = 0,
    checked = false,
    roundDone = false;
  let collectionRound;
  const task = family.task();
  const word = () => words[batch * batchSize + index];
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  function speak() {
    if (!window.speechSynthesis) {
      document.getElementById("spell-feedback").textContent =
        "這台裝置無法播放語音，請先用看單字練習。";
      return;
    }
    speechSynthesis.cancel();
    const voice = new SpeechSynthesisUtterance(word());
    voice.lang = "en-US";
    voice.rate = 0.8;
    voice.onerror = (e) => {
      if (e.error !== "interrupted" && e.error !== "canceled")
        document.getElementById("spell-feedback").textContent =
          "聲音沒有播放，請再按一次。";
    };
    speechSynthesis.speak(voice);
  }
  function render() {
    family.setActive(!roundDone);
    checked = false;
    const roundTotal = task && mode === "test" && batch === task.batch
      ? Math.max(1, family.remaining() + roundCount)
      : batchSize;
    const options = Array.from({ length: Math.ceil(words.length / batchSize) }, (_, i) =>
      `<option value="${i}" ${i === batch ? "selected" : ""}>第 ${i + 1} 組</option>`).join("");
    el.innerHTML = `
      <h1 class="child-heading">英文拼字</h1>
      <div class="spell-toolbar">
        <div><label for="spell-batch">組別</label><select id="spell-batch">${options}</select></div>
        <div class="child-actions" role="group" aria-label="練習方式">
          <button id="spell-cards" class="child-action" aria-pressed="${mode === "cards"}">看單字</button>
          <button id="spell-test" class="child-action" aria-pressed="${mode === "test"}">聽音拼字</button>
        </div>
      </div>
      ${roundDone ? `
        <section class="child-summary">
          <h2 class="child-heading">這一輪完成</h2>
          <p>第 ${batch + 1} 組，完成 ${roundCount} 次練習。</p>
          <button id="spell-again" class="child-action primary">再練一輪</button>
        </section>` : `
        <div class="child-progress">
          第 ${roundCount + 1} / ${roundTotal} 個單字
          <progress class="child-progress-meter" max="${roundTotal}" value="${roundCount}" aria-label="這一輪的練習進度"></progress>
        </div>
        ${mode === "cards" ? `<p class="spell-word" lang="en">${esc(word())}</p>` : ""}
        <div class="spell-controls">
          <div><button id="spell-listen" class="child-action ${mode === "cards" ? "primary" : ""}">聽聲音</button></div>
          ${mode === "test" ? `<form id="spell-form">
            <label for="spell-answer">拼出單字</label>
            <input id="spell-answer" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" required>
            <button id="spell-check" class="child-action primary" type="submit">檢查</button>
          </form>` : ""}
          <p id="spell-feedback" role="status"></p>
          <div><button id="spell-next" class="child-action primary" ${mode === "test" ? "hidden" : ""}>下一個 →</button></div>
        </div>`}
    `;
    document.getElementById("spell-batch").onchange = (e) => {
      batch = Number(e.target.value);
      restart();
    };
    document.getElementById("spell-cards").onclick = () => {
      mode = "cards";
      restart();
    };
    document.getElementById("spell-test").onclick = () => {
      mode = "test";
      restart();
    };
    document.getElementById("spell-again")?.addEventListener("click", restart);
    document.getElementById("spell-listen")?.addEventListener("click", speak);
    document.getElementById("spell-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      if (checked) return;
      const input = document.getElementById("spell-answer");
      if (!input.value.trim()) return;
      checked = true;
      const correct =
        input.value.trim().toLocaleLowerCase().replace(/\s+/g, " ") ===
        word().toLocaleLowerCase();
      family.record({ batch, answered: true, correct });
      onAnswer(word(), correct, batch);
      family.setActive(false);
      input.disabled = true;
      document.getElementById("spell-check").disabled = true;
      document.getElementById("spell-feedback").textContent = correct
        ? "答對了"
        : "答案是 " + word();
      document.getElementById("spell-next").hidden = false;
    });
    document.getElementById("spell-next")?.addEventListener("click", () => {
      if (mode === "cards") {
        family.record({ batch, answered: false });
        onView(word());
      }
      roundCount++;
      roundDone =
        mode === "test" && task && batch === task.batch
          ? family.remaining() === 0
          : roundCount >= batchSize;
      index =
        (index + 1) % Math.min(batchSize, words.length - batch * batchSize);
      render();
      if (roundDone) family.finishRound(collectionRound);
    });
  }
  function restart() {
    collectionRound = { roundId: crypto.randomUUID(), entryId: "spelling" };
    family.beginRound?.(collectionRound);
    index = 0;
    roundCount = 0;
    roundDone = false;
    render();
  }
  restart();
};
