const DATA = window.FERN_DATA || {};
const SUBJECTS = [
  { id: "java", name: "Java", blurb: "Everything from your Java study guides, learning plan and cheat sheets, merged into one place and grouped by topic." },
  { id: "terminal", name: "Terminal", blurb: "The command line on your Mac (zsh), from the very basics to running Java, Homebrew, SSH and shell scripts." },
  { id: "git", name: "Git", blurb: "Git and GitHub from the ground up, built from the night you set up this site. Includes the real errors you hit and how you fixed them." },
  { id: "software-engineering", name: "Software Engineering", blurb: "Your CS 307 development and testing methods notes: requirements, RAD and JAD, testing, maintenance and refactoring. Each card ends with a check-yourself question." },
  { id: "cpp", name: "C++", soon: "Will be built from your C++ study guide, with side-by-side comparisons to Java." },
  { id: "javascript", name: "JavaScript", soon: "Will be built from your 10-day JavaScript crash course." },
  { id: "cybersecurity", name: "Cybersecurity", soon: "Will be built from your 12-week cybersecurity and ethical hacking course." },
  { id: "html-css", name: "HTML & CSS", soon: "No notes uploaded yet. Share some, or ask Fern to write starter guides." },
];
const TABS = [
  { id: "guide", label: "Guide" },
  { id: "reference", label: "Quick reference" },
  { id: "vocab", label: "Vocab" },
  { id: "resources", label: "Resources" },
];

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ICON_CHEV = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>';

/* ---------- theme: dark green by default, light on request ---------- */
const THEME_KEY = "fern-theme";
function setTheme(t, remember) {
  document.documentElement.setAttribute("data-fern-theme", t);
  const b = $("#theme");
  b.setAttribute("aria-pressed", t === "light");
  $(".theme-label", b).textContent = t === "light" ? "Dark mode" : "Light mode";
  if (remember) { try { localStorage.setItem(THEME_KEY, t); } catch {} }
}

