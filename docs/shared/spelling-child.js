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
  el.className = "family-self-spelling";
  document.body.appendChild(el);
  let batch = family.task()?.batch ?? initialBatch,
    mode = family.task() ? "test" : "cards",
    index = 0,
    roundCount = 0,
    checked = false,
    roundDone = false;
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
        "這台装置無法播放語音，請先用看單字練習。";
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
    el.innerHTML = `<h2>英文</h2><div class="family-row" style="margin:20px 0"><label for="spell-batch">組別</label><select id="spell-batch" style="font:inherit;padding:10px">${Array.from({ length: Math.ceil(words.length / batchSize) }, (_, i) => `<option value="${i}" ${i === batch ? "selected" : ""}>第 ${i + 1} 組</option>`).join("")}</select></div><div><button id="spell-cards" aria-pressed="${mode === "cards"}">看單字</button><button id="spell-test" aria-pressed="${mode === "test"}">聽音拼字</button></div>${roundDone ? '<h2 style="margin:30px 0">這一輪完成</h2><button id="spell-again">再練一輪</button>' : `<p style="margin-top:22px">${roundCount + 1} / ${task && mode === "test" && batch === task.batch ? Math.max(1, family.remaining() + roundCount) : batchSize}</p>${mode === "cards" ? `<p style="font-size:48px;font-weight:900;margin:24px 0">${esc(word())}</p>` : ""}<button id="spell-listen">聽聲音</button>${mode === "test" ? '<form id="spell-form"><label for="spell-answer">拼出單字</label><input id="spell-answer" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" required><button id="spell-check" type="submit">檢查</button></form>' : ""}<p id="spell-feedback" role="status"></p><button id="spell-next" ${mode === "test" ? "hidden" : ""}>下一個 →</button>`}`;
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
      if (roundDone) family.finishRound();
    });
  }
  function restart() {
    index = 0;
    roundCount = 0;
    roundDone = false;
    render();
  }
  render();
};
