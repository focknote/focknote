# 🍴 FockNote

**Own your fockin' notes.**

A free, installable, git-backed personal notebook — "fork your own Notion." Every note is a
Markdown file committed to **your** repo. The editor ([Sveltia CMS](https://sveltiacms.app/))
runs in your browser; GitHub Pages hosts this app shell; git is the whole backend. No server,
no subscription, no lock-in.

> 📖 **Full docs, guides & the Claude setup skill:** **https://focknote.github.io**

## Set it up in 4 steps

1. **[Use this template](../../generate)** → create your notebook repo (name it anything).
2. Open `admin/config.yml` and set `backend.repo` to the repo that holds your notes
   (a separate **private** repo for private mode; **this** repo for a public garden).
3. **Settings → Pages →** deploy from branch `main`, folder `/ (root)`.
4. Open `https://<you>.github.io/<repo>/`, tap **Install app**, open the editor,
   **Sign in with Token**, and write. Saving = a git commit.

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
admin/                the editor: Sveltia config + vendored, pinned bundle
assets/icons/         app icons
content/              your notes (Markdown) + media — public-mode default seed
VENDOR.md             pinned Sveltia version + how to update
```

## License

[MIT](LICENSE). The vendored Sveltia CMS bundle is © its authors under its own license.
