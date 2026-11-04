// Loads config.json and applies it to whichever page includes this script.
// Pages declare their folder depth via <body data-depth>, and mark themselves
// with data-page so this one file can serve home, gallery, about and contact.

// Reads a nested value, falling back when the key is absent. Every setting the
// studio can write is read through this, so an older config.json (or one saved
// before a setting existed) still renders correctly.
function get(obj, path, fallback) {
  const val = path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
  return val === undefined || val === null || val === "" ? fallback : val;
}

function depth() {
  return Number(document.body.dataset.depth || 0);
}

function upPrefix() {
  return "../".repeat(depth());
}

function configPath() {
  return upPrefix() + "config.json";
}

function imagePath(file) {
  return upPrefix() + "images/" + file;
}

async function loadConfig() {
  const res = await fetch(configPath());
  if (!res.ok) throw new Error("could not load config.json");
  return res.json();
}

// ---------- theme ----------

function applyTheme(theme) {
  const s = document.documentElement.style;
  const set = (prop, val) => { if (val !== undefined && val !== null && val !== "") s.setProperty(prop, val); };

  set("--color-bg", get(theme, "colors.background"));
  set("--color-text", get(theme, "colors.text"));
  set("--color-muted", get(theme, "colors.muted"));
  set("--color-accent", get(theme, "colors.accent"));
  set("--color-border", get(theme, "colors.border"));

  const display = get(theme, "fonts.display", "Fraunces");
  const body = get(theme, "fonts.body", "Inter");
  const mono = get(theme, "fonts.mono", "IBM Plex Mono");

  set("--font-display", fontStack(display));
  set("--font-body", fontStack(body));
  set("--font-mono", fontStack(mono));

  // Weight and italic default to the site's original look when unset.
  const dW = nearestWeight(display, Number(get(theme, "fonts.displayWeight", 500)));
  const bW = nearestWeight(body, Number(get(theme, "fonts.bodyWeight", 400)));
  const mW = nearestWeight(mono, Number(get(theme, "fonts.monoWeight", 400)));
  const dI = get(theme, "fonts.displayItalic", true) === true && supportsItalic(display);
  const bI = get(theme, "fonts.bodyItalic", false) === true && supportsItalic(body);
  const mI = get(theme, "fonts.monoItalic", false) === true && supportsItalic(mono);

  set("--weight-display", dW);
  set("--weight-body", bW);
  set("--weight-mono", mW);
  set("--style-display", dI ? "italic" : "normal");
  set("--style-body", bI ? "italic" : "normal");
  set("--style-mono", mI ? "italic" : "normal");

  set("--label-case", get(theme, "text.labelCase", "none"));
  set("--size-name", px(get(theme, "text.nameSize"), "rem"));
  set("--size-tagline", px(get(theme, "text.taglineSize"), "rem"));
  set("--size-gtitle", px(get(theme, "text.galleryTitleSize"), "rem"));
  set("--size-label", px(get(theme, "text.labelSize"), "rem"));
  set("--size-caption", px(get(theme, "text.captionSize"), "rem"));
  set("--size-body", px(get(theme, "text.bodySize"), "rem"));
  set("--ls-label", px(get(theme, "text.labelTracking"), "em"));
  set("--ls-heading", px(get(theme, "text.headingTracking"), "em"));

  set("--grid-min", px(get(theme, "layout.gridMinWidth"), "px"));
  set("--grid-gap", px(get(theme, "layout.gridGap"), "px"));
  set("--frame-aspect", get(theme, "layout.aspectRatio"));
  set("--gallery-pad-y", px(get(theme, "layout.pagePaddingTop"), "rem"));
  set("--gallery-pad-x", px(get(theme, "layout.pagePaddingSide"), "vw"));
  const maxW = Number(get(theme, "layout.maxWidth", 0));
  set("--page-max", maxW > 0 ? `${maxW}px` : "none");

  set("--radius-grid", px(get(theme, "style.radiusGrid"), "px"));
  set("--radius-frame", px(get(theme, "style.radiusFrame"), "px"));
  set("--radius-image", px(get(theme, "style.radiusImage"), "px"));
  set("--border-width", px(get(theme, "style.borderWidth"), "px"));
  set("--hover-zoom", get(theme, "style.hoverZoom"));
  set("--transition", px(get(theme, "style.transitionSpeed"), "s"));
  set("--corner-size", px(get(theme, "style.cornerSize"), "px"));
  set("--corner-display", get(theme, "style.showCorners", true) === false ? "none" : "block");

  document.body.dataset.captionMode = get(theme, "style.captionMode", "hover");
  document.body.dataset.showNumbers = String(get(theme, "style.showNumbers", true) !== false);
  document.body.dataset.lightbox = get(theme, "style.lightbox", true) === false ? "off" : "on";

  loadGoogleFonts([
    { family: display, weight: dW, italic: dI },
    { family: body, weight: bW, italic: bI },
    { family: mono, weight: mW, italic: mI }
  ]);
}

