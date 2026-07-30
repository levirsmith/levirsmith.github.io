const LS_KEY = "site-admin-credentials";

let creds = { owner: "", repo: "", branch: "main", token: "" };
let configSha = null;

// The whole config object as loaded from the repo. Edits are made in place so
// any key this panel doesn't know about survives a publish untouched.
let config = {};
let photos = []; // {file, caption, collection, date, location, status, dataUrl, _base64}

// The weight/italic you actually asked for, per role, kept apart from what gets
// saved. Trying a font that only ships one weight would otherwise overwrite the
// choice, and switching back would silently leave you on the wrong setting.
let roleIntent = {};

const $ = sel => document.querySelector(sel);

// Defaults are only ever used to fill in keys that are absent. They match the
// site's existing appearance exactly, so adding them changes nothing visually.
const DEFAULTS = {
  site: {
    name: "", tagline: "", galleryTitle: "", galleryNote: "",
    enterLabel: "", homeLabel: ""
  },
  theme: {
    colors: { background: "#f6f4ee", text: "#1c1b18", muted: "#8a8577", accent: "#5c6b52", border: "#dcd8cb" },
    fonts: {
      display: "Fraunces", body: "Inter", mono: "IBM Plex Mono",
      displayWeight: 500, displayItalic: true,
      bodyWeight: 400, bodyItalic: false,
      monoWeight: 400, monoItalic: false
    },
    text: {
      labelCase: "none", dateFormat: "monthYear",
      nameSize: 4.5, taglineSize: 0.8, galleryTitleSize: 3,
      labelSize: 0.75, captionSize: 0.68, bodySize: 1,
      labelTracking: 0.18, headingTracking: -0.01
    },
    layout: {
      gridMinWidth: 260, gridGap: 2, aspectRatio: "4 / 5",
      maxWidth: 0, pagePaddingTop: 6, pagePaddingSide: 6
    },
    style: {
      radiusGrid: 12, radiusFrame: 8, radiusImage: 8, borderWidth: 1,
      hoverZoom: 1.04, transitionSpeed: 0.6, cornerSize: 18, showCorners: true,
      captionMode: "hover", showNumbers: true, lightbox: true
    }
  },
  pages: {
    about: { enabled: false, navLabel: "about", title: "about", body: "", portrait: "" },
    contact: { enabled: false, navLabel: "contact", title: "contact", intro: "", email: "", links: [] }
  },
  collections: []
};

// Maps a form control to a place in the config. One table drives both reading
// and writing, so a field can never be populated from one key and saved to another.
const BINDINGS = [
  ["f-name", "site.name", "text"],
  ["f-tagline", "site.tagline", "text"],
  ["f-galleryTitle", "site.galleryTitle", "text"],
  ["f-galleryNote", "site.galleryNote", "text"],
  ["f-enterLabel", "site.enterLabel", "text"],
  ["f-homeLabel", "site.homeLabel", "text"],

  ["c-background", "theme.colors.background", "text"],
  ["c-text", "theme.colors.text", "text"],
  ["c-muted", "theme.colors.muted", "text"],
  ["c-accent", "theme.colors.accent", "text"],
  ["c-border", "theme.colors.border", "text"],

  ["f-label-case", "theme.text.labelCase", "text"],
  ["f-date-format", "theme.text.dateFormat", "text"],
  ["f-size-name", "theme.text.nameSize", "number"],
  ["f-size-tagline", "theme.text.taglineSize", "number"],
  ["f-size-gtitle", "theme.text.galleryTitleSize", "number"],
  ["f-size-label", "theme.text.labelSize", "number"],
  ["f-size-caption", "theme.text.captionSize", "number"],
  ["f-size-body", "theme.text.bodySize", "number"],
  ["f-ls-label", "theme.text.labelTracking", "number"],
  ["f-ls-heading", "theme.text.headingTracking", "number"],

  ["f-grid-min", "theme.layout.gridMinWidth", "number"],
  ["f-grid-gap", "theme.layout.gridGap", "number"],
  ["f-aspect", "theme.layout.aspectRatio", "text"],
  ["f-max-width", "theme.layout.maxWidth", "number"],
  ["f-pad-top", "theme.layout.pagePaddingTop", "number"],
  ["f-pad-side", "theme.layout.pagePaddingSide", "number"],

  ["f-radius-grid", "theme.style.radiusGrid", "number"],
  ["f-radius-frame", "theme.style.radiusFrame", "number"],
  ["f-radius-image", "theme.style.radiusImage", "number"],
  ["f-border-width", "theme.style.borderWidth", "number"],
  ["f-hover-zoom", "theme.style.hoverZoom", "number"],
  ["f-transition", "theme.style.transitionSpeed", "number"],
  ["f-corner-size", "theme.style.cornerSize", "number"],
  ["f-show-corners", "theme.style.showCorners", "bool"],
  ["f-caption-mode", "theme.style.captionMode", "text"],
  ["f-show-numbers", "theme.style.showNumbers", "bool"],
  ["f-lightbox", "theme.style.lightbox", "bool"],

  ["f-about-enabled", "pages.about.enabled", "bool"],
  ["f-about-navLabel", "pages.about.navLabel", "text"],
  ["f-about-title", "pages.about.title", "text"],
  ["f-about-portrait", "pages.about.portrait", "text"],
  ["f-about-body", "pages.about.body", "text"],

  ["f-contact-enabled", "pages.contact.enabled", "bool"],
  ["f-contact-navLabel", "pages.contact.navLabel", "text"],
  ["f-contact-title", "pages.contact.title", "text"],
  ["f-contact-email", "pages.contact.email", "text"],
  ["f-contact-intro", "pages.contact.intro", "text"]
];

