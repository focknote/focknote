---
title: Memory conventions
date: 2026-06-16T00:00:00.000Z
type: reference
tags:
  - meta
  - memory
---

# FockNote memory — how Claude uses this folder

`knowledge/` is a single OKF-style tree (Google's [Open Knowledge Format](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing) v0.1):
markdown + YAML frontmatter, one concept per file, every file carries a mandatory
`type:`. Human notes and Claude's memory share the tree, split by type folder —
visible to both (humans edit the same files in the `/admin/` CMS). Git history is
the audit log. Treat it as authoritative.

## Where memory lives

- `knowledge/reference/`, `knowledge/project/`, `knowledge/decision/`,
  `knowledge/log/` — your memory, one folder per `type`. Read and write here.
- `knowledge/reference/INDEX.md` — the **index note**: one line per important
  memory. Read this *first* to orient. Don't slurp everything — follow the index,
  then open only the notes you need.
- `knowledge/note/` — human notes. Read for context; don't overwrite unless asked.
- `index.md` and `log.md` are OKF-reserved filenames: `index.md` is a folder
  overview (progressive disclosure), `log.md` a chronological change log. Plain
  markdown, no special tooling required.

## Reading

1. Open `knowledge/reference/INDEX.md`.
2. Follow its lines (and any `[[wiki-links]]`) to the specific notes you need.
3. Only then read human notes in `knowledge/note/` if more context is required.

## Writing memory

When you learn something worth persisting, write a note in the matching
`knowledge/<type>/` folder:

- **Frontmatter** every note: `title`, `date` (ISO), `tags`, and `type` — one of
  `note`, `project`, `reference`, `decision`, `log`. `type` also picks the folder.
- **One fact / topic per note.** Keep them small so recall stays cheap.
- **Link** related notes with `[[note-slug]]` (filename without `.md`, unique
  across the whole `knowledge/` tree).
- **Update `INDEX.md`**: add/refresh a one-line pointer `- [[note-slug]] — short hook`.
  Never put note bodies in the index.
- Before creating, check `INDEX.md` for an existing note that covers it — update that
  note instead of duplicating. Delete notes that turn out wrong.

Example note `knowledge/decision/db-choice.md`:

```markdown
---
title: DB choice
date: 2026-06-16T00:00:00.000Z
type: decision
tags: [infra]
---

Use Postgres over SQLite — need concurrent writers. See [[deploy-target]].
```

## Committing (provenance)

Memory changes are visible, diffable, reversible commits. Use a distinct Claude
identity so history shows who wrote what. Commit memory edits separately from code
or human-note changes; subject like `memory: add db-choice`.
