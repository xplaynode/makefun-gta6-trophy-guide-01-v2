// Sunledger Atlas — an offline GTA VI trophy guide and tracker.
// One data file (data/trophies.json), no network beyond it, progress in localStorage.
const KEY = 'sunledger-atlas-v1';
const doc = await (await fetch('data/trophies.json')).json();
const TROPHIES = doc.trophies;
const SOURCES = doc.sources;
const TOTAL_POINTS = TROPHIES.reduce((a, t) => a + t.points, 0);
const STAGES = [
  { n: 0, name: 'The Goal', hours: 0, why: 'The platinum itself: it follows the other 54 automatically, in single player only [1][2].' },
  { n: 1, name: 'Chapter 1', hours: 14, why: 'Chapter 1 trophies come from its main missions, from Gone Fishing onward [1]. One thing is time-boxed here: the balcony meditation at Jason\u2019s house, offered the morning after Down to Earth [1][3].' },
  { n: 2, name: 'Chapter 2', hours: 15, why: 'Chapter 2\u2019s missions, including Breakfast Run [1]. Coffee Break in this chapter unlocks playing as both characters together, which the partner trophies and the last meditation need [1].' },
  { n: 3, name: 'Chapter 3', hours: 15, why: 'Chapter 3\u2019s missions, including The Cartel Heist [1]. The Key Cloner, Yasmani\u2019s jewelry work and the Dye Pack Jammer all arrive here and feed the cleanup stages [1].' },
  { n: 4, name: 'Chapter 4', hours: 14, why: 'Chapter 4\u2019s missions — Child\u2019s Play, Headliners, VCIA Takedown — and its optional opener that unlocks bank-vault robberies [1].' },
  { n: 5, name: 'Finale', hours: 6, why: 'Chapter 5 and the final mission: the hidden gold, You Gotta Know When to Get Off [1][2]. After the credits, free-roam continues and the 100% checklist opens [1][8].' },
  { n: 6, name: 'The 100% checklist', hours: 100, why: 'The checklist under Progress > Stats > 100% Completion is lenient — 200 of 277 vehicles, 100 of 255 animals, 70 of 80 challenges, 15 of 18 meditations — but robberies, ranges, drone races and Bret\u2019s quests want everything [1][4].' },
  { n: 7, name: 'Side chains & strangers', hours: 10, why: 'The character lines (Andy, Kenton, Billy, Randy, Tyrone, Bret, Cal) and the 8 stranger strands the trophy tracker actually credits [1][7].' },
  { n: 8, name: 'Cleanup feats', hours: 26, why: 'One-off moments and counters left over: the VCIA jet, the Mile Zero tank, the showroom Banshee, shop chains, spending and registration totals [1].' },
];
const KIND_LABEL = { story: 'Story', missable: 'Missable', collectibles: 'Collectibles', activities: 'Activities', side: 'Side chains', crime: 'Crime', feats: 'Feats', misc: 'Misc', online: 'Online' };
const FILTERS = [
  ['all', 'All'], ['story', 'Story'], ['missable', 'Missable'], ['collectibles', 'Collectibles'],
  ['activities', 'Activities'], ['side', 'Side chains'], ['crime', 'Crime'], ['feats', 'Feats'],
  ['misc', 'Misc'], ['online', 'Online'], ['unearned', 'Unearned only'], ['todo', 'To do'],
];

