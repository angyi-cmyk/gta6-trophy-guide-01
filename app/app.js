// Leonida Trophy Guide — tracker for the 55 GTA VI trophies on PS5.
// Loads app/data/trophies.json (a file in this folder), keeps progress in
// localStorage, and makes no network request. All guide text is this
// guide's own words; sources are cited beside each trophy.

const DATA_URL = 'data/trophies.json';
const STORAGE_KEY = 'leonida-trophy-guide-v1';
const TOTAL_TROPHIES = 55;

// The four roadmap stages, built from the official descriptions: which
// story chapters and missions, which collectibles and counts, in what
// order. Every trophy id appears in exactly one stage.
const ROADMAP = [
  {
    title: 'Stage 1 — Play the story',
    hours: '60–80 hours',
    text: 'Finish Chapters 1–5 and enjoy the game. All 12 story trophies pop on their own, and progress toward the 100% checklist already counts. Do the Chapter 1 meditation (see Positive Mental Attitude) — it is the one thing that can be missed.',
    ids: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  },
  {
    title: 'Stage 2 — Side questlines, as they appear',
    hours: 'during the story',
    text: 'Optional questlines for Cal, Andy, Kenton, Billy, Randy, Tyrone and Bret, plus the stranger strands and the arcade games. Every one of them is still available after the story, so do them when they appear and mop up the rest later.',
    ids: [20, 21, 22, 23, 24, 25, 26, 27, 29],
  },
  {
    title: 'Stage 3 — 100% Completion Checklist',
    hours: 'about 100 hours',
    text: 'After the story the checklist opens under Progress, Stats, 100% Completion. It is lenient — closer to 60% true completion — and only 70 of 80 challenges are needed. The only tasks that need everything are Robberies, Underwater Discoveries, Shooting Ranges, Drone Races and Bret’s Quests.',
    ids: [14, 15, 17, 18, 19, 30, 31, 32, 35, 40, 42, 43, 52],
  },
  {
    title: 'Stage 4 — Cleanup and the platinum',
    hours: 'about 10 hours',
    text: 'Partner crime, the last activities and collectibles, the money trophies, and the five trophies whose methods are still unconfirmed. When the last one pops, the platinum follows.',
    ids: [16, 28, 33, 34, 36, 37, 38, 39, 41, 44, 45, 46, 47, 48, 49, 50, 51, 53, 54, 55, 1],
  },
];

// Filter kinds shown as chips. "online" has no trophies: the whole list is
// single-player, and the empty state says so.
const FILTER_KINDS = [
  { key: 'all', label: 'All' },
  { key: 'story', label: 'Story' },
  { key: 'missable', label: 'Missable' },
  { key: 'collectibles', label: 'Collectibles' },
  { key: 'activities', label: 'Activities' },
  { key: 'crime', label: 'Crime' },
  { key: 'money', label: 'Money' },
  { key: 'completion', label: 'Completion' },
  { key: 'online', label: 'Online' },
];

const KIND_LABELS = {
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  crime: 'Crime',
  money: 'Money',
  completion: 'Completion',
  platinum: 'Platinum',
  online: 'Online',
};

let trophyData = null;
let earned = new Set();
let spoilerOn = true;
let activeFilter = 'all';
let searchQuery = '';
let selectedId = 28;

function loadSavedProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (Array.isArray(saved.earned)) earned = new Set(saved.earned.filter((id) => Number.isInteger(id)));
    if (typeof saved.spoilerOn === 'boolean') spoilerOn = saved.spoilerOn;
  } catch (err) {
    earned = new Set();
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      app: 'leonida-trophy-guide',
      version: 1,
      earned: [...earned].sort((a, b) => a - b),
      spoilerOn,
    }));
  } catch (err) {
    // Private mode or blocked storage: the tracker still works in memory.
  }
}

function trophyById(id) {
  return trophyData.trophies.find((t) => t.id === id);
}

function isSpoiled(trophy) {
  return spoilerOn && trophy.kinds.includes('story') && !earned.has(trophy.id);
}

function displayName(trophy) {
  return isSpoiled(trophy) ? 'Hidden story trophy' : trophy.name;
}

function displayDescription(trophy) {
  return isSpoiled(trophy)
    ? 'Complete the story to reveal it — its name and description stay hidden until earned.'
    : trophy.description;
}

function gradeBadge(trophy) {
  const badge = document.createElement('span');
  badge.className = 'grade-badge grade-' + trophy.grade;
  badge.textContent = trophy.grade === 'platinum' ? 'Plat' : trophy.grade;
  return badge;
}

function kindTag(kind) {
  const tag = document.createElement('span');
  tag.className = 'tag';
  tag.textContent = KIND_LABELS[kind] || kind;
  return tag;
}

