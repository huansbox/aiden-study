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
    const file = new Blob([JSON.stringify({ version: 1, descriptor: art.descriptor, frames })], { type: 'application/json' });
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