/* ---------- notes and "Got it": saved in this browser ---------- */
const LOCAL_KEY = "fern-progress-v1";
const store = { state: { done: {}, notes: {} } };
function normalize(s) {
  return { done: (s && typeof s.done === "object" && s.done) || {}, notes: (s && typeof s.notes === "object" && s.notes) || {} };
}
function setStatus(text, ok) {
  $("#status-label").textContent = text;
  $("#status").classList.toggle("ok", !!ok);
  $("#status").title = text;
}
function save() {
  let ok = false;
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(store.state)); ok = true; } catch {}
  setStatus(ok ? "Saved in this browser" : "Couldn't save. Is site data blocked?", ok);
}
function initStore() {
  try { const s = JSON.parse(localStorage.getItem(LOCAL_KEY)); if (s) store.state = normalize(s); } catch {}
  setStatus("Saves in this browser", true);
}
function toggleDone(id) {
  if (store.state.done[id]) delete store.state.done[id]; else store.state.done[id] = true;
  save();
}
function setNote(id, text) {
  if (text.trim()) store.state.notes[id] = text; else delete store.state.notes[id];
  save();
}
function applyProgress() {
  document.querySelectorAll(".topic").forEach(card => {
    const id = card.dataset.id, on = !!store.state.done[id];
    card.classList.toggle("done", on);
    const b = $(".got", card);
    if (b) { b.setAttribute("aria-pressed", on); $(".got-label", b).textContent = on ? "Got it" : "Mark as got it"; }
    const ta = $("textarea", card);
    if (ta && document.activeElement !== ta) ta.value = store.state.notes[id] || "";
  });
}
function backup() {
  const blob = new Blob([JSON.stringify(store.state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "fern-notes-backup.json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  setStatus("Backup saved to Downloads", true);
}
function restore(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const s = normalize(JSON.parse(r.result));
      Object.assign(store.state.done, s.done);
      Object.assign(store.state.notes, s.notes);
      save(); applyProgress();
      setStatus("Restored " + Object.keys(s.notes).length + " notes", true);
    } catch { setStatus("That file isn't a Fern backup", false); }
  };
  r.readAsText(file);
}

/* ---------- routing ---------- */
function parseHash() {
  const h = (location.hash || "").slice(1);
  if (h === "" || h === "home") return { subject: "home", tab: "guide" };
  for (const s of SUBJECTS) {
    if (h === s.id) return { subject: s.id, tab: "guide" };
    for (const t of TABS) if (h === s.id + "-" + t.id) return { subject: s.id, tab: t.id };
  }
  return null;
}
let route = { subject: "java", tab: "guide" };
function go(r, push = true) {
  route = r;
  if (push) {
    const token = r.subject === "home" ? "home" : r.tab === "guide" ? r.subject : r.subject + "-" + r.tab;
    try { history.replaceState(null, "", "#" + token); } catch {}
  }
  render();
}

/* ---------- rendering ---------- */
function renderSubjects() {
  $("#subjects").innerHTML = SUBJECTS.map(s =>
    `<li><a href="#${s.id}" data-subject="${s.id}" ${s.id === route.subject ? 'aria-current="page"' : ""}>${esc(s.name)}${s.soon ? '<span class="soon">soon</span>' : ""}</a></li>`
  ).join("");
}

function render() {
  document.body.classList.toggle("on-cover", route.subject === "home");
  if (route.subject === "home") { renderCover(); return; }
  renderSubjects();
  const s = SUBJECTS.find(x => x.id === route.subject);
  const main = $("#main");
  const jumps = $("#jumps");
  if (s.soon || !DATA[s.id]) {
    jumps.innerHTML = ""; $("#jumps-h").hidden = true;
    main.innerHTML = `<div class="page-head"><h1>${esc(s.name)}</h1></div>
      <div class="placeholder" style="margin-top:22px"><h2>Not built yet</h2><p>${esc(s.soon || "This subject's data file didn't load.")}</p></div>`;
    return;
  }
  const d = DATA[s.id];
  main.innerHTML = `
    <div class="page-head">
      <h1>${esc(s.name)}</h1>
      <p>${esc(s.blurb)}</p>
    </div>
    <div class="tabs" role="tablist">
      ${TABS.map(t => `<a role="tab" href="#${t.id === "guide" ? s.id : s.id + "-" + t.id}" data-tab="${t.id}" aria-selected="${t.id === route.tab}">${t.label}</a>`).join("")}
    </div>
    <div id="panel" role="tabpanel"></div>`;
  const panel = $("#panel");
  $("#jumps-h").hidden = false;
  if (route.tab === "guide") renderGuide(panel, d);
  else if (route.tab === "reference") renderRef(panel, d);
  else if (route.tab === "vocab") renderVocab(panel, d);
  else renderRes(panel, d);
  applyProgress();
  applySearch();
}

function renderGuide(panel, d) {
  const total = d.units.reduce((n, u) => n + u.topics.length, 0);
  panel.innerHTML = `
    <div class="toolbar">
      <button class="btn" data-act="expand">Expand all</button>
      <button class="btn" data-act="collapse">Collapse all</button>
      <span class="hint">${total} topics · read the main idea, open a card for the details</span>
    </div>
    ${d.units.map(u => `
      <section class="unit" id="u-${u.id}" data-unit="${u.id}">
        <div class="unit-head"><h2>${esc(u.title)}</h2><p>${esc(u.blurb)}</p></div>
        <div class="topics">
          ${u.topics.map(t => `
            <article class="topic" data-id="${t.id}">
              <div class="topic-head">
                <button class="disclosure" aria-expanded="false" aria-controls="b-${t.id}">
                  ${ICON_CHEV}
                  <span class="t-title">${esc(t.title)}<span class="t-src">${esc(t.src)}</span></span>
                  <span class="t-idea">${esc(t.idea)}</span>
                </button>
                <button class="got" aria-pressed="false" data-got="${t.id}">${ICON_CHECK}<span class="got-label">Mark as got it</span></button>
              </div>
              <div class="topic-body" id="b-${t.id}" hidden>
                <div class="prose">${t.deep}</div>
                <div class="notes">
                  <label for="n-${t.id}">My notes <span>saved automatically</span></label>
                  <textarea id="n-${t.id}" data-note="${t.id}" placeholder="What clicked, what tripped you up, questions for later"></textarea>
                </div>
              </div>
            </article>`).join("")}
        </div>
      </section>`).join("")}
    <p class="empty" id="no-results" hidden>No topics match your search.</p>`;
  $("#jumps").innerHTML = d.units.map(u => `<li><a href="#u-${u.id}" data-jump="u-${u.id}">${esc(u.title)}</a></li>`).join("");
  watchUnits();
}

function renderRef(panel, d) {
  panel.innerHTML = `
    <div class="ref-jump">${d.ref.map(g => `<a href="#r-${g.id}" data-jump="r-${g.id}">${esc(g.title)}</a>`).join("")}</div>
    <div class="ref-grid">
      ${d.ref.map(g => `<section class="ref-card" id="r-${g.id}" data-text="${esc(g.title.toLowerCase() + " " + g.text)}"><h3>${esc(g.title)}</h3><div class="prose">${g.html}</div></section>`).join("")}
    </div>
    <p class="empty" id="no-results" hidden>Nothing in the quick reference matches your search.</p>`;
  $("#jumps").innerHTML = d.ref.map(g => `<li><a href="#r-${g.id}" data-jump="r-${g.id}">${esc(g.title)}</a></li>`).join("");
}

function renderVocab(panel, d) {
  const n = d.vocab.reduce((k, g) => k + g.terms.length, 0);
  panel.innerHTML = `
    <div class="toolbar"><span class="hint" style="margin-left:0">${n} terms, grouped by unit</span></div>
    ${d.vocab.map((g, i) => `
      <section class="vocab-group" id="v-${i}">
        <h2>${esc(g.title)}</h2>
        <dl class="vocab">${g.terms.map(([t, def]) => `<div data-text="${esc((t + " " + def).toLowerCase())}"><dt>${esc(t)}</dt><dd>${esc(def)}</dd></div>`).join("")}</dl>
      </section>`).join("")}
    <p class="empty" id="no-results" hidden>No terms match your search.</p>`;
  $("#jumps").innerHTML = d.vocab.map((g, i) => `<li><a href="#v-${i}" data-jump="v-${i}">${esc(g.title)}</a></li>`).join("");
}

function renderRes(panel, d) {
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
  panel.innerHTML = `
    ${d.res.map((g, i) => `
      <section class="res-group" id="s-${i}">
        <h2>${esc(g.title)}</h2>
        <ul class="res-list">${g.items.map(r => `<li data-text="${esc((r.title + " " + r.note).toLowerCase())}"><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a><span class="host">${esc(host(r.url))}</span><p>${esc(r.note)}</p></li>`).join("")}</ul>
      </section>`).join("")}
    <section class="res-group" id="s-files">
      <h2>Your source files</h2>
      <ul class="res-list">${(d.files || []).map(([name, note]) => `<li data-text="${esc((name + " " + note).toLowerCase())}"><strong>${esc(name)}</strong><p>${esc(note)}</p></li>`).join("")}</ul>
    </section>
    <p class="empty" id="no-results" hidden>No resources match your search.</p>`;
  $("#jumps").innerHTML = d.res.map((g, i) => `<li><a href="#s-${i}" data-jump="s-${i}">${esc(g.title)}</a></li>`).join("") + `<li><a href="#s-files" data-jump="s-files">Your source files</a></li>`;
}

/* ---------- cover page ---------- */
const SHORT = { java: "Study guides, learning plan and cheat sheets.", terminal: "zsh on your Mac, from basics to scripts.", git: "Built from the night you set up this site.", "software-engineering": "CS 307 methods notes, with check-yourself questions." };
function renderCover() {
  const built = SUBJECTS.filter(s => !s.soon && DATA[s.id]);
  const cards = built.reduce((n, s) => n + DATA[s.id].units.reduce((k, u) => k + u.topics.length, 0), 0);
  const units = built.reduce((n, s) => n + DATA[s.id].units.length, 0);
  $("#facts").innerHTML = [[built.length, "subjects"], [cards, "topic cards"], [units, "units"], [SUBJECTS.length - built.length, "growing next"]]
    .map(([n, l]) => `<div><b>${n}</b>${l}</div>`).join("");
  $("#toc").innerHTML = built.map(s => {
    const d = DATA[s.id], total = d.units.reduce((n, u) => n + u.topics.length, 0);
    return `<article class="toc-card"><header><h3><a href="#${s.id}" data-subject="${s.id}">${esc(s.name)}</a></h3><span class="count">${total} cards</span></header>
      <p class="about">${esc(SHORT[s.id] || "")}</p>
      <ol>${d.units.map(u => `<li><a href="#${s.id}" data-subject="${s.id}" data-unit="u-${u.id}"><span>${esc(u.title)}</span><span class="n">${u.topics.length}</span></a></li>`).join("")}</ol></article>`;
  }).join("");
  drawFern(false);
}

/* Barnsley fern: pick one of four affine maps with fixed odds, apply it, plot the point, repeat. */
const MAPS = [
  [0, 0, 0, 0.16, 0, 0, 0.01],
  [0.85, 0.04, -0.04, 0.85, 0, 1.6, 0.85],
  [0.2, -0.26, 0.23, 0.22, 0, 1.6, 0.07],
  [-0.15, 0.28, 0.26, 0.24, 0, 0.44, 0.07],
];
let fernJob = 0;
function drawFern(instant) {
  const cv = $("#fern"), box = cv.getBoundingClientRect();
  if (!box.width) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(box.width * dpr); cv.height = Math.round(box.height * dpr);
  const ctx = cv.getContext("2d"), css = getComputedStyle(document.documentElement);
  const tip = css.getPropertyValue("--frond").trim(), base = css.getPropertyValue("--frond-2").trim();
  const scale = cv.height * 0.72 / 10, ox = cv.width * 0.5 - 0.25 * scale, oy = cv.height * 0.8;
  const size = Math.max(1, dpr * 0.8), total = 60000, my = ++fernJob;
  let x = 0, y = 0, done = 0;
  const batch = n => {
    for (let i = 0; i < n && done < total; i++, done++) {
      const r = Math.random();
      let m = MAPS[0], acc = 0;
      for (const k of MAPS) { acc += k[6]; if (r <= acc) { m = k; break; } }
      const nx = m[0] * x + m[1] * y + m[4], ny = m[2] * x + m[3] * y + m[5];
      x = nx; y = ny;
      ctx.fillStyle = y > 1.2 ? tip : base;
      ctx.globalAlpha = y > 1.2 ? 0.85 : 0.6;
      ctx.fillRect(ox + x * scale, oy - y * scale, size, size);
    }
  };
  if (instant || matchMedia("(prefers-reduced-motion: reduce)").matches) { batch(total); return; }
  (function step() { if (my !== fernJob) return; batch(2500); if (done < total) requestAnimationFrame(step); })();
}

/* highlight the unit you're reading in the rail */
let unitObserver = null;
function watchUnits() {
  if (unitObserver) unitObserver.disconnect();
  if (!("IntersectionObserver" in window)) return;
  unitObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        document.querySelectorAll(".jumps a").forEach(a => a.classList.toggle("on", a.dataset.jump === e.target.id));
      }
    });
  }, { rootMargin: "-80px 0px -70% 0px" });
  document.querySelectorAll(".unit").forEach(u => unitObserver.observe(u));
}