// Appends a unit to a bare number; passes through values that already have one.
function px(val, unit) {
  if (val === undefined || val === null || val === "") return undefined;
  return typeof val === "number" || /^-?[\d.]+$/.test(String(val)) ? `${val}${unit}` : String(val);
}

// ---------- text ----------

function fillFields(site) {
  document.querySelectorAll("[data-field]").forEach(el => {
    const key = el.getAttribute("data-field");
    if (site[key] != null) el.textContent = site[key];
  });
  const title = document.querySelector("title");
  if (title && site.name) {
    title.textContent = title.dataset.suffix
      ? `${site.name} — ${title.dataset.suffix}`
      : site.name;
  }
}

// Nav links appear only for pages that are switched on in the studio.
function renderNav(pages) {
  const nav = document.getElementById("site-nav");
  if (!nav) return;
  const here = document.body.dataset.page;
  const items = [];

  if (get(pages, "about.enabled", false) === true && here !== "about") {
    items.push({ href: upPrefix() + "about/", label: get(pages, "about.navLabel", "about") });
  }
  if (get(pages, "contact.enabled", false) === true && here !== "contact") {
    items.push({ href: upPrefix() + "contact/", label: get(pages, "contact.navLabel", "contact") });
  }

  if (items.length === 0) { nav.hidden = true; return; }
  nav.hidden = false;
  nav.innerHTML = items
    .map(i => `<a href="${escapeAttr(i.href)}">${escapeHtml(i.label)}</a>`)
    .join("");
}

// ---------- photo meta ----------

// Parsed from the parts rather than through Date(string) so a YYYY-MM-DD value
// is not shifted a day backwards in timezones behind UTC.
function formatDate(value, format) {
  if (!value) return "";
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(String(value).trim());
  if (!m) return String(value);
  const [, y, mo, d] = m;
  const months = ["january","february","march","april","may","june",
                  "july","august","september","october","november","december"];
  const monthName = mo ? months[Number(mo) - 1] : "";

  switch (format) {
    case "year": return y;
    case "full": return d && monthName ? `${monthName} ${Number(d)}, ${y}` : (monthName ? `${monthName} ${y}` : y);
    case "numeric": return [y, mo, d].filter(Boolean).join("-");
    case "monthYear":
    default: return monthName ? `${monthName} ${y}` : y;
  }
}

function metaLine(photo, dateFormat) {
  return [photo.location, formatDate(photo.date, dateFormat)]
    .filter(Boolean)
    .join(" · ");
}

// ---------- gallery ----------

