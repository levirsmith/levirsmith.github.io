const LS_KEY = "site-admin-credentials";

let creds = { owner: "", repo: "", branch: "main", token: "" };
let configSha = null;
let site = {};
let theme = {};
let photos = []; // {file, caption, status: 'existing'|'new'|'deleted', dataUrl}

const $ = sel => document.querySelector(sel);

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
  const body = {
    message,
    content: base64Content,
    branch: creds.branch
  };
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
    atob(str)
      .split("")
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
    const config = JSON.parse(file.content);
    configSha = file.sha;
    site = config.site;
    theme = config.theme;
    photos = config.photos.map(p => ({ ...p, status: "existing" }));

    saveCreds();
    setStatus("Connected.", "ok");
    $("#btn-disconnect").hidden = false;
    $("#editor").hidden = false;

    populateFontSelects();
    populateForm();
    renderPhotoList();
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

// ---------- form population ----------

function populateFontSelects() {
  const fill = (id, list, current) => {
    const sel = $(id);
    sel.innerHTML = list.map(f => `<option value="${f}">${f}</option>`).join("");
    sel.value = current;
  };
  fill("#f-font-display", FONT_OPTIONS.display, theme.fonts.display);
  fill("#f-font-body", FONT_OPTIONS.body, theme.fonts.body);
  fill("#f-font-mono", FONT_OPTIONS.mono, theme.fonts.mono);
}

function populateForm() {
  ["name", "tagline", "galleryTitle", "galleryNote", "enterLabel", "homeLabel"].forEach(k => {
    $(`#f-${k}`).value = site[k] || "";
  });
  ["background", "text", "muted", "accent", "border"].forEach(k => {
    $(`#c-${k}`).value = theme.colors[k] || "#000000";
  });
  $("#f-label-case").value = (theme.text && theme.text.labelCase) || "none";
}

function readFormIntoState() {
  ["name", "tagline", "galleryTitle", "galleryNote", "enterLabel", "homeLabel"].forEach(k => {
    site[k] = $(`#f-${k}`).value;
  });
  ["background", "text", "muted", "accent", "border"].forEach(k => {
    theme.colors[k] = $(`#c-${k}`).value;
  });
  theme.fonts.display = $("#f-font-display").value;
  theme.fonts.body = $("#f-font-body").value;
  theme.fonts.mono = $("#f-font-mono").value;
  theme.text = { labelCase: $("#f-label-case").value };
}

// ---------- photo list ----------

function renderPhotoList() {
  const ul = $("#photo-list");
  ul.innerHTML = "";
  photos.forEach((p, i) => {
    if (p.status === "deleted") return;
    const li = document.createElement("li");
    li.className = "photo-item" + (p.status === "new" ? " new" : "");
    li.draggable = true;
    li.dataset.index = i;

    const thumbSrc = p.status === "new" ? p.dataUrl : `../images/${p.file}`;

    li.innerHTML = `
      <span class="handle">⋮⋮</span>
      <img src="${thumbSrc}" alt="">
      <input type="text" value="${escapeAttr(p.caption || "")}" placeholder="caption" data-caption-for="${i}">
      ${p.status === "new" ? '<span class="tag">new</span>' : ""}
      <button class="icon-btn" data-remove="${i}">remove</button>
    `;
    ul.appendChild(li);
  });

  ul.querySelectorAll("[data-caption-for]").forEach(input => {
    input.addEventListener("input", e => {
      const idx = Number(e.target.dataset.captionFor);
      photos[idx].caption = e.target.value;
    });
  });

  ul.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", e => {
      const idx = Number(e.target.dataset.remove);
      if (photos[idx].status === "new") {
        photos.splice(idx, 1);
      } else {
        photos[idx].status = "deleted";
      }
      renderPhotoList();
    });
  });

  setupDragReorder(ul);
}

function setupDragReorder(ul) {
  let dragEl = null;

  ul.querySelectorAll(".photo-item").forEach(item => {
    item.addEventListener("dragstart", () => {
      dragEl = item;
      item.classList.add("dragging");
    });
    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
      dragEl = null;
      commitDomOrder(ul);
    });
    item.addEventListener("dragover", e => {
      e.preventDefault();
      const after = getDragAfterElement(ul, e.clientY);
      if (!dragEl) return;
      if (after == null) {
        ul.appendChild(dragEl);
      } else {
        ul.insertBefore(dragEl, after);
      }
    });
  });
}

function getDragAfterElement(container, y) {
  const items = [...container.querySelectorAll(".photo-item:not(.dragging)")];
  return items.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
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
  let base = original.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-_]/gi, "-").toLowerCase();
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

function escapeAttr(str) {
  return String(str).replace(/"/g, "&quot;");
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

async function publish() {
  readFormIntoState();
  $("#publish-log").innerHTML = "";
  $("#btn-publish").disabled = true;

  try {
    // 1. Upload new photos
    for (const p of photos) {
      if (p.status !== "new") continue;
      log(`Uploading ${p.file}…`);
      await ghPutFile(`images/${p.file}`, p._base64, null, `Add photo ${p.file}`);
      p.status = "existing";
      delete p._base64;
      log(`Uploaded ${p.file}`, "ok");
    }

    // 2. Delete removed photos
    for (const p of photos) {
      if (p.status !== "deleted") continue;
      log(`Removing ${p.file}…`);
      const existing = await ghGetFile(`images/${p.file}`);
      if (existing) {
        await ghDeleteFile(`images/${p.file}`, existing.sha, `Remove photo ${p.file}`);
      }
      log(`Removed ${p.file}`, "ok");
    }
    photos = photos.filter(p => p.status !== "deleted");

    // 3. Update config.json
    log("Updating config.json…");
    const config = {
      site,
      theme,
      photos: photos.map(({ file, caption }) => ({ file, caption }))
    };
    const result = await ghPutFile(
      "config.json",
      b64EncodeUnicode(JSON.stringify(config, null, 2)),
      configSha,
      "Update site config via admin panel"
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

  if (creds.token) {
    $("#btn-disconnect").hidden = false;
  }
});
