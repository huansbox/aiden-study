/* Native Camp uses the existing family identity, storage keys and sync protocol. */
(() => {
  const HEALTH = {
    ok: "Saved to your family",
    offline: "Offline. Your practice is saved on this device. Try Sync again when connected.",
    "no-token": "Ask a parent to connect this device from Home.",
    "auth-error": "Your family connection expired. Ask a parent to reconnect from Home.",
    "data-error": "Family progress could not be read. Your saved practice has not been replaced.",
    "schema-block": "This progress needs a newer app. Reload before practicing.",
    retry: "Family progress is still updating. Try Sync again.",
  };
  async function boot(lesson, onChange = () => {}) {
    const core = window.NativeCampCore, wiring = window.nativecampWiring;
    const family = window.KidsFamily, auth = window.KidsAuth;
    if (!core || !wiring || !family || !auth || !window.KidsSyncV1 || wiring.identityUnresolvable())
      throw Error("The page did not load completely. Please reload.");
    const requested = new URLSearchParams(location.search).get("child");
    const child = wiring.currentChild;
    if ((requested !== null && requested !== child) ||
        (!family.core.CHILDREN.includes(child) && !/^test-[a-z0-9-]{1,25}$/.test(child)))
      throw Error("Please choose your name from Home.");
    await auth.ready;
    if (auth.state.status === "required")
      throw Error("Ask a parent to connect this device from Home.");
    const activityContext = family.attach("nativecamp", child);
    if (!activityContext) throw Error("This activity could not be opened. Please reload.");
    await activityContext.ready;
    if (!activityContext.hasSettings())
      throw Error("Family settings could not be loaded. Go Home and try again.");
    if (!activityContext.profile().apps.includes("nativecamp"))
      throw Error("This activity is not open yet. Ask a parent to turn it on.");
    const key = wiring.store.progressKey(child);
    let progress, localError = "", sync;
    const raw = wiring.safeGet(key);
    try { progress = raw === null ? core.createProgress() : core.validateProgress(JSON.parse(raw)); }
    catch { throw Error("Saved practice could not be read. Ask a parent for help before continuing."); }
    const changed = () => onChange({ type: "status" });
    sync = wiring.initSync({
      validateData: core.validateProgress,
      onAdopt(data) {
        progress = core.validateProgress(data);
        if (wiring.safeGet(key) !== JSON.stringify(data))
          localError = "This device could not save the downloaded practice. Please ask a parent for help.";
        onChange({ type: "progress" });
      },
      onHealth: changed,
    });
    if (!sync) throw Error("Sync did not load. Please reload.");
    await sync.syncNow();
    wiring.attachPageshowGuard();
    activityContext.setActive(false);
    const audioURLs = new Map();
    window.addEventListener("pagehide", () => {
      for (const url of audioURLs.values()) URL.revokeObjectURL(url);
      audioURLs.clear();
    });
    window.addEventListener("kids:connection", changed);
    const syncNow = async () => {
      await auth.refresh();
      await sync.syncNow();
      await activityContext.flush();
      changed();
    };
    window.addEventListener("online", () => { syncNow().catch(changed); });
    return {
      homeHref: family.homeHref(child),
      getProgress: () => core.validateProgress(JSON.parse(JSON.stringify(progress))),
      saveProgress(data, activity) {
        if (auth.state.status === "required")
          throw Error("Ask a parent to reconnect from Home before continuing.");
        if (sync.meta().health === "schema-block" || localError)
          throw Error(localError || HEALTH["schema-block"]);
        const next = core.validateProgress(data), serialized = JSON.stringify(next);
        if (serialized === JSON.stringify(progress)) return;
        if (!wiring.safeSet(key, serialized))
          throw Error("This device could not save your practice. Please ask a parent for help.");
        progress = next;
        sync.markDirty();
        if (activity) activityContext.record(activity);
        changed();
      },
      syncNow,
      setActive: (value) => activityContext.setActive(value),
      status() {
        if (localError) return localError;
        if (auth.state.status === "required") return HEALTH["auth-error"];
        const meta = sync.meta();
        if (meta.dirty && meta.health === "ok") return "Saved on this device. Syncing with your family...";
        return HEALTH[meta.health] || "Connecting to your family...";
      },
      async privateAudio(id) {
        if (!/^[a-z0-9-]{1,80}$/.test(id)) throw Error("This recording is not available.");
        if (auth.state.status === "required")
          throw Error("Ask a parent to reconnect from Home, then try Listen again.");
        if (audioURLs.has(id)) return audioURLs.get(id);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        try {
          const response = await auth.fetch(`/v1/nativecamp-audio/${id}`, { signal: controller.signal });
          if (!response.ok || response.headers.get("Content-Type") !== "audio/mpeg")
            throw Error();
          const blob = await response.blob();
          if (blob.size < 4 || blob.size > 2097152) throw Error();
          const url = URL.createObjectURL(blob);
          audioURLs.set(id, url);
          return url;
        } catch {
          throw Error("This recording could not play. Check your family connection and try Listen again.");
        } finally { clearTimeout(timer); }
      },
    };
  }
  window.NativeCampPlatform = { boot };
})();
