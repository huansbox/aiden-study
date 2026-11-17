'use strict';

READING_PHRASES.push(...GIVING_READINGS);
const guide = document.getElementById('guide');
const map = document.getElementById('map');
const finish = document.getElementById('finish');
const saveStatus = document.getElementById('save-status');
let state = cleanState(null);
let storageOK = true;

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  state = saved === null
    ? migrateLegacy(JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY)))
    : cleanState(JSON.parse(saved));
} catch {
  storageOK = false;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageOK = true;
  } catch {
    storageOK = false;
  }
  showStorageStatus();
}

function showStorageStatus() {
  const message = storageOK ? '' : '這次無法儲存，離開前請先截圖。';
  saveStatus.textContent = message;
  saveStatus.hidden = !message;
  annotateReading(saveStatus);
}

function addNotes(list, notes) {
  for (const note of notes) {
    const item = document.createElement('li');
    item.textContent = note;
    list.append(item);
  }
}

function renderMap() {
  map.querySelectorAll('.branch').forEach(branch => branch.remove());
  const firstMissing = state.entries.indexOf(null);
  BRANCHES.forEach((branch, index) => {
    const notes = state.entries[index];
    const section = document.createElement('section');
    section.className = 'branch branch-' + (index + 1);
    const h3 = document.createElement('h3');
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.branch = index;
    button.textContent = (index + 1) + ' ' + branch.title;
    button.disabled = Boolean(state.draft) || (firstMissing >= 0 && index > firstMissing);
    if (!state.finished && index === state.step) {
      button.setAttribute('aria-current', 'step');
    }
    button.onclick = () => openBranch(index, state.finished);
    h3.append(button);
    section.append(h3);
    if (notes) {
      const list = document.createElement('ul');
      addNotes(list, notes);
      section.append(list);
    }
    map.append(section);
  });
  annotateReading(map);
  requestAnimationFrame(drawLines);
}

function drawLines() {
  const svg = map.querySelector('svg');
  const area = map.getBoundingClientRect();
  const bounds = element => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left - area.left, right: rect.right - area.left,
      top: rect.top - area.top, bottom: rect.bottom - area.top
    };
  };
  const xCenter = rect => (rect.left + rect.right) / 2;
  const center = bounds(map.querySelector('.center-node'));
  const x = xCenter(center);
  const y = (center.top + center.bottom) / 2;
  svg.setAttribute('viewBox', '0 0 ' + area.width + ' ' + area.height);
  svg.replaceChildren(...[...map.querySelectorAll('.branch')].map((branch, index) => {
    const heading = bounds(branch.querySelector('h3 button'));
    const upper = index === 0 || index === BRANCHES.length - 1;
    const labelX = xCenter(heading);
    const towardTitle = upper ? heading.bottom + 4 : heading.top - 4;
    const towardNotes = upper ? heading.top - 4 : heading.bottom + 4;
    let path = `M ${x} ${y} L ${labelX} ${towardTitle}`;

    const notes = [...branch.querySelectorAll('li')];
    if (notes.length && index === 2) {
      // 下方一枝保留原本的向下分叉，三句可各自換行。
      const fork = towardNotes + 6;
      const leaves = notes.map(bounds);
      const centers = leaves.map(xCenter);
      path += ` M ${labelX} ${towardNotes} V ${fork} M ${centers[0]} ${fork} H ${centers.at(-1)}`;
      leaves.forEach((leaf, i) => { path += ` M ${centers[i]} ${fork} V ${leaf.top - 3}`; });
    } else if (notes.length) {
      const left = index > 2;
      const section = bounds(branch);
      const stem = left ? section.right - 7 : section.left + 7;
      const leaves = notes.map(note => {
        const rect = bounds(note);
        const lineHeight = parseFloat(getComputedStyle(note).lineHeight);
        return {x: left ? rect.right + 4 : rect.left - 4, y: rect.top + lineHeight / 2};
      });
      path += ` M ${labelX} ${towardNotes} H ${stem} V ${upper ? leaves[0].y : leaves.at(-1).y}`;
      leaves.forEach(leaf => { path += ` M ${stem} ${leaf.y} H ${leaf.x}`; });
    }

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('d', path);
    line.setAttribute('stroke', getComputedStyle(branch).getPropertyValue('--branch-color'));
    return line;
  }));
}

function focusView() {
  const target = state.finished ? document.getElementById('map-title') : document.getElementById('question');
  target.focus({preventScroll: true});
  window.scrollTo(0, 0);
}

function openBranch(index, returnToMap = false) {
  if (state.draft) return;
  state = cleanState({...state, step: index, finished: false, returnToMap});
  persist();
  render();
  focusView();
}