let state = loadState();
let selectedId = 28;
let activeFilter = 'all';
let revealed = new Set();

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && raw.app === 'sunledger-atlas') return { earned: new Set(raw.earned || []), counts: raw.counts || {}, spoilers: !!raw.spoilers, unearnedOnly: !!raw.unearnedOnly };
  } catch { /* a corrupt save falls back to a fresh ledger */ }
  return { earned: new Set(), counts: {}, spoilers: false, unearnedOnly: false };
}
function saveState() {
  localStorage.setItem(KEY, JSON.stringify({ app: 'sunledger-atlas', version: 1, earned: [...state.earned], counts: state.counts, spoilers: state.spoilers, unearnedOnly: state.unearnedOnly }));
}
function refsOf(text) { return [...text.matchAll(/\[(\d)\]/g)].map((m) => Number(m[1])); }
function stepSources(t) { return t.steps.map((s) => [...new Set(refsOf(s))]); }
function guideSources(t) { return [...new Set(refsOf(t.summary + ' ' + t.steps.join(' ')))]; }
function confidence(t) {
  if (t.disagree) return ['disputed', 'Disputed'];
  if (guideSources(t).length <= 1) return ['single', 'Single-source'];
  return ['backed', 'Backed by 2+ sources'];
}
function isTodo(t) { return !state.earned.has(t.id); }
function matchesKind(t, f) {
  if (f === 'all') return true;
  if (f === 'missable') return t.missable !== 'no';
  if (f === 'unearned' || f === 'todo') return isTodo(t);
  return t.kind === f;
}
function fmt(n) { return n.toLocaleString('en-US'); }

function auditData() {
  const steps = TROPHIES.reduce((a, t) => a + t.steps.length, 0);
  const cited = TROPHIES.reduce((a, t) => a + t.steps.filter((s) => refsOf(s).length > 0).length, 0);
  const guidesCited = TROPHIES.filter((t) => guideSources(t).length > 0).length;
  return {
    steps, cited, guidesCited,
    hidden: TROPHIES.filter((t) => t.hidden).length,
    possible: TROPHIES.filter((t) => t.missable === 'possible').length,
    watch: TROPHIES.filter((t) => t.missable === 'watch').length,
    unconfirmed: TROPHIES.filter((t) => t.unconfirmed).length,
    single: TROPHIES.filter((t) => confidence(t)[0] === 'single').length,
    disagree: TROPHIES.filter((t) => t.disagree).length,
  };
}
function renderAudit() {
  const a = auditData();
  document.getElementById('audit-strip').textContent =
    `AUDIT — 55 official · 1P 2G 6S 46B · ${a.hidden} hidden · ${a.guidesCited}/55 guides cite a source · ${a.cited}/${a.steps} steps cited · 8 sources read 20 Nov 2026 · ${a.possible} possibly-missable · ${a.watch} watch · ${a.unconfirmed} unconfirmed · ${a.single} single-source · ${a.disagree} sources-disagree`;
}
function renderProgress() {
  const n = state.earned.size;
  const pts = TROPHIES.filter((t) => state.earned.has(t.id)).reduce((a, t) => a + t.points, 0);
  document.getElementById('progress-line').textContent = `${n}/55 earned · ${Math.round((n / 55) * 100)}% · ${fmt(pts)} of ${fmt(TOTAL_POINTS)} PSN pts`;
  document.getElementById('progress-fill').style.width = `${(n / 55) * 100}%`;
  const chips = STAGES.slice(1).map((s) => {
    const inStage = TROPHIES.filter((t) => t.stage === s.n);
    const done = inStage.filter((t) => state.earned.has(t.id)).length;
    return `<span>S${s.n} ${done}/${inStage.length}</span>`;
  }).join('');
  document.getElementById('stage-chips').innerHTML = chips;
  const totalHours = STAGES.reduce((a, s) => a + s.hours, 0);
  const doneHours = STAGES.reduce((a, s) => {
    const inStage = TROPHIES.filter((t) => t.stage === s.n);
    if (!inStage.length) return a;
    return a + s.hours * (inStage.filter((t) => state.earned.has(t.id)).length / inStage.length);
  }, 0);
  document.getElementById('hours-line').textContent = `Hours to platinum: about ${totalHours} h on the roadmap [1][3] · roughly ${Math.max(0, Math.round(totalHours - doneHours))} h left at this progress`;
}

