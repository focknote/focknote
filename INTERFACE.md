# FockNote as a Model↔Human Interface

The companion to `ROADMAP.md`. The roadmap covers the **human UI** (reading +
editing). This covers the bigger idea: FockNote as a **Notion replacement where
the same Markdown is the shared workspace and memory for both you and Claude** —
built entirely on top of GitHub's existing integrations, so there's nothing
bespoke to install.

## Thesis

Notion is a proprietary store with an API you must wire up. FockNote's store is
**a git repo**, and git/GitHub is *already* a first-class integration across the
Claude ecosystem. So the model can read and write your notes through plumbing
that already exists — no custom backend, no Worker, no OAuth app, no MCP server
to stand up. Connect GitHub once and you're done. (For the nerdy Irish: own your
fockin' notes *and* your fockin' memory.)

## The interaction model (Path A — git-native)

Markdown files in the notes repo are the single source of truth. Every surface
reads or writes those same files; git history is the audit log.

### Read — everywhere, including chat
- **claude.ai chat + GitHub connector** — point it at the notes repo and ask
  Claude about your notes directly in a conversation. No export, no copy-paste.
- **Web / PWA `/read/`** — the human-facing rendered view (Phase 1).
- **Any Claude Code session** — reads files directly from a clone.

### Write — from any Claude surface, or by hand
- **Local Claude Code** — edit `.md`, commit.
- **Remote / web Claude Code (cloud)** — same, from anywhere.
- **"Cowork" / Claude-in-browser coding** — commits via GitHub.
- **Sveltia `/admin/`** and the future **in-place editor** (Phase 2) — direct
  human editing.

All of these land the same `.md` with the same frontmatter, so they coexist
(see `ROADMAP.md` → "Sveltia is not removed").

### Memory — notes are the shared brain
The notebook doubles as project memory, curated like Notion pages but in git:
- The model reads project context from the notes (not just a hidden store).
- The model writes updates back as commits — visible, diffable, reversible.
- **You** can see, edit, or delete anything the model "knows," in the same app.

## Why "no setup" (and the honest asterisks)

What you avoid vs a typical Notion-style integration: a custom API backend, a
Cloudflare Worker, an OAuth app, a hosted MCP server. What you still do **once**:
connect GitHub to Claude and grant access to the (possibly private) notes repo.
That's the whole setup.

Honest limits to design around:
- **claude.ai's GitHub connector is read-only.** Chat can *read* notes; *writing*
  goes through Claude Code (local/web) or the web editors. The split "read in
  chat, write from code" is intentional and fine.
- **Private notes repo** needs the connector/token to have access — the one
  permission step.
- **Token-efficient recall** matters: with many notes the model shouldn't slurp
  everything. Lean on conventions below so recall is cheap.

## Conventions (so the model uses it well)

- **Index note** — a top-level `MEMORY`/`INDEX` note: one line per important note,
  so the model orients without reading the whole repo first.
- **Frontmatter** — `title`, `date`, `tags`; add `type` (e.g. `project`,
  `reference`, `decision`, `log`) so notes are retrievable by kind.
- **`[[wiki-links]]`** — a backlink graph (Phase 3) the model can traverse.
- **A dedicated collection** (e.g. `content/agent/` or `memory/`) for
  model-maintained notes, kept distinct from human notes but visible to both.
- **Provenance via git identity** — human commits and Claude's commits use
  distinct identities (the dual-identity rig in `ROADMAP.md`), so the history
  shows who wrote what.

## Optional bridge to Claude Code's built-in memory

Claude Code's own project memory lives at a fixed hidden path the harness loads
each session; it can't simply be redirected into this repo. To unify, two
lightweight options (neither is automatic):
- A `CLAUDE.md`/hook instruction telling Claude to treat the notebook's
  `agent/`/`memory/` collection as authoritative when working in the repo.
- A small sync that mirrors the hidden memory into the notebook (so it becomes
  human-visible notes) and back.

## Build order

1. Path A works **today** with no new code — start using the repo as the shared
   store and codify the conventions above.
2. Phase 1 `/read/` gives the human read view (built).
3. Phase 2 in-place editor — and it should write notes that honor these
   conventions (frontmatter `type`, links).
4. Later: a FockNote MCP (Path B) to add *write* from chat and other non-Code
   surfaces; the memory bridge (Path C) as a convention/hook.
