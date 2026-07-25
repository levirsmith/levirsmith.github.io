// Loads config.json and applies it to whichever page includes this script.
// Elements are matched by data-config attributes so the same file serves
// both index.html and photos/index.html.

async function loadConfig() {
  const res = await fetch(configPath());
  if (!res.ok) throw new Error("could not load config.json");
  return res.json();
}

function configPath() {
  // photos/index.html lives one folder deeper than index.html
  const inGallery = location.pathname.replace(/\/$/, "").endsWith("/photos");
  return inGallery ? "../config.json" : "config.json";
}

function imagePath(file) {
  const inGallery = location.pathname.replace(/\/$/, "").endsWith("/photos");
  return (inGallery ? "../images/" : "images/") + file;
}

function applyTheme(theme) {
  const root = document.documentElement.style;
  root.setProperty("--color-bg", theme.colors.background);
  root.setProperty("--color-text", theme.colors.text);
  root.setProperty("--color-muted", theme.colors.muted);
  root.setProperty("--color-accent", theme.colors.accent);
  root.setProperty("--color-border", theme.colors.border);
  root.setProperty("--font-display", `"${theme.fonts.display}", serif`);
  root.setProperty("--font-body", `"${theme.fonts.body}", sans-serif`);
  root.setProperty("--font-mono", `"${theme.fonts.mono}", monospace`);
  loadGoogleFonts([theme.fonts.display, theme.fonts.body, theme.fonts.mono]);
}

function applyText() {
  document.querySelectorAll("[data-config]").forEach(el => {
    // placeholder — filled per-page below
  });
}

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

function renderGallery(photos) {
  const grid = document.getElementById("grid");
  if (!grid) return;

  if (!photos || photos.length === 0) {
    grid.outerHTML = '<p class="empty-state">no photographs yet</p>';
    return;
  }

  grid.innerHTML = photos
    .map((p, i) => `
      <figure class="frame" data-index="${i}">
        <div class="frame-img-wrap">
          <img src="${imagePath(p.file)}" alt="${escapeHtml(p.caption || "")}" loading="lazy">
        </div>
        <figcaption class="label">
          <span>${escapeHtml(p.caption || "")}</span>
          <span class="n">${String(i + 1).padStart(2, "0")}</span>
        </figcaption>
      </figure>
    `)
    .join("");

  setupLightbox(photos);
}

function setupLightbox(photos) {
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lightbox-img");
  const lbCaption = document.getElementById("lightbox-caption");
  if (!lb) return;

  document.querySelectorAll(".frame").forEach(frame => {
    frame.addEventListener("click", () => {
      const i = Number(frame.getAttribute("data-index"));
      const p = photos[i];
      lbImg.src = imagePath(p.file);
      lbImg.alt = p.caption || "";
      lbCaption.textContent = p.caption || "";
      lb.classList.add("open");
    });
  });

  const close = () => lb.classList.remove("open");
  document.getElementById("lightbox-close")?.addEventListener("click", close);
  lb.addEventListener("click", e => { if (e.target === lb) close(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

(async function init() {
  try {
    const config = await loadConfig();
    applyTheme(config.theme);
    fillFields(config.site);
    if (document.getElementById("grid")) {
      renderGallery(config.photos);
    }
  } catch (err) {
    console.error(err);
  }
})();