/* ---------- search ---------- */
function applySearch() {
  const q = $("#q").value.trim().toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  const match = text => words.every(w => text.includes(w));
  let shown = 0;
  if (route.subject === "home") return;
  if (route.tab === "guide" && DATA[route.subject]) {
    const topics = {};
    DATA[route.subject].units.forEach(u => u.topics.forEach(t => topics[t.id] = (t.title + " " + t.idea + " " + t.src).toLowerCase() + " " + t.text));
    document.querySelectorAll(".topic").forEach(c => { const ok = !words.length || match(topics[c.dataset.id] + " " + (store.state.notes[c.dataset.id] || "").toLowerCase()); c.hidden = !ok; if (ok) shown++; });
    document.querySelectorAll(".unit").forEach(u => u.hidden = !u.querySelector(".topic:not([hidden])"));
  } else {
    document.querySelectorAll("[data-text]").forEach(el => { const ok = !words.length || match(el.dataset.text); el.hidden = !ok; if (ok) shown++; });
    document.querySelectorAll(".vocab-group, .res-group").forEach(g => g.hidden = !g.querySelector("[data-text]:not([hidden])"));
  }
  const nr = $("#no-results"); if (nr) nr.hidden = shown > 0;
}

/* ---------- events ---------- */
function setOpen(card, open) {
  const btn = $(".disclosure", card), body = $(".topic-body", card);
  btn.setAttribute("aria-expanded", open);
  body.hidden = !open;
}
document.addEventListener("click", e => {
  const t = e.target;
  if (t.closest("#skip")) { e.preventDefault(); const m = route.subject === "home" ? $("#cover") : $("#main"); m.focus(); m.scrollIntoView(); return; }
  if (t.closest("#theme")) { setTheme(document.documentElement.getAttribute("data-fern-theme") === "light" ? "dark" : "light", true); if (route.subject === "home") drawFern(true); return; }
  if (t.closest("[data-home]")) { e.preventDefault(); $("#q").value = ""; go({ subject: "home", tab: "guide" }); window.scrollTo(0, 0); return; }
  if (t.closest("#backup")) { backup(); return; }
  if (t.closest("#restore")) { $("#restore-file").click(); return; }
  const dis = t.closest(".disclosure");
  if (dis) { const card = dis.closest(".topic"); setOpen(card, dis.getAttribute("aria-expanded") !== "true"); return; }
  const got = t.closest("[data-got]");
  if (got) { toggleDone(got.dataset.got); applyProgress(); return; }
  const act = t.closest("[data-act]");
  if (act) { document.querySelectorAll(".topic:not([hidden])").forEach(c => setOpen(c, act.dataset.act === "expand")); return; }
  const tab = t.closest("[data-tab]");
  if (tab) { e.preventDefault(); go({ subject: route.subject, tab: tab.dataset.tab }); window.scrollTo(0, 0); return; }
  const subj = t.closest("[data-subject]");
  if (subj) {
    e.preventDefault(); $("#q").value = ""; go({ subject: subj.dataset.subject, tab: "guide" }); window.scrollTo(0, 0);
    const u = subj.dataset.unit && document.getElementById(subj.dataset.unit); if (u) u.scrollIntoView();
    return;
  }
  const jump = t.closest("[data-jump]");
  if (jump) { e.preventDefault(); const el = document.getElementById(jump.dataset.jump); if (el) el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
});
$("#restore-file").addEventListener("change", e => { const f = e.target.files[0]; if (f) restore(f); e.target.value = ""; });
let noteTimers = {};
document.addEventListener("input", e => {
  const ta = e.target.closest("[data-note]");
  if (ta) { clearTimeout(noteTimers[ta.dataset.note]); const id = ta.dataset.note; noteTimers[id] = setTimeout(() => setNote(id, ta.value), 600); return; }
  if (e.target.id === "q") applySearch();
});
window.addEventListener("hashchange", () => { const r = parseHash(); if (r) { route = r; render(); } });

/* ---------- start ---------- */
(function start() {
  let theme = "dark";
  try { theme = localStorage.getItem(THEME_KEY) || "dark"; } catch {}
  setTheme(theme, false);
  initStore();
  let r = parseHash();
  if (!r || (r.subject !== "home" && (!SUBJECTS.some(s => s.id === r.subject) || !TABS.some(t => t.id === r.tab)))) r = { subject: "home", tab: "guide" };
  route = r;
  render();
})();
let fernResize; addEventListener("resize", () => { if (route.subject !== "home") return; clearTimeout(fernResize); fernResize = setTimeout(() => drawFern(true), 150); });
