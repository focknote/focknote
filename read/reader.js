// FockNote reading + editing view.
// No build step: plain ESM + vendored Markdown renderer + HTML→MD serializer.
import { marked } from './vendor/marked.esm.js';
import TurndownService from './vendor/turndown.browser.es.js';

marked.setOptions({ gfm: true, breaks: false });
const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' });

// ── [[wiki-links]] ─────────────────────────────────────────────────────────────
// marked inline extension: [[target]] or [[target|label]] → an in-app note link.
marked.use({ extensions: [{
  name: 'wikiLink', level: 'inline',
  start(src) { const i = src.indexOf('[['); return i < 0 ? undefined : i; },
  tokenizer(src) {
    const m = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.exec(src);
    if (!m) return;
    return { type: 'wikiLink', raw: m[0], target: m[1].trim(), label: (m[2] || m[1]).trim() };
  },
  renderer(tok) {
    const name = resolveLink(tok.target);
    const cls = name ? 'wikilink' : 'wikilink broken';
    const href = name ? `#/note/${encodeURIComponent(name)}` : '#/';
    const tip = name ? '' : ` title="No note named ${esc(tok.target)}"`;
    return `<a class="${cls}" href="${href}" data-wikitarget="${esc(tok.target)}"${tip}>${esc(tok.label)}</a>`;
  },
}] });

// Turndown: serialize wiki-link anchors back to [[target]] / [[target|label]] so an
// edit→save round-trip never corrupts the link into a normal Markdown link.
td.addRule('wikilink', {
  filter: (node) => node.nodeName === 'A' && node.classList && node.classList.contains('wikilink'),
  replacement: (content, node) => {
    const target = node.getAttribute('data-wikitarget') || content;
    return content && content !== target ? `[[${target}|${content}]]` : `[[${target}]]`;
  },
});

const app = document.getElementById('app');
const API = 'https://api.github.com';

// ── Token ────────────────────────────────────────────────────────────────────
function getToken() {
  try {
    const u = JSON.parse(localStorage.getItem('sveltia-cms.user') || 'null');
    if (u && u.token) return u.token;
  } catch {}
  return localStorage.getItem('focknote.token') || '';
}
function setToken(t) { localStorage.setItem('focknote.token', t); }

