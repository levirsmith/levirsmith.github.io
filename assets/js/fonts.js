// The font library shared by the public pages and the studio panel.
//
// Every entry records which weights and italics Google actually serves for that
// family. That matters: asking the Google Fonts API for a weight a family does
// not have (e.g. Bebas Neue at 700) returns a 400 and the font silently fails to
// load, so the studio only ever offers real options and the loader only ever
// requests them.

const GOOGLE_FONTS = [
  // ---- sans ----
  { name: "Inter",             cat: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: true },
  { name: "Roboto",            cat: "sans", weights: [100,300,400,500,700,900],             italic: true },
  { name: "Open Sans",         cat: "sans", weights: [300,400,500,600,700,800],             italic: true },
  { name: "Montserrat",        cat: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: true },
  { name: "Lato",              cat: "sans", weights: [100,300,400,700,900],                 italic: true },
  { name: "Poppins",           cat: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: true },
  { name: "Raleway",           cat: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: true },
  { name: "Nunito",            cat: "sans", weights: [200,300,400,500,600,700,800,900],     italic: true },
  { name: "Nunito Sans",       cat: "sans", weights: [200,300,400,500,600,700,800,900],     italic: true },
  { name: "Work Sans",         cat: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: true },
  { name: "DM Sans",           cat: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: true },
  { name: "Manrope",           cat: "sans", weights: [200,300,400,500,600,700,800],         italic: false },
  { name: "Rubik",             cat: "sans", weights: [300,400,500,600,700,800,900],         italic: true },
  { name: "Karla",             cat: "sans", weights: [200,300,400,500,600,700,800],         italic: true },
  { name: "Mulish",            cat: "sans", weights: [200,300,400,500,600,700,800,900],     italic: true },
  { name: "Barlow",            cat: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: true },
  { name: "Figtree",           cat: "sans", weights: [300,400,500,600,700,800,900],         italic: true },
  { name: "Plus Jakarta Sans", cat: "sans", weights: [200,300,400,500,600,700,800],         italic: true },
  { name: "Outfit",            cat: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: false },
  { name: "Source Sans 3",     cat: "sans", weights: [200,300,400,500,600,700,800,900],     italic: true },
  { name: "IBM Plex Sans",     cat: "sans", weights: [100,200,300,400,500,600,700],         italic: true },
  { name: "Public Sans",       cat: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: true },
  { name: "Archivo",           cat: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: true },
  { name: "Josefin Sans",      cat: "sans", weights: [100,200,300,400,500,600,700],         italic: true },
  { name: "Quicksand",         cat: "sans", weights: [300,400,500,600,700],                 italic: false },
  { name: "Cabin",             cat: "sans", weights: [400,500,600,700],                     italic: true },
  { name: "Heebo",             cat: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: false },
  { name: "Ubuntu",            cat: "sans", weights: [300,400,500,700],                     italic: true },
  { name: "Fira Sans",         cat: "sans", weights: [100,200,300,400,500,600,700,800,900], italic: true },
  { name: "Space Grotesk",     cat: "sans", weights: [300,400,500,600,700],                 italic: false },
  { name: "Oswald",            cat: "sans", weights: [200,300,400,500,600,700],             italic: false },
  { name: "Titillium Web",     cat: "sans", weights: [200,300,400,600,700,900],             italic: true },
  { name: "Dosis",             cat: "sans", weights: [200,300,400,500,600,700,800],         italic: false },
  { name: "Comfortaa",         cat: "sans", weights: [300,400,500,600,700],                 italic: false },
  { name: "Bebas Neue",        cat: "sans", weights: [400],                                 italic: false },
  { name: "Anton",             cat: "sans", weights: [400],                                 italic: false },

  // ---- serif ----
  { name: "Playfair Display",  cat: "serif", weights: [400,500,600,700,800,900],            italic: true },
  { name: "Merriweather",      cat: "serif", weights: [300,400,700,900],                    italic: true },
  { name: "Lora",              cat: "serif", weights: [400,500,600,700],                    italic: true },
  { name: "Fraunces",          cat: "serif", weights: [100,200,300,400,500,600,700,800,900],italic: true },
  { name: "EB Garamond",       cat: "serif", weights: [400,500,600,700,800],                italic: true },
  { name: "Cormorant Garamond",cat: "serif", weights: [300,400,500,600,700],                italic: true },
  { name: "Libre Baskerville", cat: "serif", weights: [400,700],                            italic: true },
  { name: "Crimson Text",      cat: "serif", weights: [400,600,700],                        italic: true },
  { name: "PT Serif",          cat: "serif", weights: [400,700],                            italic: true },
  { name: "Noto Serif",        cat: "serif", weights: [100,200,300,400,500,600,700,800,900],italic: true },
  { name: "Bitter",            cat: "serif", weights: [100,200,300,400,500,600,700,800,900],italic: true },
  { name: "Roboto Slab",       cat: "serif", weights: [100,200,300,400,500,600,700,800,900],italic: false },
  { name: "Newsreader",        cat: "serif", weights: [200,300,400,500,600,700,800],        italic: true },
  { name: "Spectral",          cat: "serif", weights: [200,300,400,500,600,700,800],        italic: true },
  { name: "Instrument Serif",  cat: "serif", weights: [400],                                italic: true },
  { name: "DM Serif Display",  cat: "serif", weights: [400],                                italic: true },
  { name: "Abril Fatface",     cat: "serif", weights: [400],                                italic: false },

  // ---- mono ----
  { name: "JetBrains Mono",    cat: "mono", weights: [100,200,300,400,500,600,700,800],     italic: true },
  { name: "IBM Plex Mono",     cat: "mono", weights: [100,200,300,400,500,600,700],         italic: true },
  { name: "Roboto Mono",       cat: "mono", weights: [100,200,300,400,500,600,700],         italic: true },
  { name: "Source Code Pro",   cat: "mono", weights: [200,300,400,500,600,700,800,900],     italic: true },
  { name: "Space Mono",        cat: "mono", weights: [400,700],                             italic: true },
  { name: "Inconsolata",       cat: "mono", weights: [200,300,400,500,600,700,800,900],     italic: false },
  { name: "Courier Prime",     cat: "mono", weights: [400,700],                             italic: true },
  { name: "DM Mono",           cat: "mono", weights: [300,400,500],                         italic: true },

  // ---- handwriting / display ----
  { name: "Caveat",            cat: "handwriting", weights: [400,500,600,700],              italic: false },
  { name: "Dancing Script",    cat: "handwriting", weights: [400,500,600,700],              italic: false },
  { name: "Pacifico",          cat: "handwriting", weights: [400],                          italic: false },
  { name: "Lobster",           cat: "handwriting", weights: [400],                          italic: false }
];