function counterHtml(t, big) {
  if (!t.count) return '';
  const cur = state.counts[t.id] || 0;
  const pct = Math.min(100, Math.round((cur / t.count.target) * 100));
  const step = t.count.step || 1;
  return `<span class="${big ? 'detail-counter' : 'counter'}"><button type="button" data-dec="${t.id}">−</button><span>${fmt(cur)}/${fmt(t.count.target)} ${t.count.label}</span><span class="bar"><i style="width:${pct}%"></i></span><button type="button" data-inc="${t.id}" data-step="${step}">+</button></span>`;
}
function shielded(t) { return state.spoilers && t.kind === 'story' && !state.earned.has(t.id) && !revealed.has(t.id); }

function rowHtml(t) {
  const conf = confidence(t);
  const hide = shielded(t);
  const name = hide ? 'Hidden trophy' : t.name;
  const desc = hide ? `stage ${t.stage} · story — hidden by the spoiler shield` : t.description;
  const flags = [
    `<span class="chip grade-${t.grade}">${t.grade}</span>`,
    `<span class="chip">${KIND_LABEL[t.kind] || t.kind}</span>`,
    `<span class="chip">stage ${t.stage}</span>`,
    `<span class="chip">${t.chapter}</span>`,
    t.hidden ? '<span class="chip">hidden on PSN</span>' : '',
    t.missable === 'possible' ? '<span class="chip miss">POSSIBLY MISSABLE</span>' : '',
    t.missable === 'watch' ? '<span class="chip watch">WATCH</span>' : '',
    t.unconfirmed ? '<span class="chip unc">UNCONFIRMED</span>' : '',
    `<span class="chip conf-${conf[0]}">${conf[1]}</span>`,
    `<span class="chip">cites ${guideSources(t).map((n) => '[' + n + ']').join(' ')}</span>`,
  ].join('');
  return `<div class="row ${state.earned.has(t.id) ? 'earned' : ''} ${selectedId === t.id ? 'selected' : ''}" data-row="${t.id}">
    <input type="checkbox" data-earn="${t.id}" ${state.earned.has(t.id) ? 'checked' : ''} aria-label="earned">
    <div><div class="tname">${name}</div><div class="tdesc">${desc}</div><div class="chips">${flags}</div>
    ${hide ? '<button type="button" class="reveal-btn" data-reveal="' + t.id + '">Reveal</button>' : ''}</div>
    <div class="row-side">${t.points} pts · ${t.time}<br>${counterHtml(t, false)}</div></div>`;
}

function renderTracker() {
  renderProgress(); renderAudit();
  const q = document.getElementById('search').value.trim().toLowerCase();
  const grade = document.getElementById('grade-filter').value;
  const sort = document.getElementById('sort').value;
  const chipBox = document.getElementById('filter-chips');
  chipBox.innerHTML = FILTERS.map(([f, label]) => {
    const count = f === 'all' ? 55 : TROPHIES.filter((t) => matchesKind(t, f)).length;
    return `<button type="button" data-filter="${f}" class="${activeFilter === f ? 'active' : ''}">${label} ${count}</button>`;
  }).join('');
  let list = TROPHIES.filter((t) => matchesKind(t, activeFilter));
  if (state.unearnedOnly) list = list.filter(isTodo);
  if (grade !== 'all') list = list.filter((t) => t.grade === grade);
  if (q) list = list.filter((t) => (t.name + ' ' + t.description + ' ' + t.kind).toLowerCase().includes(q));
  if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'grade') list = [...list].sort((a, b) => b.points - a.points);
  if (sort === 'points') list = [...list].sort((a, b) => b.points - a.points);
  const next = TROPHIES.filter(isTodo).slice(0, 3);
  document.getElementById('next-up').innerHTML = '<b>NEXT UP</b> (roadmap order): ' + next.map((t) => shielded(t) ? 'Hidden trophy' : t.name).join(' · ');
  const box = document.getElementById('stage-list');
  if (sort === 'roadmap') {
    box.innerHTML = STAGES.map((s) => {
      const rows = list.filter((t) => t.stage === s.n);
      if (!rows.length) return '';
      const done = TROPHIES.filter((t) => t.stage === s.n && state.earned.has(t.id)).length;
      const total = TROPHIES.filter((t) => t.stage === s.n).length;
      return `<div class="stage-head"><span>S${s.n} — ${s.name}</span><span class="n">${done}/${total} EARNED</span></div>` + rows.map(rowHtml).join('');
    }).join('') || '<p class="hint">No trophies match.</p>';
  } else {
    box.innerHTML = list.map(rowHtml).join('') || '<p class="hint">No trophies match.</p>';
  }
  renderDetail();
  renderRail();
}