// ── Config ───────────────────────────────────────────────────────────────────
async function loadConfig() {
  const res = await fetch('../admin/config.yml', { cache: 'no-cache' });
  if (!res.ok) throw new Error('config.yml not found');
  const text = await res.text();
  // Line-anchored so we match the real YAML keys, not a `repo:` mentioned in a comment.
  const repo = (text.match(/^\s*repo:\s*([^\s#]+)/m) || [])[1] || '';
  const branch = (text.match(/^\s*branch:\s*([^\s#]+)/m) || [])[1] || 'main';
  return { repo, branch };
}

// ── GitHub helpers ────────────────────────────────────────────────────────────
async function gh(path, token) {
  const res = await fetch(API + path, {
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github+json' },
  });
  if (res.status === 401) { const e = new Error('Bad or expired token'); e.code = 401; throw e; }
  if (res.status === 404) { const e = new Error('Not found'); e.code = 404; throw e; }
  if (!res.ok) throw new Error('GitHub API ' + res.status);
  return res.json();
}

async function ghPut(path, token, payload) {
  const res = await fetch(API + path, {
    method: 'PUT',
    headers: {
      Authorization: 'token ' + token,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (res.status === 401) { const e = new Error('Bad or expired token'); e.code = 401; throw e; }
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    const e = new Error('GitHub ' + res.status + (j.message ? ': ' + j.message : ''));
    e.code = res.status;
    throw e;
  }
  return res.json();
}

function decodeB64(b64) {
  const bin = atob((b64 || '').replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// ── Frontmatter ───────────────────────────────────────────────────────────────
function parseNote(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { title: '', date: '', tags: [], body: raw };
  const fm = m[1], body = m[2];
  const title = (fm.match(/^title:\s*(.+)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '') || '';
  const date = (fm.match(/^date:\s*(.+)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '') || '';
  let tags = [];
  const inline = fm.match(/^tags:\s*\[(.*)\]\s*$/m);
  if (inline) {
    tags = inline[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  } else {
    const block = fm.match(/^tags:\s*\n((?:\s*-\s*.+\n?)+)/m);
    if (block) tags = block[1].split('\n').map((l) => (l.match(/-\s*(.+)/) || [])[1]?.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  }
  return { title, date, tags, body };
}

function buildFm({ title, date, tags }) {
  const tagStr = tags.length ? `\n${tags.map((t) => `  - ${t}`).join('\n')}` : ' []';
  return `---\ntitle: "${title.replace(/"/g, '\\"')}"\ndate: "${date}"\ntags:${tagStr}\n---\n`;
}

function fmtDate(d) {
  if (!d) return '';
  const t = new Date(d);
  if (isNaN(t)) return d;
  return t.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const esc = (s) => (s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ── State ─────────────────────────────────────────────────────────────────────
let CFG = null;
let TOKEN = '';
let NOTE = null;       // current open note { name, path, sha, title, date, tags, body }
let NOTES = [];        // cache of all notes — powers search + the [[link]] graph
let LINK_INDEX = {};   // lowercased name/title → canonical note name

function resolveLink(target) {
  return LINK_INDEX[(target || '').trim().toLowerCase()] || null;
}
function wikiTargets(body) {
  const out = []; const re = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g; let m;
  while ((m = re.exec(body || ''))) out.push(m[1].trim());
  return out;
}
async function loadAllNotes() {
  const items = await gh(`/repos/${CFG.repo}/contents/content/notes?ref=${CFG.branch}`, TOKEN);
  const files = items.filter((f) => f.type === 'file' && f.name.endsWith('.md'));
  NOTES = await Promise.all(files.map(async (f) => {
    const data = await gh(`/repos/${CFG.repo}/contents/${f.path}?ref=${CFG.branch}`, TOKEN);
    return { name: f.name.replace(/\.md$/, ''), sha: data.sha, ...parseNote(decodeB64(data.content)) };
  }));
  NOTES.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  LINK_INDEX = {};
  for (const n of NOTES) {
    LINK_INDEX[n.name.toLowerCase()] = n.name;
    if (n.title) LINK_INDEX[n.title.toLowerCase()] = n.name;
  }
  return NOTES;
}
async function ensureNotes() {
  if (!NOTES.length) await loadAllNotes();
  return NOTES;
}

function showState(html, isErr) {
  app.innerHTML = `<div class="state${isErr ? ' err' : ''}">${html}</div>`;
}

function askToken() {
  showState(`Sign in to read your notes.<br><br>
    <button id="signin">Paste a GitHub token</button>`, false);
  document.getElementById('signin').onclick = () => {
    const t = prompt('GitHub personal access token (Contents: read):');
    if (t) { setToken(t.trim()); TOKEN = t.trim(); route(); }
  };
}

// ── FAB ───────────────────────────────────────────────────────────────────────
function clearFabs() {
  document.querySelectorAll('.fab, .fab-cancel').forEach((el) => el.remove());
}

function setFab(mode) {
  clearFabs();
  if (mode === 'edit') {
    const btn = document.createElement('button');
    btn.className = 'fab'; btn.textContent = '✎ Edit';
    btn.onclick = enableEdit;
    document.body.appendChild(btn);
  } else if (mode === 'save') {
    const cancel = document.createElement('button');
    cancel.className = 'fab-cancel'; cancel.textContent = '✕ Cancel';
    cancel.onclick = cancelEdit;
    const save = document.createElement('button');
    save.className = 'fab'; save.textContent = '✓ Save';
    save.onclick = saveNote;
    document.body.appendChild(cancel);
    document.body.appendChild(save);
  }
}

// ── Edit mode ─────────────────────────────────────────────────────────────────
function enableEdit() {
  const titleEl = document.querySelector('.note .title');
  const bodyEl = document.querySelector('.note .body');
  if (!titleEl || !bodyEl) return;
  titleEl.contentEditable = 'true';
  bodyEl.contentEditable = 'true';
  document.body.classList.add('editing');
  // Put cursor at end of title
  titleEl.focus();
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(titleEl);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
  setFab('save');
}

function cancelEdit() {
  if (!NOTE) return;
  const titleEl = document.querySelector('.note .title');
  const bodyEl = document.querySelector('.note .body');
  if (!titleEl || !bodyEl) return;
  titleEl.contentEditable = 'false';
  bodyEl.contentEditable = 'false';
  titleEl.textContent = NOTE.title;
  bodyEl.innerHTML = marked.parse(NOTE.body || '');
  document.body.classList.remove('editing');
  setFab('edit');
}

async function saveNote() {
  if (!NOTE || !CFG) return;
  const titleEl = document.querySelector('.note .title');
  const bodyEl = document.querySelector('.note .body');
  const saveBtn = document.querySelector('.fab');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

  const newTitle = (titleEl?.textContent || '').trim() || NOTE.title;
  const newBody = td.turndown(bodyEl?.innerHTML || '');
  const raw = buildFm({ title: newTitle, date: NOTE.date, tags: NOTE.tags }) + newBody + '\n';

  try {
    const result = await ghPut(
      `/repos/${CFG.repo}/contents/${NOTE.path}`,
      TOKEN,
      { message: `edit: ${newTitle}`, content: encodeB64(raw), sha: NOTE.sha, branch: CFG.branch }
    );
    // Update in-memory state to the committed version
    NOTE.sha = result.content.sha;
    NOTE.title = newTitle;
    NOTE.body = newBody;
    // keep the in-memory graph fresh: cached note + link index (title may have changed)
    const cached = NOTES.find((x) => x.name === NOTE.name);
    if (cached) { cached.title = newTitle; cached.body = newBody; cached.sha = NOTE.sha; }
    LINK_INDEX[NOTE.name.toLowerCase()] = NOTE.name;
    if (newTitle) LINK_INDEX[newTitle.toLowerCase()] = NOTE.name;
    titleEl.contentEditable = 'false';
    bodyEl.contentEditable = 'false';
    document.body.classList.remove('editing');
    setFab('edit');
  } catch (e) {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '✓ Save'; }
    if (e.code === 401) { askToken(); return; }
    const msg = e.code === 403
      ? 'Save failed (403) — your token needs Contents: write access.'
      : 'Save failed: ' + e.message;
    alert(msg);
  }
}

// ── Views ─────────────────────────────────────────────────────────────────────
async function renderList() {
  showState('Loading notes…');
  clearFabs();
  NOTE = null;
  await loadAllNotes();

  if (!NOTES.length) {
    showState('No notes yet. Create one in the CMS, then come back.', false);
    return;
  }
  app.innerHTML = `<section class="list">
    <div class="list-head">
      <h2>Notes</h2>
      <input class="search" type="search" placeholder="Search notes…" aria-label="Search notes" autocomplete="off">
    </div>
    <div class="cards"></div>
  </section>`;

  const cardsEl = app.querySelector('.cards');
  const searchEl = app.querySelector('.search');
  const draw = (q) => {
    const query = (q || '').trim().toLowerCase();
    const hits = !query ? NOTES : NOTES.filter((n) =>
      (n.title || '').toLowerCase().includes(query) ||
      (n.tags || []).join(' ').toLowerCase().includes(query) ||
      (n.body || '').toLowerCase().includes(query));
    cardsEl.innerHTML = hits.length
      ? hits.map((n) => `
        <a class="card" href="#/note/${encodeURIComponent(n.name)}">
          <div class="t">${esc(n.title) || n.name}</div>
          <div class="m">${[fmtDate(n.date), (n.tags || []).join(' · ')].filter(Boolean).join('  —  ')}</div>
        </a>`).join('')
      : `<div class="state">No notes match “${esc(query)}”.</div>`;
  };
  draw('');
  searchEl.addEventListener('input', () => draw(searchEl.value));
}

async function renderNote(name) {
  showState('Loading…');
  clearFabs();
  document.body.classList.remove('editing');
  const path = `content/notes/${name}.md`;
  const [data] = await Promise.all([
    gh(`/repos/${CFG.repo}/contents/${path}?ref=${CFG.branch}`, TOKEN),
    ensureNotes(), // cache + link index, so [[links]] resolve and backlinks compute
  ]);
  const n = parseNote(decodeB64(data.content));

  NOTE = { name, path, sha: data.sha, title: n.title, date: n.date, tags: n.tags, body: n.body };

  const chips = [];
  if (n.date) chips.push(`<span class="chip"><span class="k">📅</span> ${esc(fmtDate(n.date))}</span>`);
  (n.tags || []).forEach((t) => chips.push(`<span class="chip"><span class="k">🏷</span> ${esc(t)}</span>`));

  const backlinks = NOTES.filter((o) => o.name !== name && wikiTargets(o.body).some((t) => resolveLink(t) === name));
  const backlinksHtml = backlinks.length ? `
    <section class="backlinks">
      <h3>Linked from</h3>
      ${backlinks.map((o) => `<a class="backlink" href="#/note/${encodeURIComponent(o.name)}">${esc(o.title) || o.name}</a>`).join('')}
    </section>` : '';

  app.innerHTML = `<article class="note">
    <h1 class="title">${esc(n.title) || name}</h1>
    <div class="props">${chips.join('')}</div>
    <div class="body">${marked.parse(n.body || '')}</div>
    ${backlinksHtml}
  </article>`;

  document.querySelector('.back').setAttribute('href', '#/');
  setFab('edit');
}

// ── Router ────────────────────────────────────────────────────────────────────
async function route() {
  if (!CFG) {
    try { CFG = await loadConfig(); } catch (e) { showState('Could not read config.yml.', true); return; }
  }
  if (!CFG.repo || CFG.repo.includes('OWNER') || CFG.repo.includes('NOTES_REPO')) {
    showState('This notebook isn’t wired up yet — <code>repo</code> in admin/config.yml is still a placeholder.', true);
    return;
  }
  TOKEN = getToken();
  if (!TOKEN) { askToken(); return; }

  const hash = location.hash.replace(/^#\/?/, '');
  try {
    if (hash.startsWith('note/')) await renderNote(decodeURIComponent(hash.slice(5)));
    else await renderList();
  } catch (e) {
    if (e.code === 401) { askToken(); return; }
    if (e.code === 404) { showState('Notes not found. Check the repo/branch in config, and that your token can read it.', true); return; }
    showState('Error: ' + esc(e.message), true);
  }
}

addEventListener('hashchange', route);
route();