const FONT_BY_NAME = Object.fromEntries(GOOGLE_FONTS.map(f => [f.name, f]));

const FALLBACK_BY_CAT = {
  sans: "sans-serif",
  serif: "serif",
  mono: "monospace",
  handwriting: "cursive"
};

// The CSS font stack for a family — its own name plus a sensible generic fallback
// so text still renders in something reasonable if the webfont never arrives.
function fontStack(name) {
  const meta = FONT_BY_NAME[name];
  const fallback = meta ? FALLBACK_BY_CAT[meta.cat] : "sans-serif";
  return `"${name}", ${fallback}`;
}

// Snap a desired weight to the nearest one the family actually ships, so
// switching fonts never leaves a weight selection pointing at nothing.
function nearestWeight(name, want) {
  const meta = FONT_BY_NAME[name];
  if (!meta) return want;
  if (meta.weights.includes(want)) return want;
  return meta.weights.reduce((best, w) =>
    Math.abs(w - want) < Math.abs(best - want) ? w : best
  , meta.weights[0]);
}

function supportsItalic(name) {
  const meta = FONT_BY_NAME[name];
  return meta ? meta.italic : false;
}

// Requests are grouped per family and injected as one <link> each, so a family
// that fails for any reason can't take the others down with it.
function loadGoogleFonts(specs) {
  const byFamily = new Map();

  specs.filter(Boolean).forEach(spec => {
    const { family } = spec;
    if (!family || !FONT_BY_NAME[family]) return;
    if (!byFamily.has(family)) byFamily.set(family, { weights: new Set(), italic: false });
    const entry = byFamily.get(family);
    entry.weights.add(nearestWeight(family, spec.weight || 400));
    if (spec.italic && supportsItalic(family)) entry.italic = true;
  });

  // Drop links for families no longer in use.
  document.querySelectorAll("link[data-font-family]").forEach(link => {
    if (!byFamily.has(link.dataset.fontFamily)) link.remove();
  });

  byFamily.forEach((entry, family) => {
    const weights = [...entry.weights].sort((a, b) => a - b);
    const axis = entry.italic
      ? `ital,wght@${weights.map(w => `0,${w}`).join(";")};${weights.map(w => `1,${w}`).join(";")}`
      : `wght@${weights.join(";")}`;
    const href =
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:${axis}&display=swap`;

    let link = document.querySelector(`link[data-font-family="${CSS.escape(family)}"]`);
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.dataset.fontFamily = family;
      document.head.appendChild(link);
    }
    if (link.href !== href) link.href = href;
  });
}
