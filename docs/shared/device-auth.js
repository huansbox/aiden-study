/* 家長首次連接；憑證由瀏覽器的 HttpOnly Cookie 保存，JavaScript 不讀寫。 */
(() => {
  const endpoint = new URL("../api", document.currentScript.src).href.replace(
    /\/$/,
    "",
  );
  let storage;
  try {
    storage = localStorage;
  } catch {}
  const url = new URL(location.href);
  let legacy = url.searchParams.get("k");
  try {
    legacy ||= storage?.getItem("kids_sync_token");
  } catch {}
  // 舊圖示仍可啟動；不再讓金鑰留在目前頁面的網址或傳到其他頁。
  if (url.searchParams.has("k")) {
    url.searchParams.delete("k");
    history.replaceState(history.state, "", url);
  }
  let state = { status: "checking", message: "正在連接家庭⋯" };
  let checking = null;
  const emit = (next) => {
    state = next;
    window.dispatchEvent(new CustomEvent("kids:connection"));
    return state;
  };
  const failure = (error) =>
    emit({
      status:
        error.status === 401 ? "required" : error.status ? "error" : "offline",
      message: error.message,
    });
  async function raw(path, init = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(endpoint + path, {
        ...init,
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = Error(
          response.status === 401
            ? body.error || "需要重新連接家庭"
            : "連線服務暫時無法使用，請稍後重試。",
        );
        error.status = response.status;
        throw error;
      }
      if (typeof body.authenticated !== "boolean") {
        const error = Error("連線服務尚未就緒，請稍後重試。");
        error.status = 502;
        throw error;
      }
      return body;
    } catch (error) {
      if (error.status) throw error;
      throw Error("目前連不上家庭，請確認網路後重試。");
    } finally {
      clearTimeout(timeout);
    }
  }
  function forgetLegacy() {
    legacy = null;
    try {
      storage?.removeItem("kids_sync_token");
    } catch {}
  }
  async function connect(key) {
    if (!key?.trim()) throw Error("請輸入家庭金鑰。");
    try {
      await raw("/v1/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      });
      // POST 200 不代表瀏覽器接受 Cookie；讀回成功才清掉舊金鑰。
      let result;
      try {
        result = await raw("/v1/session");
      } catch (error) {
        if (error.status === 401)
          error.message =
            "尚未確認連線，請按重試連線；若持續失敗，請允許此網站使用 Cookie。";
        throw error;
      }
      if (!result.authenticated) throw Error("這個瀏覽器未能記住連線。");
      forgetLegacy();
      emit({
        status: "connected",
        message: "已連接家庭",
        expiresAt: result.expiresAt,
      });
      return state;
    } catch (error) {
      failure(error);
      throw error;
    }
  }
  function refresh() {
    if (checking) return checking;
    checking = (async () => {
      try {
        const result = await raw("/v1/session");
        if (!result.authenticated) {
          const e = Error("請家長連接家庭");
          e.status = 401;
          throw e;
        }
        forgetLegacy();
        return emit({
          status: "connected",
          message: "已連接家庭",
          expiresAt: result.expiresAt,
        });
      } catch (error) {
        if (error.status === 401 && legacy) {
          try {
            return await connect(legacy);
          } catch (e) {
            return state;
          }
        }
        return failure(error);
      }
    })().finally(() => {
      checking = null;
    });
    return checking;
  }
  async function authenticatedFetch(path, init = {}) {
    await api.ready;
    const target = new URL(path.startsWith("/v1/") ? endpoint + path : path);
    if (!target.href.startsWith(endpoint + "/v1/"))
      throw Error("不支援的家庭服務位址");
    const response = await fetch(target.href, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
    });
    if (response.status === 401)
      emit({ status: "required", message: "家庭連線已失效，請家長重新連接。" });
    else if (response.ok && state.status !== "connected")
      emit({ status: "connected", message: "已連接家庭" });
    return response;
  }
  function renderConnection(root, done) {
    root.innerHTML = `<section class="family-panel family-connect"><h1>請家長連接家庭</h1><p>這個入口連接一次後，就會記住。</p><form id="connect-family"><label class="family-field">家庭金鑰<input type="password" name="key" autocomplete="off" required maxlength="256"></label><button class="primary" type="submit">連接家庭</button></form><p role="status" id="connect-status"></p><button type="button" id="connect-retry">重試連線</button></section>`;
    const form = root.querySelector("#connect-family"),
      status = root.querySelector("#connect-status"),
      retry = root.querySelector("#connect-retry");
    status.textContent = ["需要連接家庭", "請家長連接家庭"].includes(
      state.message,
    )
      ? ""
      : state.message;
    async function run(action) {
      const buttons = root.querySelectorAll("button,input");
      buttons.forEach((el) => (el.disabled = true));
      status.textContent = "連接中⋯";
      try {
        await action();
        if (state.status === "connected") {
          form.elements.key.value = "";
          await done();
        } else status.textContent = state.message;
      } catch (e) {
        status.textContent = e.message;
      } finally {
        buttons.forEach((el) => (el.disabled = false));
      }
    }
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      run(() => connect(form.elements.key.value));
    });
    retry.addEventListener("click", () => run(refresh));
  }
  async function disconnect() {
    await raw("/v1/session/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    forgetLegacy();
    emit({ status: "required", message: "已中斷這個入口的家庭連線。" });
  }
  const api = (window.KidsAuth = {
    endpoint,
    connect,
    refresh,
    disconnect,
    fetch: authenticatedFetch,
    renderConnection,
    get state() {
      return state;
    },
    canAttempt: () =>
      state.status !== "required" && state.status !== "checking",
  });
  api.ready = refresh();
})();