const FONT_ROLES = [
  { key: "display", sel: "#f-font-display", weight: "#f-weight-display", italic: "#f-italic-display" },
  { key: "body", sel: "#f-font-body", weight: "#f-weight-body", italic: "#f-italic-body" },
  { key: "mono", sel: "#f-font-mono", weight: "#f-weight-mono", italic: "#f-italic-mono" }
];

const WEIGHT_NAMES = {
  100: "100 Thin", 200: "200 Extra Light", 300: "300 Light", 400: "400 Regular",
  500: "500 Medium", 600: "600 Semi Bold", 700: "700 Bold", 800: "800 Extra Bold", 900: "900 Black"
};

// ---------- object path helpers ----------

function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function setPath(obj, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  const target = keys.reduce((o, k) => {
    if (o[k] == null || typeof o[k] !== "object") o[k] = {};
    return o[k];
  }, obj);
  target[last] = value;
}

// Adds only the keys that are missing. Anything already in the config — every
// color, font and label chosen in this panel — is left exactly as it was.
function fillMissing(target, defaults) {
  Object.entries(defaults).forEach(([k, v]) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      if (target[k] == null || typeof target[k] !== "object") target[k] = {};
      fillMissing(target[k], v);
    } else if (target[k] === undefined) {
      target[k] = Array.isArray(v) ? [...v] : v;
    }
  });
}

// ---------- GitHub API helpers ----------

function apiBase() {
  return `https://api.github.com/repos/${creds.owner}/${creds.repo}/contents`;
}

function ghHeaders() {
  return {
    Authorization: `Bearer ${creds.token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

async function ghGetFile(path) {
  const res = await fetch(`${apiBase()}/${path}?ref=${encodeURIComponent(creds.branch)}`, {
    headers: ghHeaders()
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status})`);
  const json = await res.json();
  return { sha: json.sha, content: b64DecodeUnicode(json.content.replace(/\n/g, "")) };
}

async function ghPutFile(path, base64Content, sha, message) {
  const body = { message, content: base64Content, branch: creds.branch };
  if (sha) body.sha = sha;
  const res = await fetch(`${apiBase()}/${path}`, {
    method: "PUT",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`PUT ${path} failed: ${err.message || res.status}`);
  }
  return res.json();
}

async function ghDeleteFile(path, sha, message) {
  const res = await fetch(`${apiBase()}/${path}`, {
    method: "DELETE",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ message, sha, branch: creds.branch })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`DELETE ${path} failed: ${err.message || res.status}`);
  }
}

