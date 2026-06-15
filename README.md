# 🍴 FockNote

**Own your fockin' notes.**

A free, installable, git-backed personal notebook — "fork your own Notion." Every note is a
Markdown file in **your** repo, which makes it two things at once: your notebook, **and** a
shared workspace + memory that you and **Claude** both read and write. Capture from anywhere —
Claude Code, Claude chat (via the GitHub connector), a clean in-app reading view, or the
in-browser [Sveltia CMS](https://sveltiacms.app/) form — and git is the whole backend. GitHub
Pages hosts the app shell. No server, no subscription, no lock-in.

> 🧠 **Notes as a shared brain.** Point Claude at the repo and it reads your notes directly;
> drop in the memory bridge (`content/agent/` + `CLAUDE.md`) and Claude curates the *best of
> your sessions* back as commits — visible, diffable, yours. See [`INTERFACE.md`](INTERFACE.md).

> 📖 **Full docs, guides & the Claude setup skill:** **https://focknote.github.io**

## Set it up in 4 steps

1. **[Use this template](../../generate)** → create your notebook repo (name it anything).
2. Open `admin/config.yml` and set `backend.repo` to the repo that holds your notes
   (a separate **private** repo for private mode; **this** repo for a public garden).
3. **Settings → Pages →** deploy from branch `main`, folder `/ (root)`.
4. Open `https://<you>.github.io/<repo>/`, tap **Install app**, **Sign in with Token**, and
   write — read your notes in the in-app `/read/` view, edit in the form, or let Claude do it.
   Saving = a git commit.

> 💡 Even faster: ask **Claude** to run the FockNote skill — it does all of the above and
> hands you the live URL. See https://focknote.github.io.

## Private or public?

- **Private (default):** this public shell repo serves only code; your notes live in a
  **separate private repo** that Pages never serves. → app public, notes private, $0.
- **Public (knowledge garden):** keep notes in this same repo, shared on purpose.

Details, token scopes, and the privacy guarantee: **https://focknote.github.io**.

## What's in here

```
index.html            landing + service-worker registration + install button
manifest.json         PWA manifest (name, icons, standalone)
sw.js                 offline cache for the app shell + vendored editor
read/                 the reading view (clean rendered notes) + vendored marked
admin/                form editor: Sveltia config + vendored, pinned bundle
content/              your notes (Markdown) + media; content/agent/ = Claude memory
assets/icons/         app icons
CLAUDE.md             memory bridge — points Claude at content/agent/
VENDOR.md             pinned Sveltia version + how to update
```

## License

[MIT](LICENSE). The vendored Sveltia CMS bundle is © its authors under its own license.