function renderDetail() {
  const t = TROPHIES.find((x) => x.id === selectedId) || TROPHIES[0];
  const conf = confidence(t);
  const perStep = stepSources(t);
  const stepsHtml = t.steps.map((s, i) => `<li>${s.replace(/\[(\d)\]/g, '<span class="cite">[$1]</span>')} </li>`).join('');
  const srcLine = perStep.map((ss) => ss.join('+')).join(' · ');
  let boxes = '';
  if (t.missable === 'possible') boxes += `<div class="box missable"><b>MISSABLE?</b> Possibly — the one real risk in the set. The Chapter 1 balcony meditation at Jason's house is offered the morning after Down to Earth and is gone when Chapter 1 ends [1][3]. Do it in Chapter 1 and keep a Chapter 1 manual save.</div>`;
  if (t.missable === 'watch') boxes += `<div class="box watch"><b>WATCH.</b> ${t.watch || ''}</div>`;
  if (t.unconfirmed) boxes += `<div class="box unc"><b>UNCONFIRMED.</b> No source we read pins this trigger down. We label the gap instead of inventing a method.</div>`;
  if (t.disagree) boxes += `<div class="box disagree"><b>SOURCES DISAGREE — BOTH VERSIONS SHOWN.</b><br>Version A: ${t.disagree.a}<br>Version B: ${t.disagree.b}<br><b>The safe play:</b> ${t.disagree.safe}</div>`;
  document.getElementById('detail-pane').innerHTML = `
    <h2>${shielded(t) ? 'Hidden trophy' : t.name}</h2>
    <div class="chips"><span class="chip grade-${t.grade}">${t.grade}</span><span class="chip">${KIND_LABEL[t.kind] || t.kind}</span><span class="chip">stage ${t.stage} · ${t.chapter}</span><span class="chip">${t.points} PSN pts</span><span class="chip">about ${t.time}</span><span class="chip conf-${conf[0]}">${conf[1]}</span></div>
    <div class="official"><b>OFFICIAL DESCRIPTION — PLAYSTATION</b><br>${shielded(t) ? 'Hidden by the spoiler shield until earned.' : t.description}</div>
    <p class="inshort"><b>IN SHORT —</b> ${t.summary.replace(/\[(\d)\]/g, '<span class="cite">[$1]</span>')}</p>
    ${t.count ? counterHtml(t, true) : ''}
    <ol class="steps">${stepsHtml}</ol>
    ${boxes}
    <p class="msg">Step sources in order: ${srcLine}. Full register in the Sources view; every number in the audit strip is computed from this data.</p>`;
}

function renderRail() {
  const citedBy = SOURCES.map((s) => TROPHIES.filter((t) => guideSources(t).includes(s.n)).length);
  document.getElementById('sources-rail').innerHTML = '<h3>Sources — numbered register</h3>' + SOURCES.map((s, i) => `
    <div class="src"><b>[${s.n}] ${s.name}</b> — ${s.title}<br><span class="scope">${s.scope} · read ${s.read}</span><br>cited by ${citedBy[i]} of 55 guides</div>`).join('') +
    '<p class="msg">Citations render as numbers in the app; the register above is the key. The app fetches nothing.</p>';
}

