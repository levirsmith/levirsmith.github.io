# levi smith — site

A minimal photography site: a name on the homepage, a gallery, optional
About and Contact pages, and a studio panel to manage everything without
touching code.

## Structure

```
index.html               homepage
photos/index.html        gallery
about/index.html         about page (hidden until enabled)
contact/index.html       contact page (hidden until enabled)
config.json              all editable content: text, theme, pages, collections, photos
images/                  photo files
studio/index.html        the control panel (open this to make changes)
assets/                  shared CSS/JS used by the public pages
```

Nothing here needs a build step — it's plain HTML/CSS/JS, so it works
as-is on GitHub Pages or any static host.

## Using the studio panel

Go to `levirsmith.com/studio/`.

The folder is named `studio` rather than something obvious so it isn't
stumbled across. That is a deterrent, not a lock: anyone who finds the
URL can load the page. What actually protects the site is the token —
without it the panel can read nothing and publish nothing.

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
the token into the panel, then click Connect. The token is saved only in
your browser's local storage — it is never written into any file or
committed to the repo. Click "Forget token" to clear it from a shared
computer.

## What you can change

- **Site text** — name, tagline, gallery heading and note, link labels.
- **Colors** — the five colors the whole site is built from.
- **Fonts** — any of 60+ popular Google Fonts for each of the three text
  roles (display, body, caption), each with its own weight and italic
  setting. The weight menu only ever offers weights that family actually
  ships, and italic is disabled for families without a true italic, so no
  combination can fail to load.
- **Typography** — label case, six type sizes, letter spacing, and how
  photo dates are formatted.
- **Layout** — column width, gap, photo shape, page width and padding.
- **Shape & motion** — three corner radii, border width, hover zoom,
  transition speed, corner ticks, caption placement, photo numbers, and
  whether clicking a photo opens it large.
- **About & Contact** — switch either page on, set its heading, nav label
  and text; About takes an optional portrait, Contact takes an email and
  a list of links. Both stay hidden and unlinked until enabled.
- **Collections** — group photos by place or project. Each becomes a
  titled section on the gallery page, in the order you list them. Photos
  you don't assign appear in an untitled section at the end. With no
  collections defined the gallery is a single plain grid.
- **Photos** — drag the handle to reorder; that order is what the gallery
  shows. Each photo takes a caption plus an optional collection, date and
  location. Uploads are resized and compressed in your browser first.

Nothing changes on the live site until you press **Publish changes** at
the bottom. That single action commits any new/removed photos and the
updated `config.json` straight to your GitHub repo, and the host rebuilds
automatically (usually live within a minute).

## Notes

- Every setting has a default that matches the site's original look, so a
  `config.json` written before a setting existed still renders correctly —
  and the panel only ever adds keys, it never rewrites ones you've set.
- Dates accept `2024`, `2024-03` or `2024-03-15` and are displayed in
  whichever format you pick.
- The font list lives in `assets/js/fonts.js`. Each entry records the
  weights and italics Google actually serves for that family; add to it
  only with accurate metadata, since requesting a weight a family doesn't
  have makes the whole stylesheet fail.
- The design's signature detail is the thin corner brackets on every page
  (like a slide mount) and the numbered, hover-revealed captions in the
  gallery (like a contact sheet) — both nod to film photography without
  leaning on clichés.
- If you ever want to revoke access, delete the token from
  https://github.com/settings/tokens — the panel will just fail to
  connect until you generate a new one.