function b64DecodeUnicode(str) {
  return decodeURIComponent(
    atob(str).split("")
      .map(c => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("")
  );
}

function b64EncodeUnicode(str) {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

function bufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// ---------- credentials ----------

function loadCreds() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return;
  try {
    creds = JSON.parse(raw);
    $("#f-owner").value = creds.owner || "";
    $("#f-repo").value = creds.repo || "";
    $("#f-branch").value = creds.branch || "main";
    $("#f-token").value = creds.token || "";
  } catch {}
}

function saveCreds() {
  localStorage.setItem(LS_KEY, JSON.stringify(creds));
}

// ---------- connect & load ----------

async function connect() {
  creds = {
    owner: $("#f-owner").value.trim(),
    repo: $("#f-repo").value.trim(),
    branch: $("#f-branch").value.trim() || "main",
    token: $("#f-token").value.trim()
  };
  if (!creds.owner || !creds.repo || !creds.token) {
    setStatus("Fill in owner, repo, and token.", "err");
    return;
  }
  setStatus("Connecting…");
  try {
    const file = await ghGetFile("config.json");
    if (!file) throw new Error("config.json not found in this repo/branch.");
    config = JSON.parse(file.content);
    configSha = file.sha;

    fillMissing(config, DEFAULTS);
    if (!Array.isArray(config.collections)) config.collections = [];
    if (!Array.isArray(config.pages.contact.links)) config.pages.contact.links = [];

    photos = (config.photos || []).map(p => ({ ...p, status: "existing" }));

    saveCreds();
    setStatus("Connected.", "ok");
    $("#btn-disconnect").hidden = false;
    $("#editor").hidden = false;

    populateFontControls();
    populateForm();
    renderCollectionList();
    renderLinkList();
    renderPhotoList();
    updatePreview();
  } catch (err) {
    console.error(err);
    setStatus(err.message, "err");
  }
}

function disconnect() {
  localStorage.removeItem(LS_KEY);
  creds = { owner: "", repo: "", branch: "main", token: "" };
  $("#f-token").value = "";
  $("#editor").hidden = true;
  $("#btn-disconnect").hidden = true;
  setStatus("Token forgotten.");
}

function setStatus(msg, kind) {
  const el = $("#connect-status");
  el.textContent = msg;
  el.className = "status" + (kind ? " " + kind : "");
}

// ---------- fonts ----------

function populateFontControls() {
  const grouped = ["sans", "serif", "mono", "handwriting"].map(cat => ({
    cat,
    fonts: GOOGLE_FONTS.filter(f => f.cat === cat)
  }));

  FONT_ROLES.forEach(role => {
    roleIntent[role.key] = {
      weight: Number(getPath(config, `theme.fonts.${role.key}Weight`)) || 400,
      italic: getPath(config, `theme.fonts.${role.key}Italic`) === true
    };
  });

  FONT_ROLES.forEach(role => {
    const sel = $(role.sel);
    const current = getPath(config, `theme.fonts.${role.key}`);

    sel.innerHTML = grouped.map(g =>
      `<optgroup label="${g.cat}">${
        g.fonts.map(f => `<option value="${escapeAttr(f.name)}">${escapeHtml(f.name)}</option>`).join("")
      }</optgroup>`
    ).join("");

    // A family saved before this list existed stays selectable rather than
    // silently snapping to something else.
    if (current && !FONT_BY_NAME[current]) {
      sel.insertAdjacentHTML("afterbegin",
        `<option value="${escapeAttr(current)}">${escapeHtml(current)} (current)</option>`);
    }
    sel.value = current;

    refreshWeightOptions(role);

    sel.addEventListener("change", () => {
      setPath(config, `theme.fonts.${role.key}`, sel.value);
      refreshWeightOptions(role);
      syncFontRoleToConfig(role);
      updatePreview();
    });
    // Changing these directly is a deliberate choice, so it updates the intent.
    $(role.weight).addEventListener("change", () => {
      roleIntent[role.key].weight = Number($(role.weight).value);
      syncFontRoleToConfig(role);
      updatePreview();
    });
    $(role.italic).addEventListener("change", () => {
      roleIntent[role.key].italic = $(role.italic).checked;
      syncFontRoleToConfig(role);
      updatePreview();
    });
  });
}

// Rebuilds the weight menu for whichever family is selected, keeping the closest
// available weight to what was chosen before.
function refreshWeightOptions(role) {
  const family = $(role.sel).value;
  const meta = FONT_BY_NAME[family];
  const weightSel = $(role.weight);
  const italicBox = $(role.italic);

  const intent = roleIntent[role.key] || { weight: 400, italic: false };
  const weights = meta ? meta.weights : [400];
  const snapped = meta ? nearestWeight(family, intent.weight) : intent.weight;

  weightSel.innerHTML = weights
    .map(w => `<option value="${w}">${WEIGHT_NAMES[w] || w}</option>`)
    .join("");
  weightSel.value = String(snapped);

  // Italic stays ticked in your intent even while a font that lacks it is
  // selected, so going back to one that has it restores the choice.
  const canItalic = meta ? meta.italic : false;
  italicBox.disabled = !canItalic;
  italicBox.checked = canItalic && intent.italic;

  italicBox.closest("label").classList.toggle("disabled", !canItalic);
}

function syncFontRoleToConfig(role) {
  setPath(config, `theme.fonts.${role.key}`, $(role.sel).value);
  setPath(config, `theme.fonts.${role.key}Weight`, Number($(role.weight).value));
  setPath(config, `theme.fonts.${role.key}Italic`, $(role.italic).checked);
}

// ---------- form ----------

function populateForm() {
  BINDINGS.forEach(([id, path, type]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const val = getPath(config, path);
    if (type === "bool") el.checked = val === true;
    else el.value = val == null ? "" : val;
  });
}

function readFormIntoState() {
  BINDINGS.forEach(([id, path, type]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (type === "bool") {
      setPath(config, path, el.checked);
    } else if (type === "number") {
      const n = parseFloat(el.value);
      if (!Number.isNaN(n)) setPath(config, path, n);
    } else {
      setPath(config, path, el.value);
    }
  });
  FONT_ROLES.forEach(syncFontRoleToConfig);
}

// ---------- live preview ----------

function updatePreview() {
  readFormIntoState();
  const pv = $("#preview");
  if (!pv) return;

  const t = config.theme;
  const s = pv.style;
  s.setProperty("--pv-bg", t.colors.background);
  s.setProperty("--pv-text", t.colors.text);
  s.setProperty("--pv-muted", t.colors.muted);
  s.setProperty("--pv-border", t.colors.border);
  s.setProperty("--pv-font-display", fontStack(t.fonts.display));
  s.setProperty("--pv-font-mono", fontStack(t.fonts.mono));
  s.setProperty("--pv-weight-display", t.fonts.displayWeight);
  s.setProperty("--pv-style-display", t.fonts.displayItalic ? "italic" : "normal");
  s.setProperty("--pv-weight-mono", t.fonts.monoWeight);
  s.setProperty("--pv-style-mono", t.fonts.monoItalic ? "italic" : "normal");
  s.setProperty("--pv-case", t.text.labelCase);
  s.setProperty("--pv-radius", `${t.style.radiusImage}px`);
  s.setProperty("--pv-gap", `${t.layout.gridGap}px`);
  s.setProperty("--pv-aspect", t.layout.aspectRatio);
  s.setProperty("--pv-tracking", `${t.text.labelTracking}em`);

  $("#pv-name").textContent = config.site.name || "levi smith";
  $("#pv-tagline").textContent = config.site.tagline || "photographs";

  loadGoogleFonts([
    { family: t.fonts.display, weight: t.fonts.displayWeight, italic: t.fonts.displayItalic },
    { family: t.fonts.body, weight: t.fonts.bodyWeight, italic: t.fonts.bodyItalic },
    { family: t.fonts.mono, weight: t.fonts.monoWeight, italic: t.fonts.monoItalic }
  ]);
}

// ---------- collections ----------

function renderCollectionList() {
  const ul = $("#collection-list");
  ul.innerHTML = "";

  if (config.collections.length === 0) {
    ul.innerHTML = '<li class="mini-empty">No collections — the gallery shows one plain grid.</li>';
    return;
  }

  config.collections.forEach((c, i) => {
    const li = document.createElement("li");
    li.className = "mini-item";
    li.innerHTML = `
      <div class="mini-row">
        <label>Title
          <input type="text" value="${escapeAttr(c.title || "")}" data-col-title="${i}" placeholder="bioko">
        </label>
        <label>ID <span class="unit">used to tag photos</span>
          <input type="text" value="${escapeAttr(c.id || "")}" data-col-id="${i}" placeholder="bioko">
        </label>
      </div>
      <label class="full">Description <span class="unit">optional</span>
        <input type="text" value="${escapeAttr(c.description || "")}" data-col-desc="${i}">
      </label>
      <div class="mini-actions">
        <button class="icon-btn" data-col-up="${i}" ${i === 0 ? "disabled" : ""} type="button">↑ up</button>
        <button class="icon-btn" data-col-down="${i}" ${i === config.collections.length - 1 ? "disabled" : ""} type="button">↓ down</button>
        <button class="icon-btn danger" data-col-remove="${i}" type="button">remove</button>
      </div>`;
    ul.appendChild(li);
  });

  ul.querySelectorAll("[data-col-title]").forEach(inp =>
    inp.addEventListener("input", e => {
      config.collections[+e.target.dataset.colTitle].title = e.target.value;
    }));

  // Retagging the id keeps every photo already assigned to the old id in sync,
  // so renaming a collection never orphans its photos.
  ul.querySelectorAll("[data-col-id]").forEach(inp =>
    inp.addEventListener("change", e => {
      const idx = +e.target.dataset.colId;
      const oldId = config.collections[idx].id;
      const newId = e.target.value.trim();
      config.collections[idx].id = newId;
      photos.forEach(p => { if (p.collection === oldId) p.collection = newId; });
      renderPhotoList();
    }));

  ul.querySelectorAll("[data-col-desc]").forEach(inp =>
    inp.addEventListener("input", e => {
      config.collections[+e.target.dataset.colDesc].description = e.target.value;
    }));

  ul.querySelectorAll("[data-col-up]").forEach(btn =>
    btn.addEventListener("click", e => moveCollection(+e.currentTarget.dataset.colUp, -1)));
  ul.querySelectorAll("[data-col-down]").forEach(btn =>
    btn.addEventListener("click", e => moveCollection(+e.currentTarget.dataset.colDown, 1)));

  ul.querySelectorAll("[data-col-remove]").forEach(btn =>
    btn.addEventListener("click", e => {
      const idx = +e.currentTarget.dataset.colRemove;
      const removed = config.collections[idx].id;
      config.collections.splice(idx, 1);
      // Photos in a deleted collection become unassigned rather than vanishing.
      photos.forEach(p => { if (p.collection === removed) p.collection = ""; });
      renderCollectionList();
      renderPhotoList();
    }));
}

function moveCollection(idx, delta) {
  const to = idx + delta;
  if (to < 0 || to >= config.collections.length) return;
  const [item] = config.collections.splice(idx, 1);
  config.collections.splice(to, 0, item);
  renderCollectionList();
  renderPhotoList();
}

// ---------- contact links ----------

function renderLinkList() {
  const ul = $("#link-list");
  const links = config.pages.contact.links;
  ul.innerHTML = "";

  if (links.length === 0) {
    ul.innerHTML = '<li class="mini-empty">No links yet.</li>';
    return;
  }

  links.forEach((l, i) => {
    const li = document.createElement("li");
    li.className = "mini-item";
    li.innerHTML = `
      <div class="mini-row">
        <label>Label
          <input type="text" value="${escapeAttr(l.label || "")}" data-link-label="${i}" placeholder="instagram">
        </label>
        <label>URL
          <input type="text" value="${escapeAttr(l.url || "")}" data-link-url="${i}" placeholder="https://instagram.com/…">
        </label>
      </div>
      <div class="mini-actions">
        <button class="icon-btn danger" data-link-remove="${i}" type="button">remove</button>
      </div>`;
    ul.appendChild(li);
  });

  ul.querySelectorAll("[data-link-label]").forEach(inp =>
    inp.addEventListener("input", e => { links[+e.target.dataset.linkLabel].label = e.target.value; }));
  ul.querySelectorAll("[data-link-url]").forEach(inp =>
    inp.addEventListener("input", e => { links[+e.target.dataset.linkUrl].url = e.target.value; }));
  ul.querySelectorAll("[data-link-remove]").forEach(btn =>
    btn.addEventListener("click", e => {
      links.splice(+e.currentTarget.dataset.linkRemove, 1);
      renderLinkList();
    }));
}

// ---------- photo list ----------

function collectionOptions(selected) {
  const opts = [`<option value=""${!selected ? " selected" : ""}>— none —</option>`];
  config.collections.forEach(c => {
    if (!c.id) return;
    opts.push(
      `<option value="${escapeAttr(c.id)}"${c.id === selected ? " selected" : ""}>${
        escapeHtml(c.title || c.id)
      }</option>`
    );
  });
  return opts.join("");
}

function renderPhotoList() {
  const ul = $("#photo-list");
  ul.innerHTML = "";

  photos.forEach((p, i) => {
    if (p.status === "deleted") return;
    const li = document.createElement("li");
    li.className = "photo-item" + (p.status === "new" ? " new" : "");
    li.dataset.index = i;

    const thumbSrc = p.status === "new" ? p.dataUrl : `../images/${p.file}`;

    li.innerHTML = `
      <span class="handle" title="drag to reorder">⋮⋮</span>
      <img src="${escapeAttr(thumbSrc)}" alt="">
      <div class="photo-fields">
        <div class="photo-row">
          <input type="text" value="${escapeAttr(p.caption || "")}" placeholder="caption" data-caption-for="${i}">
          ${p.status === "new" ? '<span class="tag">new</span>' : ""}
          <button class="icon-btn danger" data-remove="${i}" type="button">remove</button>
        </div>
        <div class="photo-row photo-meta">
          <select data-collection-for="${i}">${collectionOptions(p.collection || "")}</select>
          <input type="text" value="${escapeAttr(p.date || "")}" placeholder="date — 2024 or 2024-03 or 2024-03-15" data-date-for="${i}">
          <input type="text" value="${escapeAttr(p.location || "")}" placeholder="location" data-location-for="${i}">
        </div>
      </div>`;
    ul.appendChild(li);
  });

  const bind = (attr, field) => {
    ul.querySelectorAll(`[data-${attr}-for]`).forEach(el =>
      el.addEventListener("input", e => {
        photos[Number(e.target.dataset[`${attr}For`])][field] = e.target.value;
      }));
  };
  bind("caption", "caption");
  bind("date", "date");
  bind("location", "location");

  ul.querySelectorAll("[data-collection-for]").forEach(sel =>
    sel.addEventListener("change", e => {
      photos[Number(e.target.dataset.collectionFor)].collection = e.target.value;
    }));

  ul.querySelectorAll("[data-remove]").forEach(btn =>
    btn.addEventListener("click", e => {
      const idx = Number(e.currentTarget.dataset.remove);
      if (photos[idx].status === "new") photos.splice(idx, 1);
      else photos[idx].status = "deleted";
      renderPhotoList();
    }));

  setupDragReorder(ul);
}

// Rows only become draggable while the handle is held, so clicking into a
// caption or date field doesn't start a drag.
function setupDragReorder(ul) {
  let dragEl = null;

  ul.querySelectorAll(".photo-item").forEach(item => {
    const handle = item.querySelector(".handle");

    handle.addEventListener("mousedown", () => { item.draggable = true; });
    handle.addEventListener("touchstart", () => { item.draggable = true; }, { passive: true });

    item.addEventListener("dragstart", () => {
      dragEl = item;
      item.classList.add("dragging");
    });
    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
      item.draggable = false;
      dragEl = null;
      commitDomOrder(ul);
    });
    item.addEventListener("dragover", e => {
      e.preventDefault();
      if (!dragEl) return;
      const after = getDragAfterElement(ul, e.clientY);
      if (after == null) ul.appendChild(dragEl);
      else ul.insertBefore(dragEl, after);
    });
  });
}