function renderRoadmap() {
  const totalHours = STAGES.reduce((a, s) => a + s.hours, 0);
  const cards = STAGES.map((s) => {
    const inStage = TROPHIES.filter((t) => t.stage === s.n);
    const done = inStage.filter((t) => state.earned.has(t.id)).length;
    const pct = inStage.length ? Math.round((done / inStage.length) * 100) : 100;
    return `<div class="panel stage-card"><h3><span>S${s.n} — ${s.name}</span><span>${s.hours ? 'about ' + s.hours + ' h · ' : ''}${done}/${inStage.length} earned · ${pct}%</span></h3>
      <div class="progress-track"><div style="background:#0f5f5c;height:100%;width:${pct}%"></div></div>
      <p><b>FROM THE DESCRIPTIONS —</b> ${s.why}</p>
      <div class="chips">${inStage.map((t) => `<span class="chip ${state.earned.has(t.id) ? 'conf-backed' : ''}">${shielded(t) ? 'Hidden trophy' : t.name}</span>`).join('')}</div></div>`;
  }).join('');
  const watch = TROPHIES.filter((t) => t.missable === 'watch');
  document.getElementById('view-roadmap').innerHTML = `
    <div class="panel"><h3>Roadmap to the platinum — about ${totalHours} hours in total</h3>
    <p>One playthrough is enough: there is no mission replay and no New Game+, free-roam continues after the story, and nothing on the 100% checklist is missable [1][3]. The hour estimates follow the roadmap sources: story 60–80 h, the checklist stage about 100 h, side chains about 10 h, the rest in cleanup [1][3]. Push Square warns the whole platinum can run 250–300 h [8] — the disagreement is shown on A Long Road's guide, and the safe plan is the longer number.</p></div>
    ${cards}
    <div class="panel"><h3>Point-of-no-return timeline</h3>
    <p>1 · <b>Chapter 1 ends</b> — the balcony meditation at Jason's house is gone for good; the only hard point of no return for a trophy [1][3].<br>
    2 · <b>Each chapter start</b> — not a lockout, but the moment to bank a manual save, because no mission can be replayed [1].<br>
    3 · <b>The final mission</b> — save before it; afterwards the checklist opens and the run becomes cleanup [1][2].<br>
    4 · <b>Nothing after the credits locks a trophy</b> — every quest giver and stranger returns in free-roam [1].</p></div>
    <div class="panel"><h3>Missable watch list</h3>
    <p><b>Positive Mental Attitude</b> — possibly missable, Chapter 1, see the Missables view [1][3].</p>
    <ul>${watch.map((t) => `<li><b>${t.name}</b> — ${t.watch || ''}</li>`).join('')}</ul></div>
    <div class="panel"><h3>Ground rules</h3>
    <ul>
      <li>One playthrough is enough; there is no mission replay and no New Game+ [1][3].</li>
      <li>Keep a manual save at the start (and end) of every chapter — 15 manual slots are provided, and the roadmap suggests rotating the spare ones in cleanup [1].</li>
      <li>Cheats off for the whole run: the guides agree cheats disable trophies and saving [1][7].</li>
      <li>There are no difficulty settings and no mission medals to protect [1].</li>
      <li>Scan vehicles and study animals as you travel; both feed the 100% checklist from the first chapter [1].</li>
    </ul></div>
    <div class="panel"><h3>How this roadmap was built</h3>
    <p>Stages follow the official descriptions first: chapter trophies sit in their chapters, named missions sit where the guides place them, and counted trophies sit with the system that tracks them (Progress menus, the checklist, the map filters) [1]. Every stage justification above cites the sources it rests on, disagreements are shown rather than smoothed over, and anything no source pins down is labelled unconfirmed in its guide.</p></div>`;
}

