// FockNote reading view — renders your notes as clean pages.
// No build step: plain ESM + a vendored Markdown renderer. Reads notes from the
// GitHub API using the same PAT you signed into the CMS with.
import { marked } from './vendor/marked.esm.js';

marked.setOptions({ gfm: true, breaks: false });

const app = document.getElementById('app');
const API = 'https://api.github.com';

// ── Token: reuse the CMS login, fall back to our own prompt ──────────────────
function getToken() {
  try {
    const u = JSON.parse(localStorage.getItem('sveltia-cms.user') || 'null');
    if (u && u.token) return u.token;
  } catch {}
  return localStorage.getItem('focknote.token') || '';
}
function setToken(t) { localStorage.setItem('focknote.token', t); }

// ── Config: grab repo + branch from the CMS config (no YAML lib needed) ───────
async function loadConfig() {
  const res = await fetch('../admin/config.yml', { cache: 'no-cache' });
  if (!res.ok) throw new Error('config.yml not found');
  const text = await res.text();
  const repo = (text.match(/repo:\s*([^\s#]+)/) || [])[1] || '';
  const branch = (text.match(/branch:\s*([^\s#]+)/) || [])[1] || 'main';
  return { repo, branch };
}

// ── GitHub helpers ───────────────────────────────────────────────────────────
async function gh(path, token) {
  const res = await fetch(API + path, {
    headers: {
      Authorization: 'token ' + token,
      Accept: 'application/vnd.github+json',
    },
  });
  if (res.status === 401) { const e = new Error('Bad or expired token'); e.code = 401; throw e; }
  if (res.status === 404) { const e = new Error('Not found'); e.code = 404; throw e; }
  if (!res.ok) throw new Error('GitHub API ' + res.status);
  return res.json();
}

function decodeB64(b64) {
  const bin = atob((b64 || '').replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// ── Frontmatter (minimal: title / date / tags) ───────────────────────────────
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

function fmtDate(d) {
  if (!d) return '';
  const t = new Date(d);
  if (isNaN(t)) return d;
  return t.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const esc = (s) => (s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ── State ────────────────────────────────────────────────────────────────────
let CFG = null;
let TOKEN = '';

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

// ── Views ────────────────────────────────────────────────────────────────────
async function renderList() {
  showState('Loading notes…');
  const items = await gh(`/repos/${CFG.repo}/contents/content/notes?ref=${CFG.branch}`, TOKEN);
  const files = items.filter((f) => f.type === 'file' && f.name.endsWith('.md'));
  const notes = await Promise.all(files.map(async (f) => {
    const data = await gh(`/repos/${CFG.repo}/contents/${f.path}?ref=${CFG.branch}`, TOKEN);
    const n = parseNote(decodeB64(data.content));
    return { name: f.name.replace(/\.md$/, ''), ...n };
  }));
  notes.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  if (!notes.length) {
    showState('No notes yet. Create one in the CMS, then come back.', false);
    return;
  }
  app.innerHTML = `<section class="list">
    <h2>Notes</h2>
    ${notes.map((n) => `
      <a class="card" href="#/note/${encodeURIComponent(n.name)}">
        <div class="t">${esc(n.title) || n.name}</div>
        <div class="m">${[fmtDate(n.date), (n.tags || []).join(' · ')].filter(Boolean).join('  —  ')}</div>
      </a>`).join('')}
  </section>`;
}

async function renderNote(name) {
  showState('Loading…');
  const path = `content/notes/${name}.md`;
  const data = await gh(`/repos/${CFG.repo}/contents/${path}?ref=${CFG.branch}`, TOKEN);
  const n = parseNote(decodeB64(data.content));
  const chips = [];
  if (n.date) chips.push(`<span class="chip"><span class="k">📅</span> ${esc(fmtDate(n.date))}</span>`);
  (n.tags || []).forEach((t) => chips.push(`<span class="chip"><span class="k">🏷</span> ${esc(t)}</span>`));

  app.innerHTML = `<article class="note">
    <h1 class="title">${esc(n.title) || name}</h1>
    <div class="props">${chips.join('')}</div>
    <div class="body">${marked.parse(n.body || '')}</div>
  </article>
  <a class="fab" href="../admin/#/collections/notes/entries/${encodeURIComponent(name)}">✎ Edit</a>`;
  document.querySelector('.back').setAttribute('href', '#/');
}

// ── Router ───────────────────────────────────────────────────────────────────
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