function getDragAfterElement(container, y) {
  const items = [...container.querySelectorAll(".photo-item:not(.dragging)")];
  return items.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

function commitDomOrder(ul) {
  const orderedIndexes = [...ul.querySelectorAll(".photo-item")].map(el => Number(el.dataset.index));
  const visible = orderedIndexes.map(i => photos[i]);
  const hidden = photos.filter(p => p.status === "deleted");
  photos = [...visible, ...hidden];
  renderPhotoList();
}

// ---------- upload ----------

function handleFiles(fileList) {
  [...fileList].forEach(async file => {
    if (!file.type.startsWith("image/")) return;
    const { blob, dataUrl } = await compressImage(file);
    const filename = uniqueFilename(file.name);
    const buffer = await blob.arrayBuffer();
    photos.push({
      file: filename,
      caption: baseName(file.name),
      collection: "",
      date: "",
      location: "",
      status: "new",
      dataUrl,
      _base64: bufferToBase64(buffer)
    });
    renderPhotoList();
  });
}

function baseName(name) {
  return name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
}

function uniqueFilename(original) {
  const base = original.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-_]/gi, "-").toLowerCase();
  let name = `${base}.jpg`;
  let n = 1;
  const taken = new Set(photos.filter(p => p.status !== "deleted").map(p => p.file));
  while (taken.has(name)) {
    name = `${base}-${n}.jpg`;
    n++;
  }
  return name;
}