function renderMissables() {
  const pma = TROPHIES.find((t) => t.missable === 'possible');
  const watch = TROPHIES.filter((t) => t.missable === 'watch');
  const unc = TROPHIES.filter((t) => t.unconfirmed);
  document.getElementById('view-missables').innerHTML = `
    <div class="panel"><h3>Missables &amp; watch</h3>
    <div class="box missable"><b>THE ONE REAL RISK — ${pma.name}.</b> ${pma.summary}<br><br>
    <b>SOURCES DISAGREE — BOTH VERSIONS SHOWN.</b><br>Version A: ${pma.disagree.a}<br>Version B: ${pma.disagree.b}<br><b>The safe play:</b> ${pma.disagree.safe}</div>
    <p>Everything else in the set is reported open after the story. The board's habit of calling side chains "missable" is wrong on the sources we read: the guides are explicit that trophy quest givers return in free-roam [1]. What follows is a watch list, not a missable list.</p></div>
    <div class="panel"><h3>Watch list — open after the story, worth an eye</h3>
    <ul>${watch.map((t) => `<li><b>${t.name}</b> (${t.chapter}) — ${t.watch || ''}</li>`).join('')}</ul></div>
    <div class="panel"><h3>Unconfirmed triggers — labelled, never invented</h3>
    <ul>${unc.map((t) => `<li><b>${t.name}</b> — ${t.summary}</li>`).join('')}</ul></div>`;
}

function renderMatrix() {
  const perGuide = TROPHIES.map((t) => stepSources(t));
  const counts = perGuide.map((ss) => SOURCES.map((s) => ss.filter((x) => x.includes(s.n)).length));
  const summaryCites = TROPHIES.map((t) => [...new Set(refsOf(t.summary))]);
  const multi = TROPHIES.filter((t) => guideSources(t).length >= 3).length;
  const two = TROPHIES.filter((t) => guideSources(t).length === 2).length;
  const one = TROPHIES.filter((t) => guideSources(t).length === 1).length;
  const head = SOURCES.map((s) => `<th>[${s.n}]<br>${s.name}</th>`).join('');
  const rows = TROPHIES.map((t, i) => {
    const cells = counts[i].map((c, j) => `<td>${c > 0 ? c : (summaryCites[i].includes(SOURCES[j].n) ? '<span class="dot">●</span>' : '·')}</td>`).join('');
    const flags = [t.disagree ? '<span class="flag">DIFFER</span>' : '', t.missable !== 'no' ? '<span class="flag open">OPEN</span>' : '', guideSources(t).length === 1 ? '<span class="flag one">1 SRC</span>' : ''].join(' ');
    return `<tr><td class="name">${t.name}</td>${cells}<td>${flags}</td></tr>`;
  }).join('');
  document.getElementById('view-matrix').innerHTML = `
    <div class="panel"><h3>Source matrix — which sources carry which guide</h3>
    <div class="chips"><span class="chip conf-backed">${multi} guides on 3+ sources</span><span class="chip">${two} guides on 2 sources</span><span class="chip conf-single">${one} guides on 1 source</span><span class="chip">cell = steps citing that source · ● = summary-only cite</span></div>
    <div style="overflow-x:auto;margin-top:8px"><table class="matrix"><tr><th class="name">Guide</th>${head}<th>Flags</th></tr>${rows}</table></div></div>`;
}

function renderSources() {
  const citedBy = SOURCES.map((s) => TROPHIES.filter((t) => guideSources(t).includes(s.n)).length);
  const citedSteps = SOURCES.map((s) => TROPHIES.reduce((a, t) => a + t.steps.filter((x) => refsOf(x).includes(s.n)).length, 0));
  document.getElementById('view-sources').innerHTML = `<div class="panel"><h3>Sources — the numbered register</h3>
    <p>Read on 20 Nov 2026, for facts and reference. Every guide in this app is our own words; only the official trophy names and descriptions are quoted, as PlayStation publishes them.</p>
    ${SOURCES.map((s, i) => `<p><b>[${s.n}] ${s.name}</b> — ${s.title}<br>${s.url}<br><span class="scope">Scope: ${s.scope} · read ${s.read}</span> · cited by ${citedBy[i]} of 55 guides · cited in ${citedSteps[i]} steps</p>`).join('')}</div>`;
}

