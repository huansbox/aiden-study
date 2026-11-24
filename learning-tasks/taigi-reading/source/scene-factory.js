function sisterScene(key, first) {
  const visuals = {
    room: { template: "scene-1" },
    agree: { focus: "props", prop: "agree", label: "姊姊想著剛才妹妹玩積木的模樣，覺得也是這樣。" },
    age: { focus: "props", prop: "age", label: "小妹旁邊有個插了三根蠟燭的生日蛋糕，她三歲了。" },
    eyes: { focus: "eyes", label: "小妹眼睛的特寫，兩隻眼睛又大又圓。" },
    smile: { focus: "portrait", label: "小妹露出甜甜的笑容，看起來很可愛。" },
    name: { focus: "props", prop: "name", label: "家人叫小妹阿 mē 仔。" },
    contrast: { template: "scene-2" },
  };
  const visual = visuals[key] || (key ? { template: key } : first ? visuals.room : visuals.contrast);
  const template = document.getElementById(visual.template || "scene-2");
  const frame = template.content.firstElementChild.cloneNode(true);
  if (visual.focus) {
    frame.dataset.focus = visual.focus;
    frame.setAttribute("aria-label", visual.label);
  }
  if (visual.prop) frame.append(document.getElementById(`prop-${visual.prop}`).content.cloneNode(true));
  return frame;
}
