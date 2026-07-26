# levi smith — site

A minimal photography site: a name on the homepage, a gallery, and an
admin panel to manage everything without touching code.

## Structure

```
index.html              homepage
photos/index.html       gallery
config.json              all editable content: text, colors, fonts, photo list
images/                  photo files
admin/index.html         the admin panel (open this to make changes)
assets/                  shared CSS/JS used by the public pages
```

Nothing here needs a build step — it's plain HTML/CSS/JS, so it works
as-is on GitHub Pages.

## Using the admin panel

Go to `levirsmith.com/admin/` (or `/admin/` on your GitHub Pages URL).

**One-time setup — create a token:**
1. Open https://github.com/settings/personal-access-tokens/new
2. Give it a name like "site admin", set expiration to whatever you're
   comfortable with (90 days, 1 year, etc.)
3. Under "Repository access," choose **Only select repositories** and
   pick your `levirsmith.github.io` repo.
4. Under "Permissions" → "Repository permissions," set **Contents** to
   **Read and write**.
5. Generate the token and copy it.

**Connecting:**
Paste your GitHub username, the repo name (`levirsmith.github.io`), and
the token into the admin panel, then click Connect. The token is saved
only in your browser's local storage — it is never written into any
file or committed to the repo. Click "Forget token" to clear it from a
shared computer.

**Editing:**
- **Site text** — the name, tagline, gallery heading, and link labels.
- **Colors & fonts** — five colors via color pickers, and three fonts
  (display, body, caption) chosen from a curated dropdown so nothing
  breaks.
- **Photos** — drag and drop or click to upload. Images are automatically
  resized and compressed in your browser before upload. Drag list items
  to reorder; that order is what the gallery displays. Edit captions
  inline. "Remove" deletes a photo from the site.

Nothing changes on the live site until you press **Publish changes** at
the bottom. That single action commits any new/removed photos and the
updated `config.json` straight to your GitHub repo, and Pages rebuilds
automatically (usually live within a minute).

## Notes

- Fonts are limited to a curated list of Google Fonts so every
  combination is guaranteed to load and look intentional. To add more
  options, edit `assets/js/fonts.js`.
- The design's signature detail is the thin corner brackets on every
  page (like a slide mount) and the numbered, hover-revealed captions
  in the gallery (like a contact sheet) — both nod to film photography
  without leaning on clichés.
- If you ever want to revoke access, delete the token from
  https://github.com/settings/tokens — the admin panel will just fail
  to connect until you generate a new one.