function compressImage(file) {
  const MAX_DIM = 2200;
  const QUALITY = 0.85;
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height / width) * MAX_DIM);
            width = MAX_DIM;
          } else {
            width = Math.round((width / height) * MAX_DIM);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          blob => resolve({ blob, dataUrl: canvas.toDataURL("image/jpeg", QUALITY) }),
          "image/jpeg",
          QUALITY
        );
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------- helpers ----------

function escapeAttr(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : str;
  return div.innerHTML;
}

// ---------- publish ----------

function log(msg, kind) {
  const el = $("#publish-log");
  const line = document.createElement("div");
  line.className = kind ? `line-${kind}` : "";
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

// Keeps every photo field except the panel's own bookkeeping, so date, location,
// collection — and anything added later — survive a publish.
function cleanPhoto(p) {
  const { status, dataUrl, _base64, ...rest } = p;
  Object.keys(rest).forEach(k => {
    if (rest[k] === "" || rest[k] == null) delete rest[k];
  });
  return rest;
}

function buildConfig() {
  const { site, theme, pages, collections, photos: _ignored, ...rest } = config;
  return {
    site,
    theme,
    pages,
    collections: collections.filter(c => c && c.id),
    ...rest,
    photos: photos.filter(p => p.status !== "deleted").map(cleanPhoto)
  };
}

async function publish() {
  readFormIntoState();
  $("#publish-log").innerHTML = "";
  $("#btn-publish").disabled = true;

  try {
    for (const p of photos) {
      if (p.status !== "new") continue;
      log(`Uploading ${p.file}…`);
      await ghPutFile(`images/${p.file}`, p._base64, null, `Add photo ${p.file}`);
      p.status = "existing";
      delete p._base64;
      log(`Uploaded ${p.file}`, "ok");
    }

    for (const p of photos) {
      if (p.status !== "deleted") continue;
      log(`Removing ${p.file}…`);
      const existing = await ghGetFile(`images/${p.file}`);
      if (existing) await ghDeleteFile(`images/${p.file}`, existing.sha, `Remove photo ${p.file}`);
      log(`Removed ${p.file}`, "ok");
    }
    photos = photos.filter(p => p.status !== "deleted");

    log("Updating config.json…");
    const result = await ghPutFile(
      "config.json",
      b64EncodeUnicode(JSON.stringify(buildConfig(), null, 2) + "\n"),
      configSha,
      "Update site config via studio"
    );
    configSha = result.content.sha;
    log("Published.", "ok");
  } catch (err) {
    console.error(err);
    log(err.message, "err");
  } finally {
    $("#btn-publish").disabled = false;
    renderPhotoList();
  }
}

// ---------- wire up ----------

document.addEventListener("DOMContentLoaded", () => {
  loadCreds();

  $("#btn-connect").addEventListener("click", connect);
  $("#btn-disconnect").addEventListener("click", disconnect);
  $("#btn-publish").addEventListener("click", publish);

  $("#btn-add-collection").addEventListener("click", () => {
    config.collections.push({ id: "", title: "", description: "" });
    renderCollectionList();
  });

  $("#btn-add-link").addEventListener("click", () => {
    config.pages.contact.links.push({ label: "", url: "" });
    renderLinkList();
  });

  // Any control that affects appearance refreshes the preview.
  document.addEventListener("input", e => {
    if (e.target.closest("#panel-connect")) return;
    if (e.target.closest(".panel") && !$("#editor").hidden) updatePreview();
  });

  const dropzone = $("#dropzone");
  const fileInput = $("#f-upload");
  dropzone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", e => handleFiles(e.target.files));
  dropzone.addEventListener("dragover", e => { e.preventDefault(); dropzone.classList.add("drag"); });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag"));
  dropzone.addEventListener("drop", e => {
    e.preventDefault();
    dropzone.classList.remove("drag");
    handleFiles(e.dataTransfer.files);
  });

  if (creds.token) $("#btn-disconnect").hidden = false;
});
