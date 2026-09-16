(() => {
  const F = window.KidsFamily;
  if (!F) return;
  F.maintenance = new URLSearchParams(location.search).get("parent") === "1";
  F.mount = (app, child) => {
    if (!child || F.maintenance) return null;
    const context = F.attach(app, child);
    if (!context) return null;
    document.body.classList.add("family-child");
    if (app === "spelling") document.body.classList.add("spelling-child");
    const bar = document.createElement("nav");
    bar.className = "family-appbar";
    bar.setAttribute("aria-label", "學習導覽");
    const home = document.createElement("a");
    home.href = F.homeHref(child);
    home.textContent = "← 首頁";
    const hint = document.createElement("span");
    hint.className = "family-task-hint";
    bar.append(home, hint);
    document.body.prepend(bar);
    const update = () => {
      const task = context.task();
      hint.textContent = task
        ? `${Math.min(context.summary().tasks[task.occurrence] || 0, task.quantity)} / ${task.quantity}`
        : "";
    };
    context.allowed = () =>
      (!window.KidsAuth || context.hasSettings()) &&
      context.profile().apps.includes(app);
    context.block = () => {
      document
        .querySelectorAll("body > :not(.family-appbar):not(script)")
        .forEach((el) => (el.hidden = true));
      hint.textContent = "這項活動目前未開放";
    };
    context.ready.then(() => {
      const auth = window.KidsAuth;
      if (
        auth &&
        (auth.state.status === "required" || !context.hasSettings())
      ) {
        context.block();
        location.replace(F.homeHref(child));
        return;
      }
      const img = document.createElement("img");
      img.src = F.avatar(
        F.core.CHILDREN.includes(child)
          ? child
          : app === "zhuyin"
            ? "bingpu"
            : "aiden",
        context.profile().avatar,
      );
      img.alt = "";
      home.prepend(img);
      update();
    });
    window.addEventListener("kids:activity", update);
    window.addEventListener("kids:connection", () => {
      if (window.KidsAuth?.state.status === "required")
        F.notifyError(
          "家庭連線已失效，請回首頁讓家長重新連接。練習紀錄仍保留在這裡。",
        );
    });
    return context;
  };
})();
