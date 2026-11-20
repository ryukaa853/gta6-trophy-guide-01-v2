// Leonida Platinum — offline trophy tracker for GTA 6 (55 trophies).
// All data comes from app/data/trophies.json (same origin, no network).
// Progress lives in localStorage under STORE_KEY; export downloads a JSON
// file and import reads that file back. No wall clock, no randomness.

const STORE_KEY = 'leonida-platinum-v2';
const DATA_URL = 'data/trophies.json';

const STAGES = [
  { n: 1, title: 'Stage 1 — Story first pass', text: 'Play the campaign in order: the opening mission, Chapters 1–4 and the final mission. Every story trophy here is one-time, so do not rush past a mission — finish each one when it appears.' },
  { n: 2, title: 'Stage 2 — Strangers & side strands', text: 'Clear the side-mission strands for Andy, Kenton, Billy, Randy and Tyrone, and finish 8 stranger strands across Leonida. These open up as you explore, so sweep the map between story beats.' },
  { n: 3, title: 'Stage 3 — Activities & challenges', text: 'Work the repeatable content: 250 stunts, all 42 Shooting Range golds, drone races at all 14 spots, 20 different race wins, fishing against Cal, meditation at all 18 spots, WAiNK at 100 locations, bowling, and 50 challenges.' },
  { n: 4, title: 'Stage 4 — Collectibles & exploration', text: 'Mop up the countable sets: 3 card sets, 100 vehicles, all 52 areas of Leonida, all 8 garages, 10 Scooter Bros registrations, $250,000 laundered and $100,000 spent in shops.' },
  { n: 5, title: 'Stage 5 — Cleanup, chaos & platinum', text: 'Finish the tricky one-offs (partner escapes, shop robberies, Combat Focus, VCIA exit, bank vaults, gang operations) and the 100% completion grind. The platinum pops when the other 54 are done.' },
];

let trophies = [];
let earned = new Set();
let selectedId = null;
let view = 'checklist';

const $ = (id) => document.getElementById(id);
const listEl = $('trophyList');
const pageEl = $('pageView');
const detailEl = $('detailPane');

function loadEarned() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.filter((x) => Number.isInteger(x)) : []);
  } catch (e) {
    return new Set();
  }
}

function saveEarned() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function gradeLabel(t) {
  return t.grade.charAt(0).toUpperCase() + t.grade.slice(1);
}

function isSpoilerHidden(t) {
  return $('spoilerToggle').checked && t.hidden && t.kind === 'story' && !earned.has(t.id);
}

function trophyMatches(t) {
  const q = $('search').value.trim().toLowerCase();
  if (q && !(t.name.toLowerCase().includes(q) || t.guide.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q))) return false;
  const kind = $('kindFilter').value;
  if (kind === 'missable') {
    if (!t.missable) return false;
  } else if (kind !== 'all' && t.kind !== kind) {
    return false;
  }
  const grade = $('gradeFilter').value;
  if (grade !== 'all' && t.grade !== grade) return false;
  if ($('hideEarned').checked && earned.has(t.id)) return false;
  return true;
}

function pill(text, cls) {
  return '<span class="pill ' + cls + '">' + text + '</span>';
}

