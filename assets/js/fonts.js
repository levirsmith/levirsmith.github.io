// Curated Google Font choices, grouped by role.
// Keeping this list small means every option is guaranteed to load and pair well.
const FONT_OPTIONS = {
  display: [
    "Fraunces",
    "Newsreader",
    "Playfair Display",
    "Instrument Serif",
    "DM Serif Display",
    "Space Grotesk"
  ],
  body: [
    "Inter",
    "IBM Plex Sans",
    "Work Sans",
    "Source Sans 3",
    "Manrope"
  ],
  mono: [
    "IBM Plex Mono",
    "JetBrains Mono",
    "Space Mono",
    "Courier Prime"
  ]
};

// Builds a Google Fonts stylesheet URL for a set of font family names.
function buildGoogleFontsUrl(families) {
  const unique = [...new Set(families.filter(Boolean))];
  const params = unique
    .map(f => `family=${encodeURIComponent(f)}:wght@300;400;500;600`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

function loadGoogleFonts(families) {
  const id = "dynamic-google-fonts";
  let link = document.getElementById(id);
  if (!link) {
    link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href = buildGoogleFontsUrl(families);
}