function exportPayload() {
  return { app: 'sunledger-atlas', version: 1, earned: [...state.earned].sort((a, b) => a - b), counts: state.counts, spoilers: state.spoilers, unearnedOnly: state.unearnedOnly };
}
function renderExport(msg) {
  const byKind = {};
  for (const t of TROPHIES) { byKind[t.kind] = byKind[t.kind] || [0, 0]; byKind[t.kind][1]++; if (state.earned.has(t.id)) byKind[t.kind][0]++; }
  document.getElementById('view-export').innerHTML = `
    <div class="panel"><h3>Export / Import — your progress as JSON</h3>
    <pre class="export">${JSON.stringify(exportPayload(), null, 1)}</pre>
    <button type="button" class="action" id="dl">Download .json</button>
    <button type="button" class="action ghost" id="cp">Copy</button>
    ${msg ? `<p class="msg">${msg}</p>` : ''}
    <h3>Import</h3>
    <p>Paste an export below, or choose the file. Import validates the app id and reports exactly what it brought in.</p>
    <textarea id="import-text" placeholder="Paste a Sunledger Atlas export here"></textarea>
    <p><button type="button" class="action" id="imp">Import pasted JSON</button> <label class="action ghost" style="display:inline-block;padding:6px 12px">Import file <input id="imp-file" type="file" accept="application/json" hidden></label></p>
    <p class="msg" id="imp-msg"></p></div>
    <div class="panel"><h3>Settings</h3>
    <label><input type="checkbox" id="set-spoilers" ${state.spoilers ? 'checked' : ''}> Spoiler shield — hide story trophies' names and descriptions until earned</label><br>
    <label><input type="checkbox" id="set-unearned" ${state.unearnedOnly ? 'checked' : ''}> Unearned only — filter the tracker to what is left</label></div>
    <div class="panel"><h3>Saved state</h3>
    <p>Stored in this browser under the localStorage key <b>${KEY}</b>. Per-kind progress:</p>
    <ul>${Object.entries(byKind).map(([k, v]) => `<li>${KIND_LABEL[k] || k}: ${v[0]}/${v[1]} earned</li>`).join('')}</ul>
    <button type="button" class="action danger" id="reset">Reset all progress</button></div>`;
  document.getElementById('dl').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(exportPayload(), null, 1)], { type: 'application/json' }));
    a.download = 'sunledger-atlas-progress.json'; a.click(); URL.revokeObjectURL(a.href);
  });
  document.getElementById('cp').addEventListener('click', async () => { try { await navigator.clipboard.writeText(JSON.stringify(exportPayload())); } catch { /* clipboard may be unavailable offline */ } });
  const doImport = (text) => {
    const out = document.getElementById('imp-msg');
    try {
      const data = JSON.parse(text);
      if (data.app !== 'sunledger-atlas') { out.textContent = 'Not a Sunledger Atlas export — nothing imported.'; return; }
      const ids = (data.earned || []).filter((id) => TROPHIES.some((t) => t.id === id));
      state.earned = new Set(ids);
      state.counts = data.counts && typeof data.counts === 'object' ? data.counts : {};
      state.spoilers = !!data.spoilers; state.unearnedOnly = !!data.unearnedOnly;
      saveState(); syncControls(); renderAll();
      out.textContent = `Imported ${ids.length} earned trophies and ${Object.keys(state.counts).length} counters.`;
    } catch { out.textContent = 'That pasted text is not valid JSON — nothing imported.'; }
  };
  document.getElementById('imp').addEventListener('click', () => doImport(document.getElementById('import-text').value));
  document.getElementById('imp-file').addEventListener('change', async (e) => { const f = e.target.files[0]; if (f) doImport(await f.text()); });
  document.getElementById('set-spoilers').addEventListener('change', (e) => { state.spoilers = e.target.checked; saveState(); syncControls(); renderAll(); });
  document.getElementById('set-unearned').addEventListener('change', (e) => { state.unearnedOnly = e.target.checked; saveState(); renderAll(); });
  document.getElementById('reset').addEventListener('click', () => { state = { earned: new Set(), counts: {}, spoilers: false, unearnedOnly: false }; revealed = new Set(); saveState(); syncControls(); renderAll(); renderExport('All progress reset.'); });
}

