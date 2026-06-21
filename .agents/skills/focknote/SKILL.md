---
name: focknote
description: Work with FockNote, a git-backed Markdown notebook and model memory repo. Use when Codex needs to read, write, organize, or maintain FockNote notes; set up or repair the FockNote memory bridge; update knowledge/reference model memory; preserve human notes under knowledge/note; or explain/project-manage the FockNote repository, PWA, docs, or note workflow.
---

# FockNote

## Overview

FockNote is a git-backed notebook: Markdown files are the database, Git history is the audit log, and `knowledge/` is an OKF-style tree (Google's Open Knowledge Format) where `knowledge/reference/` is model-maintained memory. Treat user notes as durable personal data and keep edits small, explicit, and provenance-friendly.

## First Read

When entering a FockNote repo:

1. Read `CLAUDE.md` if present. It defines the memory bridge.
2. Read `knowledge/reference/INDEX.md` before opening other model memory.
3. Follow only relevant `[[wiki-links]]` from the index instead of loading every note.
4. Read `knowledge/reference/MEMORY.md` before changing model memory conventions.
5. Read `README.md`, `INTERFACE.md`, or `ROADMAP.md` only when the task touches product behavior, architecture, setup, or planning.

## Notebook Layout

- `knowledge/<type>/`: one folder per OKF `type` — `note` (human notes),
  `project`, `reference`, `decision`, `log` (model-maintained memory). Every file
  carries a `type:` frontmatter field matching its folder.
- `knowledge/note/`: human notes. Read for context. Do not overwrite or reorganize unless the user asks.
- `knowledge/reference/`, `knowledge/project/`, `knowledge/decision/`, `knowledge/log/`: model-maintained memory. Update when something useful should persist across sessions.
- `knowledge/reference/INDEX.md`: one-line pointers to memory notes. Keep this as an index, not a summary dump.
- `index.md` / `log.md` are OKF-reserved filenames (folder overview / chronological history) — plain markdown, no special tooling.
- `CLAUDE.md`: bridge instruction that points agents at `knowledge/reference/`.
- `admin/`, `read/`, `index.html`, `manifest.json`, `sw.js`: app shell, editor, reader, and PWA files.

## Reading Notes

Start from indexes and filenames. Prefer `rg` for targeted searches. When the user asks about their notes, cite the note path and keep interpretation separate from source content.

Do not assume all Markdown under `knowledge/` is equal:

- Human notes (`knowledge/note/`) may be incomplete, private, or intentionally messy.
- Model memory should be concise, current, and linked.
- Frontmatter is part of the note contract and should be preserved, including `type`.

## Writing Human Notes

When asked to create or edit a human note:

1. Use Markdown in `knowledge/note/` unless the user specifies another collection.
2. Include frontmatter when creating a new note: `title`, `date` as ISO timestamp, `type: note`, and `tags`.
3. Keep filenames slug-like: lowercase words separated by hyphens.
4. Preserve existing prose and structure unless the user asks for rewriting.
5. Prefer appending or narrow edits over broad cleanup.

## Writing Model Memory

When preserving useful session knowledge:

1. Check `knowledge/reference/INDEX.md` for an existing note before creating a new one.
2. Create or update one focused note in the matching `knowledge/<type>/` folder.
3. Use frontmatter with `title`, `date`, `type`, and `tags`.
4. Use `type` values from the repo convention: `project`, `reference`, `decision`, or `log` — `type` also selects the folder.
5. Link related memory with `[[note-slug]]`.
6. Update `knowledge/reference/INDEX.md` with a one-line pointer.
7. Remove or correct stale memory when it becomes wrong.

Do not store large transcripts in memory. Store the reusable fact, decision, preference, or pointer.

## Memory Bridge Setup

When asked to add FockNote memory to another repo:

1. Add `knowledge/reference/MEMORY.md` and `knowledge/reference/INDEX.md`.
2. Add a clearly delimited block to `CLAUDE.md` or the repo's agent guidance that points to the memory folder.
3. Do not duplicate note bodies in the guidance file.
4. Make the bridge removable by keeping start/end comments around generated guidance.

Use this marker style when creating the bridge:

```markdown
<!-- focknote:memory:start -->
## FockNote memory

This repo doubles as model memory. Treat `knowledge/reference/` as the authoritative store.
Read `knowledge/reference/INDEX.md` first, then follow it.

@knowledge/reference/MEMORY.md
<!-- focknote:memory:end -->
```

## Commit Hygiene

Separate memory edits from code or human-note edits when the user asks you to commit. Use commit subjects like:

- `memory: add db-choice`
- `notes: add reading-list`
- `docs: clarify private mode`

Never commit without an explicit user request.
