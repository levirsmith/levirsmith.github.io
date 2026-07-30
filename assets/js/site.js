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

function frameHtml(photo, globalIndex, dateFormat) {
  const meta = metaLine(photo, dateFormat);
  return `
    <figure class="frame" data-index="${globalIndex}">
      <div class="frame-img-wrap">
        <img src="${escapeAttr(imagePath(photo.file))}" alt="${escapeAttr(photo.caption || "")}" loading="lazy">
      </div>
      <figcaption class="label">
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
function renderGallery(photos, collections, dateFormat) {
  const host = document.getElementById("gallery");
  if (!host) return [];

  if (!photos || photos.length === 0) {
    host.innerHTML = '<p class="empty-state">no photographs yet</p>';
    return [];
  }

  const defined = Array.isArray(collections) ? collections.filter(c => c && c.id) : [];
  const order = [];

  if (defined.length === 0) {
    photos.forEach(p => order.push(p));
    host.innerHTML = `<div class="grid">${
      photos.map((p, i) => frameHtml(p, i, dateFormat)).join("")
    }</div>`;
    return order;
  }

  const knownIds = new Set(defined.map(c => c.id));
  const sections = [];

  defined.forEach(col => {
    const inCol = photos.filter(p => p.collection === col.id);
    if (inCol.length === 0) return;
    sections.push({ collection: col, photos: inCol });
  });

  const loose = photos.filter(p => !p.collection || !knownIds.has(p.collection));
  if (loose.length > 0) sections.push({ collection: null, photos: loose });

  let html = "";
  sections.forEach(sec => {
    const frames = sec.photos.map(p => {
      const idx = order.length;
      order.push(p);
      return frameHtml(p, idx, dateFormat);
    }).join("");

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
  return order;
}

function setupLightbox(orderedPhotos, dateFormat, enabled) {
  const lb = document.getElementById("lightbox");
  if (!lb) return;
  if (!enabled) return;

  const lbImg = document.getElementById("lightbox-img");
  const lbCaption = document.getElementById("lightbox-caption");

  document.querySelectorAll(".frame").forEach(frame => {
    frame.addEventListener("click", () => {
      const p = orderedPhotos[Number(frame.getAttribute("data-index"))];
      if (!p) return;
      lbImg.src = imagePath(p.file);
      lbImg.alt = p.caption || "";
      const meta = metaLine(p, dateFormat);
      lbCaption.textContent = [p.caption, meta].filter(Boolean).join(" — ");
      lb.classList.add("open");
    });
  });

  const close = () => lb.classList.remove("open");
  document.getElementById("lightbox-close")?.addEventListener("click", close);
  lb.addEventListener("click", e => { if (e.target === lb) close(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
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
      const dateFormat = get(config, "theme.text.dateFormat", "monthYear");
      const ordered = renderGallery(config.photos, config.collections, dateFormat);
      setupLightbox(ordered, dateFormat, get(config, "theme.style.lightbox", true) !== false);
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