// The notice lives inside the caption bar but sits just above its top edge, so
// it rests at the photo's bottom-right corner while the bar is hidden, and rides
// up with the bar when it slides in instead of being covered by it.
//
// Photos marked `stamped` already carry the notice in their pixels. The grid
// tile usually crops that corner off, so the on-page notice stays as a stand-in
// and is only removed where the stamp itself shows (see hideOverlayWhereStampShows).
function frameHtml(photo, globalIndex, opts) {
  const meta = metaLine(photo, opts.dateFormat);
  return `
    <figure class="frame" data-index="${globalIndex}"${photo.stamped ? " data-stamped" : ""}>
      <div class="frame-img-wrap">
        <img src="${escapeAttr(imagePath(photo.file))}" alt="${escapeAttr(photo.caption || "")}" loading="lazy">
      </div>
      <figcaption class="label">
        ${opts.copyright ? `<span class="copyright" aria-hidden="true">${escapeHtml(opts.copyright)}</span>` : ""}
        <span class="label-main">
          <span class="cap">${escapeHtml(photo.caption || "")}</span>
          ${meta ? `<span class="meta">${escapeHtml(meta)}</span>` : ""}
        </span>
        <span class="n">${String(globalIndex + 1).padStart(2, "0")}</span>
      </figcaption>
    </figure>`;
}

// Photos keep their config order. When collections exist they are rendered as
// titled sections in the order the collections are defined, with anything
// unassigned trailing in an untitled section. With no collections defined the
// result is a single plain grid, exactly as before collections existed.
//
// Returns the photos in render order plus the groups the lightbox steps through:
// one per section, or a single group for the plain grid.
function renderGallery(photos, collections, opts) {
  const host = document.getElementById("gallery");
  const none = { order: [], groups: [] };
  if (!host) return none;

  if (!photos || photos.length === 0) {
    host.innerHTML = '<p class="empty-state">no photographs yet</p>';
    return none;
  }

  const defined = Array.isArray(collections) ? collections.filter(c => c && c.id) : [];
  const sections = [];

  if (defined.length === 0) {
    sections.push({ collection: null, photos: photos.slice() });
  } else {
    const knownIds = new Set(defined.map(c => c.id));
    defined.forEach(col => {
      const inCol = photos.filter(p => p.collection === col.id);
      if (inCol.length) sections.push({ collection: col, photos: inCol });
    });
    const loose = photos.filter(p => !p.collection || !knownIds.has(p.collection));
    if (loose.length) sections.push({ collection: null, photos: loose });
  }

  const order = [];
  const groups = [];
  let html = "";

  sections.forEach(sec => {
    const indices = [];
    const frames = sec.photos.map(p => {
      const idx = order.length;
      order.push(p);
      indices.push(idx);
      return frameHtml(p, idx, opts);
    }).join("");

    groups.push({
      title: sec.collection ? (sec.collection.title || sec.collection.id) : "",
      indices
    });

    if (defined.length === 0) {
      html += `<div class="grid">${frames}</div>`;
      return;
    }

    const head = sec.collection
      ? `<header class="collection-head">
           <h2 class="c-title">${escapeHtml(sec.collection.title || sec.collection.id)}</h2>
           ${sec.collection.description
             ? `<p class="c-desc">${escapeHtml(sec.collection.description)}</p>` : ""}
         </header>`
      : "";

    html += `<section class="collection">${head}<div class="grid">${frames}</div></section>`;
  });

  host.innerHTML = html;
  hideOverlayWhereStampShows(host);
  return { order, groups };
}

// The tile's width ÷ height from the photo-shape setting, or null for
// "original proportions", where the whole photo — stamp included — is shown.
function tileAspect() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--frame-aspect").trim();
  const m = /^([\d.]+)\s*\/\s*([\d.]+)$/.exec(v);
  return m ? Number(m[1]) / Number(m[2]) : null;
}

// A tile whose shape is within a few percent of the photo's own crops almost
// nothing, so the stamped corner is visible and a second notice would double it.
function hideOverlayWhereStampShows(host) {
  const tile = tileAspect();
  host.querySelectorAll(".frame[data-stamped]").forEach(frame => {
    const img = frame.querySelector("img");
    const check = () => {
      if (!img.naturalWidth) return;
      const own = img.naturalWidth / img.naturalHeight;
      const stampShows = tile === null || Math.abs(own - tile) / tile < 0.04;
      frame.classList.toggle("stamp-visible", stampShows);
    };
    if (img.complete) check();
    else img.addEventListener("load", check, { once: true });
  });
}

