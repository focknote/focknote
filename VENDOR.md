# Vendored dependencies

## Sveltia CMS

- **File:** `admin/sveltia-cms.js`
- **Package:** `@sveltia/cms`
- **Pinned version:** `0.166.3`
- **Source:** https://unpkg.com/@sveltia/cms@0.166.3/dist/sveltia-cms.js

It is vendored (committed, same-origin) on purpose:

- **Reproducible** — the notebook can't break because a CDN moved.
- **Supply-chain safe** — pinned, reviewable, no runtime third-party fetch.
- **Offline** — the service worker caches a same-origin file; a CDN URL couldn't be.

### Re-vendoring (bump the version)

```sh
# pick the latest stable
curl -s https://registry.npmjs.org/@sveltia/cms/latest | grep -o '"version":"[^"]*"'

# download it
curl -sL https://unpkg.com/@sveltia/cms@<VERSION>/dist/sveltia-cms.js -o admin/sveltia-cms.js
```

Then bump:
- the version string in this file, and
- the `CACHE` constant in `sw.js` (e.g. `focknote-v1-sveltia-<VERSION>`) so old caches evict.

The FockNote skill does all of this for you when you ask it to update.
