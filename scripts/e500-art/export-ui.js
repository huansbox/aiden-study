// Authoring-only download: browser rendering stays inside the visible preview.
// Feed this JSON to export-sprites.mjs --bundle=<downloaded file>.
const button = document.querySelector('#export-bundle');
button.disabled = false;
button.addEventListener('click', async () => {
  button.disabled = true;
  const art = window.trainArt;
  const total = art.descriptor.steps.length * 3;
  const frames = {};
  const render = async (indices, occludeWith = []) => {
    const key = JSON.stringify([indices, occludeWith]);
    frames[key] = art.renderSelection(indices, { occludeWith });
    await new Promise(resolve => requestAnimationFrame(resolve));
  };
  try {
    await render(Array.from({ length: total }, (_, i) => i));
    for (let i = 0; i < total; i++) {
      button.textContent = `正在匯出第 ${i + 1} / ${total} 組…`;
      const start = i - i % 3;
      for (let mask = 0; mask < 1 << (i % 3); mask++) {
        const before = Array.from({ length: start }, (_, j) => j);
        for (let bit = 0; bit < i % 3; bit++) if (mask & (1 << bit)) before.push(start + bit);
        await render([i], before);
      }
    }
    for (const siblings of [[2], [2, 0], [2, 0, 1]])
      await render([...Array.from({ length: 24 }, (_, i) => i), ...siblings.map(i => 24 + i)]);
    const poses={},rig=art.poseDefinition;
    if(rig){
      poses[rig.bundleKey]=[];
      const values=rig.values||rig.angles,parameter=rig.values?'value':'angle';
      for(const [index,value] of values.entries()){
        button.textContent=`正在匯出${rig.name}姿勢 ${index+1} / ${values.length}…`;
        poses[rig.bundleKey].push({[parameter]:value,png:art.renderMechanismPose(value)});
        await new Promise(resolve=>requestAnimationFrame(resolve));
      }
    }
    const mechanismArt={};
    for(const [index,id]of art.mechanismArt.entries()){
      button.textContent=`正在匯出完整機構分件 ${index+1} / ${art.mechanismArt.length}…`;
      const parts=art.descriptor.steps.flatMap(step=>step.parts),partIndex=parts.findIndex(part=>part.id===id);
      if(partIndex<0)throw Error('找不到機構分件：'+id);
      const rig=art.mechanismArtRigs.find(group=>group.includes(id));
      const occluderIds=Object.hasOwn(art.mechanismArtOccluders,id)?art.mechanismArtOccluders[id]:rig?rig.slice(0,rig.indexOf(id)):[];
      const occludeWith=occluderIds.map(peer=>parts.findIndex(part=>part.id===peer));
      mechanismArt[id]=art.renderSelection([partIndex],{occludeWith});
      await new Promise(resolve=>requestAnimationFrame(resolve));
    }
    const file = new Blob([JSON.stringify({ version: 1, descriptor: art.descriptor, frames, ...poses,...(Object.keys(mechanismArt).length?{mechanismArt}:{}) })], { type: 'application/json' });
    const url = URL.createObjectURL(file), link = document.createElement('a');
    link.href = url; link.download = art.descriptor.id + '-render-bundle.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    button.textContent = '素材已匯出；再次下載';
  } catch (error) {
    button.textContent = '匯出失敗，重試';
    console.error(error);
  } finally {
    button.disabled = false;
  }
});
