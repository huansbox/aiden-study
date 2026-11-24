// All animations use the same school-audio clock, including a seek or a paused replay.
(() => {
  const stage = document.getElementById("stage");
  let currentId, animations = [];
  window.taigiSceneAt = (second, line) => {
    if (line.id !== currentId) {
      currentId = line.id;
      stage.replaceChildren(sisterScene(line.visual || "smile", false));
      animations = stage.getAnimations({subtree: true});
      for (const animation of animations) animation.pause();
    }
    const elapsed = Math.max(0, (second - line.start) * 1000);
    for (const animation of animations) animation.currentTime = elapsed;
  };
})();