// Right-click "Save image", dragging a photo out to the desktop, and the
// long-press save sheet on phones are all switched off for photos. This only
// slows casual copying — the stamp in the file is what actually travels.
function protectPhotos() {
  const isPhoto = el => el instanceof Element && el.closest(".frame, .lightbox-stage");
  document.addEventListener("contextmenu", e => { if (isPhoto(e.target)) e.preventDefault(); });
  document.addEventListener("dragstart", e => { if (isPhoto(e.target)) e.preventDefault(); });
}

// Arrows, arrow keys and swipes move through the collection the opened photo
// belongs to and stop at either end; they never cross into another collection.
// The arrow pointing past an end is greyed out rather than hidden, so the
// buttons stay put while you click through.
function setupLightbox(order, groups, opts) {
  const lb = document.getElementById("lightbox");
  if (!lb || !opts.enabled) return;

  const img = document.getElementById("lightbox-img");
  const caption = document.getElementById("lightbox-caption");
  const counter = document.getElementById("lightbox-counter");
  const prev = document.getElementById("lightbox-prev");
  const next = document.getElementById("lightbox-next");
  const closeBtn = document.getElementById("lightbox-close");
  const copy = document.getElementById("lightbox-copyright");

  if (copy) {
    copy.textContent = opts.copyright || "";
    copy.hidden = !opts.copyright;
  }

  const groupOf = [];
  groups.forEach((g, gi) => g.indices.forEach(i => { groupOf[i] = gi; }));

  let current = -1;
  let returnFocus = null;

  const isOpen = () => lb.classList.contains("open");

  // The photo `delta` steps away within the same collection, or null past an end.
  function neighbour(i, delta) {
    const ids = groups[groupOf[i]].indices;
    const target = ids.indexOf(i) + delta;
    return target >= 0 && target < ids.length ? ids[target] : null;
  }

  // Never leave focus on an arrow that just became disabled — the keyboard
  // user would otherwise be dropped back to the top of the page.
  function focusUsableControl() {
    const target = [next, prev].find(b => !b.hidden && !b.disabled) || closeBtn;
    target.focus({ preventScroll: true });
  }

  function show(i) {
    const p = order[i];
    if (!p) return;
    current = i;

    const g = groups[groupOf[i]];
    const pos = g.indices.indexOf(i);
    const multi = g.indices.length > 1;

    img.src = imagePath(p.file);
    img.alt = p.caption || "";
    // Here the whole photo is shown, so a stamped one already displays its notice.
    if (copy) copy.hidden = !opts.copyright || p.stamped === true;
    caption.textContent = [p.caption, metaLine(p, opts.dateFormat)].filter(Boolean).join(" — ");
    counter.textContent = multi
      ? [g.title, `${pos + 1} / ${g.indices.length}`].filter(Boolean).join(" · ")
      : g.title;
    const focusedArrow = document.activeElement === prev || document.activeElement === next
      ? document.activeElement : null;

    prev.hidden = !multi;
    next.hidden = !multi;
    prev.disabled = pos === 0;
    next.disabled = pos === g.indices.length - 1;

    if (focusedArrow && focusedArrow.disabled) focusUsableControl();

    // Fetch the neighbours now so stepping through doesn't wait on the network.
    [-1, 1].forEach(d => {
      const n = neighbour(i, d);
      if (n !== null) new Image().src = imagePath(order[n].file);
    });
  }

  function open(i) {
    returnFocus = document.activeElement;
    show(i);
    lb.classList.add("open");
    document.documentElement.classList.add("lightbox-open");
    focusUsableControl();
  }

  function close() {
    if (!isOpen()) return;
    lb.classList.remove("open");
    document.documentElement.classList.remove("lightbox-open");
    current = -1;
    if (returnFocus && typeof returnFocus.focus === "function") returnFocus.focus({ preventScroll: true });
  }

  const step = delta => {
    if (current < 0) return;
    const n = neighbour(current, delta);
    if (n !== null) show(n);
  };

  document.querySelectorAll(".frame").forEach(frame => {
    frame.addEventListener("click", () => open(Number(frame.dataset.index)));
  });

  prev.addEventListener("click", () => step(-1));
  next.addEventListener("click", () => step(1));
  closeBtn.addEventListener("click", close);
  lb.addEventListener("click", e => { if (e.target === lb) close(); });

  document.addEventListener("keydown", e => {
    if (!isOpen()) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
  });

  // A mostly-horizontal swipe of 50px or more steps; anything else is ignored
  // so a vertical drag or a tap doesn't change the photo.
  let startX = null;
  let startY = null;
  lb.addEventListener("touchstart", e => {
    if (e.touches.length !== 1) { startX = null; return; }
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  lb.addEventListener("touchend", e => {
    if (startX === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    startX = null;
    if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  }, { passive: true });
}

// Empty when switched off. Without custom text it falls back to "© <name>",
// so it follows the site name if that changes.
function copyrightText(config) {
  if (get(config, "theme.style.showCopyright", true) === false) return "";
  const custom = String(get(config, "site.copyright", "")).trim();
  if (custom) return custom;
  const name = get(config, "site.name", "");
  return name ? `© ${name}` : "";
}

// ---------- about / contact ----------

// Blank lines separate paragraphs; the text itself is escaped, never injected.
function paragraphs(text) {
  return String(text || "")
    .split(/\n\s*\n/)
    .map(t => t.trim())
    .filter(Boolean)
    .map(t => `<p>${escapeHtml(t).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function renderAbout(page) {
  const titleEl = document.getElementById("page-title");
  const bodyEl = document.getElementById("page-body");
  if (titleEl) titleEl.textContent = get(page, "title", "about");
  if (!bodyEl) return;

  const portrait = get(page, "portrait", "");
  const img = portrait
    ? `<img class="portrait" src="${escapeAttr(imagePath(portrait))}" alt="">`
    : "";
  bodyEl.innerHTML = img + paragraphs(get(page, "body", ""));
}

function renderContact(page) {
  const titleEl = document.getElementById("page-title");
  const bodyEl = document.getElementById("page-body");
  if (titleEl) titleEl.textContent = get(page, "title", "contact");
  if (!bodyEl) return;

  let html = paragraphs(get(page, "intro", ""));

  const email = get(page, "email", "");
  if (email) {
    html += `<a class="contact-email" href="mailto:${escapeAttr(email)}">${escapeHtml(email)}</a>`;
  }

  const links = Array.isArray(page && page.links) ? page.links.filter(l => l && l.url) : [];
  if (links.length) {
    html += `<ul class="contact-links">${
      links.map(l =>
        `<li><a href="${escapeAttr(l.url)}" target="_blank" rel="noopener noreferrer">${
          escapeHtml(l.label || l.url)
        }</a></li>`
      ).join("")
    }</ul>`;
  }

  bodyEl.innerHTML = html;
}

// ---------- helpers ----------

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ---------- init ----------

(async function init() {
  try {
    const config = await loadConfig();
    const page = document.body.dataset.page;
    const pages = config.pages || {};

    applyTheme(config.theme || {});
    fillFields(config.site || {});
    renderNav(pages);

    if (page === "gallery") {
      const opts = {
        dateFormat: get(config, "theme.text.dateFormat", "monthYear"),
        copyright: copyrightText(config),
        enabled: get(config, "theme.style.lightbox", true) !== false
      };
      const { order, groups } = renderGallery(config.photos, config.collections, opts);
      setupLightbox(order, groups, opts);
      protectPhotos();
    }

    // A disabled about/contact page still exists as a file, so send visitors home
    // rather than showing them an empty shell.
    if (page === "about" || page === "contact") {
      if (get(pages, `${page}.enabled`, false) !== true) {
        location.replace(upPrefix() || "./");
        return;
      }
      if (page === "about") renderAbout(pages.about);
      else renderContact(pages.contact);
      document.body.hidden = false;
    }
  } catch (err) {
    console.error(err);
  }
})();
