(() => {
  'use strict';
  const KEY = 'aiden-parent-exam2-guide-v1';
  const checks = [...document.querySelectorAll('[data-check]')];
  const ids = new Set(checks.map(el => el.dataset.check));
  const status = document.getElementById('storage-status');
  let saved = {};
  let selected = 'math';
  const storageError = () => { status.textContent = '目前無法使用本機儲存：勾選仍可操作，但重新開啟可能不保留。可列印留存。'; status.classList.add('warning'); };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error('Invalid saved checklist');
      saved = Object.fromEntries(Object.entries(parsed).filter(([id, value]) => ids.has(id) && value === true));
    }
    // Probe availability even before the first click, without touching other app keys.
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch { storageError(); }
  const update = () => {
    const visible = checks.filter(el => selected === 'all' || el.closest('.unit').dataset.subject === selected);
    document.getElementById('progress').textContent = `${selected === 'math' ? '數學' : selected === 'science' ? '自然' : '全部'}：已確認 ${visible.filter(el => el.checked).length} / ${visible.length} 項`;
    checks.forEach(el => {
      el.closest('.item').classList.toggle('checked', el.checked);
      el.closest('.check').querySelector('.print-check').textContent = el.checked ? '☑' : '□';
    });
  };
  checks.forEach(el => {
    el.checked = saved[el.dataset.check] === true;
    el.addEventListener('change', () => {
      if (el.checked) saved[el.dataset.check] = true;
      else delete saved[el.dataset.check];
      try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { storageError(); }
      update();
    });
  });
  const select = value => {
    selected = value;
    document.querySelectorAll('.unit, .unit-nav a').forEach(el => { el.hidden = value !== 'all' && el.dataset.subject !== value; });
    document.querySelectorAll('button[data-subject]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.subject === value)));
    update();
  };
  document.querySelectorAll('button[data-subject]').forEach(el => el.addEventListener('click', () => {
    select(el.dataset.subject);
    // Avoid a stale unit fragment bringing a now-hidden section into focus on reload.
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  }));
  const hashTarget = document.getElementById(location.hash.slice(1));
  select(hashTarget?.classList.contains('unit') ? hashTarget.dataset.subject : 'math');
  document.querySelector('.controls').hidden = false;
  let detailState = null;
  const preparePrint = () => {
    if (detailState) return;
    detailState = [...document.querySelectorAll('details')].map(el => [el, el.open]);
    detailState.forEach(([el]) => { el.open = true; });
  };
  const restorePrint = () => {
    detailState?.forEach(([el, open]) => { el.open = open; });
    detailState = null;
    document.body.classList.remove('print-all');
  };
  window.addEventListener('beforeprint', preparePrint);
  window.addEventListener('afterprint', restorePrint);
  const print = all => {
    document.body.classList.toggle('print-all', all);
    preparePrint();
    window.print();
  };
  document.getElementById('print-current').addEventListener('click', () => print(false));
  document.getElementById('print-all').addEventListener('click', () => print(true));
})();