function renderProgress() {
  const count = earned.size;
  document.getElementById('progress-count').textContent = count + ' / ' + TOTAL_TROPHIES + ' earned';
  document.getElementById('progress-pct').textContent = Math.round((count / TOTAL_TROPHIES) * 100) + '%';
  document.getElementById('progress-fill').style.width = (count / TOTAL_TROPHIES) * 100 + '%';
  const grades = ['platinum', 'gold', 'silver', 'bronze'];
  const parts = grades.map((g) => {
    const total = trophyData.trophies.filter((t) => t.grade === g).length;
    const done = trophyData.trophies.filter((t) => t.grade === g && earned.has(t.id)).length;
    return g.charAt(0).toUpperCase() + g.slice(1) + ' ' + done + '/' + total;
  });
  document.getElementById('grade-line').textContent = parts.join(' · ');
}

function trophyMatches(trophy) {
  if (activeFilter !== 'all') {
    if (activeFilter === 'online') return false;
    if (!trophy.kinds.includes(activeFilter)) return false;
  }
  if (searchQuery) {
    const hay = (trophy.name + ' ' + trophy.description).toLowerCase();
    if (!hay.includes(searchQuery)) return false;
  }
  return true;
}

function renderChecklist() {
  const list = document.getElementById('trophy-list');
  list.textContent = '';
  const shown = trophyData.trophies.filter(trophyMatches);
  document.getElementById('empty-note').hidden = shown.length > 0;
  const note = document.getElementById('filter-note');
  if (activeFilter === 'online') {
    note.textContent = 'No online trophies — the whole list is single-player. Every trophy is earned offline (PowerPyx).';
  } else if (searchQuery || activeFilter !== 'all') {
    note.textContent = 'Showing ' + shown.length + ' of ' + TOTAL_TROPHIES + ' trophies.';
  } else {
    note.textContent = '';
  }
  for (const trophy of shown) {
    const row = document.createElement('li');
    row.className = 'trophy-row' + (earned.has(trophy.id) ? ' earned' : '') + (trophy.id === selectedId ? ' selected' : '');
    row.dataset.id = String(trophy.id);
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(trophy.id);
    box.setAttribute('aria-label', 'Mark ' + displayName(trophy) + ' as earned');
    box.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleEarned(trophy.id);
    });
    const main = document.createElement('div');
    main.className = 'trophy-main';
    const name = document.createElement('div');
    name.className = 'trophy-name';
    name.appendChild(gradeBadge(trophy));
    name.appendChild(document.createTextNode(displayName(trophy)));
    const desc = document.createElement('div');
    desc.className = 'trophy-desc';
    desc.textContent = displayDescription(trophy);
    const tags = document.createElement('div');
    tags.className = 'trophy-tags';
    for (const kind of trophy.kinds) tags.appendChild(kindTag(kind));
    if (trophy.hidden) {
      const hiddenTag = document.createElement('span');
      hiddenTag.className = 'tag hidden-tag';
      hiddenTag.textContent = 'Hidden on PSN';
      tags.appendChild(hiddenTag);
    }
    if (trophy.missable) {
      const missTag = document.createElement('span');
      missTag.className = 'tag missable';
      missTag.textContent = 'Possibly missable';
      tags.appendChild(missTag);
    }
    if (trophy.count !== null && trophy.count !== undefined) {
      const countTag = document.createElement('span');
      countTag.className = 'tag';
      countTag.textContent = 'Target: ' + trophy.count.toLocaleString('en-US');
      tags.appendChild(countTag);
    }
    main.appendChild(name);
    main.appendChild(desc);
    main.appendChild(tags);
    row.appendChild(box);
    row.appendChild(main);
    row.addEventListener('click', () => selectTrophy(trophy.id));
    list.appendChild(row);
  }
}