function renderList() {
  const shown = trophies.filter(trophyMatches);
  $('listHint').textContent = shown.length + ' of 55 trophies shown · ' + earned.size + ' earned';
  listEl.innerHTML = shown.map((t) => {
    const isEarned = earned.has(t.id);
    const hidden = isSpoilerHidden(t);
    const name = hidden ? 'Hidden trophy — earn it to reveal' : escapeHtml(t.name);
    const desc = hidden ? 'Spoiler-free mode hides this story trophy until you earn it.' : escapeHtml(t.desc);
    const metas = [
      pill(gradeLabel(t), 'grade-' + t.grade),
      pill(t.kind, ''),
      t.missable ? pill('MISSABLE', 'missable') : '',
      t.hidden ? pill('Hidden on PSN', 'hidden') : '',
      t.count != null ? pill('× ' + t.count, '') : '',
      isEarned ? pill('✓ Earned', 'earnedPill') : '',
    ].join('');
    return '<li class="trophy' + (isEarned ? ' earned' : '') + (selectedId === t.id ? ' selected' : '') + '" data-id="' + t.id + '">' +
      '<div class="row"><input type="checkbox" ' + (isEarned ? 'checked' : '') + ' aria-label="Mark earned"><span class="name">' + name + '</span></div>' +
      '<p class="desc">' + desc + '</p>' +
      '<div class="meta">' + metas + '</div></li>';
  }).join('');
  listEl.querySelectorAll('.trophy').forEach((el) => {
    el.addEventListener('click', (ev) => {
      const id = Number(el.dataset.id);
      if (ev.target.type === 'checkbox') {
        toggleEarned(id);
        return;
      }
      selectTrophy(id);
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toggleEarned(id) {
  if (earned.has(id)) earned.delete(id); else earned.add(id);
  saveEarned();
  renderProgress();
  renderList();
  if (selectedId === id) renderDetail();
  if (view === 'roadmap' || view === 'missables' || view === 'nextup') renderPage();
}

function selectTrophy(id) {
  selectedId = id;
  renderList();
  renderDetail();
}

function renderProgress() {
  const n = earned.size;
  $('earnedCount').textContent = n;
  $('progressFill').style.width = Math.round((n / 55) * 100) + '%';
  $('progressPct').textContent = Math.round((n / 55) * 100) + '% to the platinum';
  const counts = {};
  trophies.forEach((t) => {
    if (earned.has(t.id)) counts[t.grade] = (counts[t.grade] || 0) + 1;
  });
  $('gradeCounts').textContent = 'Platinum ' + (counts.platinum || 0) + '/1 · Gold ' + (counts.gold || 0) + '/2 · Silver ' + (counts.silver || 0) + '/6 · Bronze ' + (counts.bronze || 0) + '/46';
}

function renderDetail() {
  const t = trophies.find((x) => x.id === selectedId);
  if (!t) {
    detailEl.innerHTML = '<p class="detailEmpty">Select a trophy to read its guide, sources and missable warning.</p>';
    return;
  }
  const isEarned = earned.has(t.id);
  const hidden = isSpoilerHidden(t);
  const name = hidden ? 'Hidden trophy' : escapeHtml(t.name);
  const desc = hidden ? 'Spoiler-free mode hides this story trophy until you earn it.' : escapeHtml(t.desc);
  detailEl.innerHTML =
    '<h2>' + name + '</h2>' +
    '<p class="gradeLine">' + gradeLabel(t) + ' · ' + escapeHtml(t.kind) + ' · Roadmap stage ' + t.stage +
    (t.hidden ? ' · Hidden on PSN' : '') + (t.count != null ? ' · PSN count: ' + t.count : '') + '</p>' +
    '<p><strong>Official description:</strong> ' + desc + '</p>' +
    (t.missable ? '<div class="warnBox">MISSABLE — this trophy can be missed. Earn it when the opportunity appears; there may be no second chance in this playthrough.</div>' : '') +
    '<p class="guideText"><strong>Guide:</strong> ' + escapeHtml(t.guide) + '</p>' +
    '<p class="srcLine"><strong>Sources:</strong> ' + escapeHtml(t.src) + '</p>' +
    '<button class="earnBtn" type="button">' + (isEarned ? 'Mark as not earned' : 'Mark as earned') + '</button>';
  detailEl.querySelector('.earnBtn').addEventListener('click', () => toggleEarned(t.id));
}

function stageTrophies(n) {
  return trophies.filter((t) => t.stage === n);
}

function renderPage() {
  if (view === 'checklist') {
    pageEl.hidden = true;
    listEl.hidden = false;
    $('listHint').hidden = false;
    return;
  }
  listEl.hidden = true;
  pageEl.hidden = false;
  $('listHint').hidden = true;
  if (view === 'roadmap') {
    pageEl.innerHTML = '<h2>Roadmap to the platinum</h2><p>Five stages, built from the official descriptions: story first, then side strands, activities, collectibles, and finally the one-off challenges plus 100% completion. The platinum is Stage 5 — it pops when the other 54 are done.</p>' +
      STAGES.map((s) => {
        const ts = stageTrophies(s.n);
        const done = ts.filter((t) => earned.has(t.id)).length;
        const items = ts.map((t) => '<li>' + (earned.has(t.id) ? '✓ ' : '') + escapeHtml(t.name) + ' <span class="pill grade-' + t.grade + '">' + gradeLabel(t) + '</span>' + (t.missable ? ' <span class="pill missable">MISSABLE</span>' : '') + '</li>').join('');
        return '<div class="stageCard"><h3>' + s.title + ' — ' + done + '/' + ts.length + ' done</h3><p>' + s.text + '</p><ul>' + items + '</ul></div>';
      }).join('');
  } else if (view === 'missables') {
    const ms = trophies.filter((t) => t.missable);
    const done = ms.filter((t) => earned.has(t.id)).length;
    pageEl.innerHTML = '<h2>Missable trophies — ' + done + '/' + ms.length + ' earned</h2>' +
      '<p>Thirteen trophies can be missed in a single playthrough. All of them are tied to one-time story missions or one-time opportunities with a partner or a rival. Earn each one when it appears — do not assume it comes back.</p>' +
      '<ul>' + ms.map((t) => '<li><strong>' + escapeHtml(t.name) + '</strong> — ' + escapeHtml(t.desc) + ' <button type="button" data-id="' + t.id + '">' + (earned.has(t.id) ? '✓ Earned' : 'Open guide') + '</button></li>').join('') + '</ul>';
    pageEl.querySelectorAll('button[data-id]').forEach((b) => b.addEventListener('click', () => {
      setView('checklist');
      selectTrophy(Number(b.dataset.id));
    }));
  } else if (view === 'nextup') {
    const parts = STAGES.map((s) => {
      const rest = stageTrophies(s.n).filter((t) => !earned.has(t.id))
        .sort((a, b) => (b.missable - a.missable) || (a.id - b.id));
      if (!rest.length) return '<div class="stageCard"><h3>' + s.title + '</h3><p class="done">Stage complete — every trophy earned.</p></div>';
      const next = rest.slice(0, 3);
      return '<div class="stageCard"><h3>' + s.title + ' — ' + rest.length + ' left</h3><p>Next up:</p><ul>' +
        next.map((t) => '<li><strong>' + escapeHtml(t.name) + '</strong> (' + gradeLabel(t) + ')' + (t.missable ? ' — MISSABLE, do it first' : '') + '</li>').join('') + '</ul></div>';
    }).join('');
    const totalLeft = 55 - earned.size;
    pageEl.innerHTML = '<h2>Next up planner</h2><p>' + totalLeft + ' trophies left. The planner works through the roadmap in order and always puts a missable trophy first inside its stage, so nothing one-time slips past you.</p>' + parts;
  }
}

function setView(v) {
  view = v;
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
  $('toolbar').style.display = v === 'checklist' ? '' : 'none';
  renderPage();
  if (v === 'checklist') renderList();
}

function exportProgress() {
  const payload = { app: 'leonida-platinum', version: 2, earned: [...earned].sort((a, b) => a - b) };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'leonida-platinum-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const ids = Array.isArray(data) ? data : data.earned;
      if (!Array.isArray(ids)) throw new Error('bad file');
      earned = new Set(ids.filter((x) => Number.isInteger(x) && x >= 1 && x <= 55));
      saveEarned();
      renderProgress();
      renderList();
      renderPage();
      renderDetail();
    } catch (e) {
      alert('That file is not a Leonida Platinum progress export.');
    }
  };
  reader.readAsText(file);
}

async function boot() {
  const res = await fetch(DATA_URL);
  const data = await res.json();
  trophies = data.trophies.slice().sort((a, b) => a.id - b.id);
  earned = loadEarned();
  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  ['search', 'kindFilter', 'gradeFilter', 'spoilerToggle', 'hideEarned'].forEach((id) => {
    $(id).addEventListener('input', renderList);
    $(id).addEventListener('change', renderList);
  });
  $('exportBtn').addEventListener('click', exportProgress);
  $('importFile').addEventListener('change', (ev) => {
    if (ev.target.files.length) importProgress(ev.target.files[0]);
    ev.target.value = '';
  });
  $('resetBtn').addEventListener('click', () => {
    if (confirm('Clear all earned trophies?')) {
      earned = new Set();
      saveEarned();
      renderProgress();
      renderList();
      renderPage();
      renderDetail();
    }
  });
  renderProgress();
  renderList();
  renderDetail();
}

boot();