function useNotes(notes) {
  const valid = saveNotes(BRANCHES[state.step], notes);
  if (!valid) return;
  state.entries[state.step] = valid;
  const last = state.step === BRANCHES.length - 1;
  state = cleanState({
    ...state, draft: null, step: state.step + 1, finished: state.returnToMap || last, returnToMap: false
  });
  persist();
  render();
  focusView();
}

function renderEditor(branch, panel) {
  const form = document.createElement('form');
  form.id = 'own-words';
  const fields = branch.prompts.map((prompt, index) => {
    const label = document.createElement('label');
    label.textContent = prompt;
    const field = document.createElement('textarea');
    field.rows = 2;
    field.maxLength = MAX_NOTE_LENGTH;
    field.required = true;
    field.value = state.draft.notes[index];
    label.append(field);
    form.append(label);
    return field;
  });
  const actions = document.createElement('div');
  actions.className = 'actions';
  actions.innerHTML = '<button type="button" id="cancel-edit">取消修改</button><button class="primary" type="submit">放進圖裡</button>';
  form.append(actions);
  const submit = actions.querySelector('[type=submit]');
  const updateSubmit = () => { submit.disabled = !saveNotes(branch, state.draft.notes); };
  form.oninput = () => {
    state.draft.notes = fields.map(field => field.value);
    persist();
    updateSubmit();
  };
  form.onsubmit = event => {
    event.preventDefault();
    useNotes(fields.map(field => field.value));
  };
  form.querySelector('#cancel-edit').onclick = () => {
    state.draft = null;
    persist();
    render();
    document.getElementById('rewrite').focus();
  };
  updateSubmit();
  panel.append(form);
}

function renderGuide() {
  const branch = BRANCHES[state.step];
  const current = state.entries[state.step];
  guide.innerHTML = '<p class="step">第 ' + (state.step + 1) + ' / ' + BRANCHES.length + ' 枝</p>' +
    '<h2 id="question" tabindex="-1"></h2>' +
    '<details class="hint"><summary>想不起來？看提示</summary><p></p></details>' +
    '<div id="note-panel"></div>';
  guide.querySelector('#question').textContent = branch.question;
  guide.querySelector('.hint p').textContent = branch.hint;
  const panel = guide.querySelector('#note-panel');
  if (state.draft) {
    renderEditor(branch, panel);
    return;
  }

  panel.innerHTML = '<p class="example-label"></p><ul class="example"></ul>' +
    '<div class="actions"><button type="button" id="rewrite">改成我的話</button>' +
    '<button type="button" id="use-notes" class="primary">用這組</button></div>' +
    '<div class="navigation"><button type="button" id="back"></button></div>';
  panel.querySelector('.example-label').textContent = current ? '你寫在圖上的話' : '先說說看，再參考例子';
  addNotes(panel.querySelector('.example'), current || branch.example);
  panel.querySelector('#use-notes').onclick = () => useNotes(current || branch.example);
  panel.querySelector('#rewrite').onclick = () => {
    state.draft = {step: state.step, notes: [...(current || branch.example)]};
    persist();
    render();
    guide.querySelector('textarea').focus();
  };
  const back = panel.querySelector('#back');
  back.hidden = !state.returnToMap && state.step === 0;
  back.textContent = state.returnToMap ? '回抄寫圖' : '上一枝';
  back.onclick = () => {
    if (state.returnToMap) {
      state = cleanState({...state, finished: true});
      persist();
      render();
      focusView();
      return;
    }
    openBranch(state.step - 1);
  };
}

function render() {
  document.body.classList.toggle('copy-mode', state.finished);
  finish.hidden = !state.finished;
  guide.hidden = state.finished;
  if (!state.finished) renderGuide();
  else guide.replaceChildren();
  renderMap();
  showStorageStatus();
  annotateReading(guide);
}

document.getElementById('map-title').tabIndex = -1;
document.getElementById('revise').onclick = () => openBranch(0, true);
document.getElementById('print').onclick = () => window.print();
new ResizeObserver(drawLines).observe(map);
document.fonts.load('700 22px ZihiReading').then(fonts => {
  if (!fonts.length) throw new Error('Font unavailable');
  document.getElementById('font-status').hidden = true;
  drawLines();
}).catch(() => {
  const status = document.getElementById('font-status');
  status.textContent = '注音字型未能載入，請連線後再重新整理。';
  annotateReading(status);
});
window.addEventListener('beforeprint', drawLines);
window.addEventListener('afterprint', drawLines);
annotateReading(document.querySelector('header'));
annotateReading(document.querySelector('main'));
render();