function renderRoadmap() {
  const stages = document.getElementById('stages');
  stages.textContent = '';
  for (const stage of ROADMAP) {
    const item = document.createElement('li');
    item.className = 'stage';
    const heading = document.createElement('h3');
    heading.textContent = stage.title + ' ';
    const hours = document.createElement('span');
    hours.className = 'hours';
    hours.textContent = '(' + stage.hours + ')';
    heading.appendChild(hours);
    const text = document.createElement('p');
    text.textContent = stage.text;
    const chips = document.createElement('div');
    chips.className = 'stage-trophies';
    for (const id of stage.ids) {
      const trophy = trophyById(id);
      if (!trophy) continue;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'stage-trophy' + (earned.has(id) ? ' done' : '');
      chip.textContent = (earned.has(id) ? '✓ ' : '') + displayName(trophy);
      chip.addEventListener('click', () => {
        selectTrophy(id);
        document.getElementById('detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
      chips.appendChild(chip);
    }
    item.appendChild(heading);
    item.appendChild(text);
    item.appendChild(chips);
    stages.appendChild(item);
  }
}

function renderDetail() {
  const body = document.getElementById('detail-body');
  body.textContent = '';
  const trophy = trophyById(selectedId);
  if (!trophy) return;
  const title = document.createElement('h3');
  title.appendChild(gradeBadge(trophy));
  title.appendChild(document.createTextNode(' ' + displayName(trophy)));
  body.appendChild(title);
  const meta = document.createElement('p');
  meta.className = 'meta';
  meta.textContent = 'Official description: ' + displayDescription(trophy);
  body.appendChild(meta);
  if (isSpoiled(trophy)) {
    const note = document.createElement('p');
    note.className = 'detail-empty';
    note.textContent = 'Spoiler hiding is on, and this story trophy is not earned yet — its guide is hidden too. Earn it in the game (or turn spoilers off above) to read the guide.';
    body.appendChild(note);
    return;
  }
  if (trophy.missable) {
    const warn = document.createElement('p');
    warn.className = 'warn';
    warn.textContent = 'Possibly missable — the only trophy in the list reported as such. See its guide below and do the Chapter 1 meditation before Chapter 1 ends.';
    body.appendChild(warn);
  }
  const guide = document.createElement('p');
  guide.className = 'guide-text';
  guide.textContent = trophy.guide;
  body.appendChild(guide);
  if (trophy.guide.includes('unsolved')) {
    const unknown = document.createElement('p');
    unknown.className = 'unknown';
    unknown.textContent = 'Method unconfirmed as of 20 Nov 2026. This guide does not invent a method for it — check the cited sources again as they update.';
    body.appendChild(unknown);
  }
  const sources = document.createElement('div');
  sources.className = 'sources';
  const label = document.createElement('strong');
  label.textContent = 'Sources: ';
  sources.appendChild(label);
  const list = document.createElement('ul');
  for (const key of trophy.sources) {
    const entry = trophyData.sourceIndex[key];
    if (!entry) continue;
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = entry.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = entry.label;
    item.appendChild(link);
    list.appendChild(item);
  }
  sources.appendChild(list);
  body.appendChild(sources);
}

function renderFilterChips() {
  const wrap = document.getElementById('filter-chips');
  wrap.textContent = '';
  for (const kind of FILTER_KINDS) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = kind.label;
    chip.setAttribute('aria-pressed', String(activeFilter === kind.key));
    chip.addEventListener('click', () => {
      activeFilter = kind.key;
      renderFilterChips();
      renderChecklist();
    });
    wrap.appendChild(chip);
  }
}

function renderSources() {
  const list = document.getElementById('source-list');
  list.textContent = '';
  for (const entry of Object.values(trophyData.sourceIndex)) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = entry.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = entry.label;
    item.appendChild(link);
    list.appendChild(item);
  }
}

function renderAll() {
  renderProgress();
  renderChecklist();
  renderRoadmap();
  renderDetail();
}

function toggleEarned(id) {
  if (earned.has(id)) earned.delete(id);
  else earned.add(id);
  saveProgress();
  renderAll();
}

function selectTrophy(id) {
  selectedId = id;
  renderChecklist();
  renderDetail();
}

function exportProgress() {
  const payload = {
    app: 'leonida-trophy-guide',
    version: 1,
    game: 'Grand Theft Auto VI',
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort((a, b) => a - b),
    spoilerOn,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'gta6-trophy-progress.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      if (!data || !Array.isArray(data.earned)) throw new Error('bad file');
      const valid = new Set(trophyData.trophies.map((t) => t.id));
      const imported = data.earned.filter((id) => valid.has(id));
      earned = new Set(imported);
      if (typeof data.spoilerOn === 'boolean') {
        spoilerOn = data.spoilerOn;
        document.getElementById('spoiler').checked = spoilerOn;
      }
      saveProgress();
      renderAll();
      document.getElementById('filter-note').textContent = 'Imported ' + imported.length + ' earned trophies.';
    } catch (err) {
      document.getElementById('filter-note').textContent = 'That file is not a progress export from this guide.';
    }
  };
  reader.readAsText(file);
}

function loadTrophyData() {
  return fetch(DATA_URL).then((response) => {
    if (!response.ok) throw new Error('could not load ' + DATA_URL);
    return response.json();
  });
}

function initTracker() {
  loadSavedProgress();
  document.getElementById('spoiler').checked = spoilerOn;
  document.getElementById('spoiler').addEventListener('change', (event) => {
    spoilerOn = event.target.checked;
    saveProgress();
    renderAll();
  });
  document.getElementById('search').addEventListener('input', (event) => {
    searchQuery = event.target.value.trim().toLowerCase();
    renderChecklist();
  });
  document.getElementById('export-btn').addEventListener('click', exportProgress);
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) importProgress(file);
    event.target.value = '';
  });
  document.getElementById('reset-btn').addEventListener('click', () => {
    earned = new Set();
    saveProgress();
    renderAll();
  });
  loadTrophyData().then((data) => {
    trophyData = data;
    renderFilterChips();
    renderSources();
    renderAll();
  }).catch((err) => {
    document.getElementById('trophy-list').textContent = '';
    document.getElementById('detail-body').textContent = 'Could not load the trophy data (data/trophies.json). Serve this folder with a static file server and reload.';
  });
}

initTracker();