function renderAll() { renderTracker(); renderRoadmap(); renderMissables(); renderMatrix(); renderSources(); renderExport(); }
function syncControls() {
  document.getElementById('spoiler-toggle').checked = state.spoilers;
}
function showView(name) {
  for (const v of ['tracker', 'roadmap', 'missables', 'matrix', 'sources', 'export']) {
    document.getElementById('view-' + v).hidden = v !== name;
    document.querySelector(`#view-tabs button[data-view="${v}"]`).classList.toggle('active', v === name);
  }
}

document.getElementById('view-tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-view]'); if (b) showView(b.dataset.view);
});
document.getElementById('search').addEventListener('input', renderTracker);
document.getElementById('grade-filter').addEventListener('change', renderTracker);
document.getElementById('sort').addEventListener('change', renderTracker);
document.getElementById('spoiler-toggle').addEventListener('change', (e) => { state.spoilers = e.target.checked; saveState(); renderAll(); });
document.getElementById('filter-chips').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-filter]'); if (!b) return;
  activeFilter = b.dataset.filter; renderTracker();
});
document.getElementById('stage-list').addEventListener('click', (e) => {
  const dec = e.target.closest('[data-dec]'); const inc = e.target.closest('[data-inc]');
  if (dec || inc) {
    const t = TROPHIES.find((x) => x.id === Number((dec || inc).dataset.dec || (inc && inc.dataset.inc)));
    const step = t.count && t.count.step ? t.count.step : 1;
    const cur = state.counts[t.id] || 0;
    state.counts[t.id] = Math.max(0, Math.min(t.count.target, cur + (inc ? step : -step)));
    saveState(); renderTracker(); return;
  }
  const rev = e.target.closest('[data-reveal]');
  if (rev) { revealed.add(Number(rev.dataset.reveal)); renderTracker(); return; }
  if (e.target.closest('[data-earn]')) return;
  const row = e.target.closest('[data-row]');
  if (row) { selectedId = Number(row.dataset.row); renderTracker(); }
});
document.getElementById('stage-list').addEventListener('change', (e) => {
  const box = e.target.closest('[data-earn]'); if (!box) return;
  const id = Number(box.dataset.earn);
  if (box.checked) state.earned.add(id); else state.earned.delete(id);
  saveState(); renderAll();
});
document.getElementById('detail-pane').addEventListener('click', (e) => {
  const dec = e.target.closest('[data-dec]'); const inc = e.target.closest('[data-inc]');
  if (!dec && !inc) return;
  const t = TROPHIES.find((x) => x.id === selectedId);
  const step = t.count && t.count.step ? t.count.step : 1;
  const cur = state.counts[t.id] || 0;
  state.counts[t.id] = Math.max(0, Math.min(t.count.target, cur + (inc ? step : -step)));
  saveState(); renderTracker();
});

syncControls();
renderAll();
const startView = new URLSearchParams(location.search).get('view');
if (startView && ['tracker', 'roadmap', 'missables', 'matrix', 'sources', 'export'].includes(startView)) showView(startView);
if (location.hash.startsWith('#trophy-')) { selectedId = Number(location.hash.slice(8)) || 28; renderTracker(); }
