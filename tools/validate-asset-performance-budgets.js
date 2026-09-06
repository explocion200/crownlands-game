const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const statBytes = relativePath => fs.statSync(path.join(root, relativePath)).size;
const normalizedTextBytes = relativePath => Buffer.byteLength(read(relativePath).replace(/\r\n/g, "\n"), "utf8");
const mib = value => `${(value / (1024 * 1024)).toFixed(2)} MiB`;

const indexSource = read("index.html");
const serviceWorkerSource = read("service-worker.js");
const netlifySource = read("netlify.toml");
const gameSource = read("game.js");
const commonGearUiScriptSource = read("common-gear-ui.js");
const baseCitiesSource = read("base-cities.js");
const instantEconomyActionsSource = read("instant-economy-actions.js");
const commonGearSource = read("common-gear.js");
const stylesSource = read("styles.css");
const commonGearUiSource = read("common-gear-ui.css");
const interfaceThemeSource = read("interface-theme.css");
const manuscriptPrototypeSource = read("manuscript-prototype.css");
const uiContrastCorrectionSource = read("ui-contrast-correction.css");
const profileThemeSource = read("profile-theme.css");
const crownlandsPaletteSource = read("crownlands-palette.css");
const actionButtonsSource = read("action-buttons.css");
const mobileViewportSource = read("mobile-viewport.css");
const siteInfoSource = read("site-info.css");
const manifest = JSON.parse(read("assets/optimized/manifest.json"));
const layout = JSON.parse(read("functions/world-layout.json"));
const thumbnailManifest = JSON.parse(read("assets/worlds/world_01/thumbnail-manifest.json"));

const MAX_LOGIN_PRELOAD_BYTES = 2 * 1024 * 1024;
// Preserve the complete offline game shell while allowing the shared WCAG
// contrast layer to grow by no more than one tightly bounded 64 KiB step.
// The shared flag renderer and Main's layout runtime add under 16 KiB to the
// offline shell while keeping the installation cache below 3.18 MiB.
// The Profile Inner Castle entry adds less than 2 KiB to that shell. The
// current-world expansion from 15 to 20 regions adds about 50 KiB of canonical
// map metadata while the map rasters themselves remain lazy loaded.
// Clan Heraldry v2 adds its shared config/render runtimes and two compact SVG
// sprites while keeping all editable PNG/source artwork out of production.
// Server-authoritative city XP previews and replay-safe upgrade handling add
// under 13 KiB, including the City List upgrade controls across the three
// touched client files. Advance the offline shell by one bounded 16 KiB step.
// Confirmed City List row reconciliation, focus retention, and accessible
// feedback add under 13 KiB. Advance the offline shell by one bounded 16 KiB step.
// The isolated skill-preset draft editor, five-tab status UI, paired point
// controls, and dirty-exit dialog add under 16 KiB across the precached client.
// The staged wall and production helpers add under 16 KiB while keeping the
// full offline shell bounded. Advance the allowance by one 16 KiB step.
// Holding Tower controls and the two existing heraldry sprites used by Tower
// ownership crests add under one bounded 128 KiB offline-shell step.
// Identity guidance and control-position arrows add under 8 KiB, without new
// assets, dependencies, network requests, or a continuously running animation.
const MAX_INSTALL_PRECACHE_BYTES = 3656 * 1024;
const MAX_OPTIMIZED_ART_BYTES = 2700 * 1024;
const MAX_WORLD_MAP_BYTES = 750 * 1024;
const MAX_WORLD_THUMBNAIL_TOTAL_BYTES = 500 * 1024;

const categoryFileBudgets = {
  login: 400 * 1024,
  loading: 32 * 1024,
  transition: 96 * 1024,
  hud: 32 * 1024,
  pickup: 24 * 1024,
  status: 24 * 1024,
  item: 16 * 1024,
  objective: 80 * 1024,
  "holding-tower-object": 48 * 1024,
  "stronghold-object": 80 * 1024,
  "camp-object": 80 * 1024,
  "citadel-object": 80 * 1024,
  camp: 80 * 1024,
  city: 64 * 1024,
  "city-object": 64 * 1024,
  "inner-castle": 400 * 1024,
  gear: 140 * 1024,
  "gear-item": 140 * 1024,
  "gear-box": 140 * 1024,
};

const entrypointBudgets = {
  // Shared semantic action tokens add less than 1 KiB to the runtime markup.
  // Battle-time gear report normalization and rendering add under 16 KiB.
  // Version-aware v1/v2 editor dispatch and strict save feedback add under one
  // bounded 44 KiB step without adding per-frame or map-render work.
  // Preset draft state, guarded navigation, and explicit save/apply handling
  // remain within one bounded 16 KiB client-runtime step.
  // Timed Core activation and live New Lands discovery add a bounded client control path.
  // Holding Tower map interaction, automatic scouting, Treasury controls, and
  // movement composers add under one bounded 32 KiB runtime step.
  // Contextual first steps replace the old Help copy: net runtime growth is
  // under 2 KiB. The aggregate 3648 KiB offline-shell ceiling is unchanged.
  // The follow-up identity steps and arrows add under one 8 KiB runtime step.
  "game.js": 1732 * 1024,
  "common-gear-ui.js": 64 * 1024,
  "base-cities.js": 32 * 1024,
  "instant-economy-actions.js": 64 * 1024,
  // Five responsive build tabs, paired 44px controls, and the exit dialog add
  // under one bounded 4 KiB stylesheet step.
  // Map markers and the complete responsive Tower/Treasury panel add under one
  // bounded 16 KiB shared-style step.
  // Onboarding arrows and compact Profile guidance add under 2 KiB.
  "styles.css": 422 * 1024,
  "holding-tower-ui.css": 24 * 1024,
  "holding-tower-ui.js": 24 * 1024,
  "common-gear-ui.css": 40 * 1024,
  "interface-theme.css": 128 * 1024,
  "manuscript-prototype.css": 64 * 1024,
  "ui-contrast-correction.css": 64 * 1024,
  "profile-theme.css": 32 * 1024,
  // The heraldry v2 cascade boundary adds under 2 KiB while preventing the
  // global palette from overriding editor labels, tabs, and selected states.
  "crownlands-palette.css": 45 * 1024,
  "action-buttons.css": 16 * 1024,
  "mobile-viewport.css": 16 * 1024,
  "assets/map-editor-data.js": 400 * 1024,
  "firebaseClient.js": 150 * 1024,
  "animation-manager.js": 80 * 1024,
  "audio-manager.js": 80 * 1024,
  "route-worker.js": 40 * 1024,
};

function localPathFromUrl(value) {
  const parsed = new URL(String(value), "https://crownlands.test/");
  const pathname = decodeURIComponent(parsed.pathname).replace(/^\/+/, "");
  return pathname || "index.html";
}

function extractAttribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"))?.[1] || "";
}

function readUInt24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function getWebpMetadata(buffer) {
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF", "WebP is missing its RIFF header.");
  assert.equal(buffer.toString("ascii", 8, 12), "WEBP", "WebP is missing its format header.");
  let offset = 12;
  let hasAlpha = false;
  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    if (chunkType === "VP8X") {
      hasAlpha = Boolean(buffer[dataOffset] & 0x10);
      return {
        width: readUInt24LE(buffer, dataOffset + 4) + 1,
        height: readUInt24LE(buffer, dataOffset + 7) + 1,
        hasAlpha,
      };
    }
    if (chunkType === "VP8 ") {
      assert.equal(buffer.toString("hex", dataOffset + 3, dataOffset + 6), "9d012a", "Invalid lossy WebP frame.");
      return {
        width: buffer.readUInt16LE(dataOffset + 6) & 0x3fff,
        height: buffer.readUInt16LE(dataOffset + 8) & 0x3fff,
        hasAlpha,
      };
    }
    if (chunkType === "VP8L") {
      assert.equal(buffer[dataOffset], 0x2f, "Invalid lossless WebP frame.");
      const b1 = buffer[dataOffset + 1];
      const b2 = buffer[dataOffset + 2];
      const b3 = buffer[dataOffset + 3];
      const b4 = buffer[dataOffset + 4];
      return {
        width: 1 + b1 + ((b2 & 0x3f) << 8),
        height: 1 + (b2 >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10),
        hasAlpha: Boolean(b4 & 0x10),
      };
    }
    if (chunkType === "ALPH") hasAlpha = true;
    offset = dataOffset + chunkSize + (chunkSize % 2);
  }
  throw new Error("WebP does not contain a supported image frame.");
}

const preloadTags = Array.from(indexSource.matchAll(/<link\b[^>]*>/gi), match => match[0])
  .filter(tag => extractAttribute(tag, "rel").toLowerCase() === "preload")
  .filter(tag => extractAttribute(tag, "as").toLowerCase() === "image");

assert.equal(preloadTags.length, 4, "Only the login background, loading-wheel layers, and map-transition clouds should be image-preloaded.");
let loginPreloadBytes = 0;
const preloadPaths = [];
for (const tag of preloadTags) {
  const href = extractAttribute(tag, "href");
  const relativePath = localPathFromUrl(href);
  assert(relativePath.startsWith("assets/optimized/"), `${href} must use a browser-sized optimized derivative.`);
  assert(fs.existsSync(path.join(root, relativePath)), `${href} is missing.`);
  preloadPaths.push(relativePath);
  loginPreloadBytes += statBytes(relativePath);
}
assert.deepEqual(
  preloadPaths.sort(),
  ["loading-crown", "loading-ring", "login-background", "map-transition-clouds"]
    .map(id => manifest.assets.find(asset => asset.id === id)?.output)
    .sort(),
  "Image preloads must be limited to the login-critical derivatives and the lightweight map-transition clouds."
);
assert(
  loginPreloadBytes <= MAX_LOGIN_PRELOAD_BYTES,
  `Login image preloads are ${mib(loginPreloadBytes)}; budget is ${mib(MAX_LOGIN_PRELOAD_BYTES)}.`
);

const staticCacheMatch = serviceWorkerSource.match(/const STATIC_CACHE_URLS\s*=\s*(\[[\s\S]*?\]);/);
assert(staticCacheMatch, "Could not read STATIC_CACHE_URLS from service-worker.js.");
const staticCacheUrls = JSON.parse(staticCacheMatch[1]);
assert.equal(new Set(staticCacheUrls).size, staticCacheUrls.length, "STATIC_CACHE_URLS contains duplicate requests.");

let installPrecacheBytes = 0;
for (const url of staticCacheUrls) {
  const relativePath = localPathFromUrl(url);
  assert(fs.existsSync(path.join(root, relativePath)), `Precached file ${url} is missing.`);
  installPrecacheBytes += /\.(?:css|html|js|json|webmanifest)$/i.test(relativePath)
    ? normalizedTextBytes(relativePath)
    : statBytes(relativePath);
}
assert(
  installPrecacheBytes <= MAX_INSTALL_PRECACHE_BYTES,
  `Service-worker installation cache is ${mib(installPrecacheBytes)}; budget is ${mib(MAX_INSTALL_PRECACHE_BYTES)}.`
);

const retiredPrecacheMasters = [
  "assets/loading-ring.png",
  "assets/loading-crown.png",
  "assets/gold-pickup.png",
  "assets/troop-pickup.png",
  "assets/icons/crownlands-icon-512.png",
  "assets/icons/crownlands-maskable-512.png",
];
for (const retiredPath of retiredPrecacheMasters) {
  assert(
    !staticCacheUrls.some(url => localPathFromUrl(url) === retiredPath),
    `${retiredPath} is source artwork and must not be fetched during service-worker installation.`
  );
}

const precachedOptimizedArt = staticCacheUrls
  .map(localPathFromUrl)
  .filter(relativePath => relativePath.startsWith("assets/optimized/"));
assert.deepEqual(
  precachedOptimizedArt.sort(),
  ["loading-ring", "login-background"]
    .map(id => manifest.assets.find(asset => asset.id === id)?.output)
    .sort(),
  "Only the essential login background and loading ring belong in the installation cache; decorative loading art and transition clouds are runtime-cached."
);
for (const runtimeOnlyPage of ["about.html", "how-to-play.html", "game-rules.html", "support.html", "privacy.html", "site-info.css", "daily-rewards.css", "common-gear-ui.css", "common-gear-ui.js", "audio-manager.js"]) {
  assert(
    !staticCacheUrls.some(url => localPathFromUrl(url) === runtimeOnlyPage),
    `${runtimeOnlyPage} should be cached on demand, not during service-worker installation.`
  );
}
for (const requiredShellFile of [
  "index.html",
  "manifest.webmanifest",
  "styles.css",
  "holding-tower-ui.css",
  "interface-theme.css",
  "manuscript-prototype.css",
  "ui-contrast-correction.css",
  "profile-theme.css",
  "crownlands-palette.css",
  "action-buttons.css",
  "mobile-viewport.css",
  "base-cities.js",
  "instant-economy-actions.js",
  "holding-tower-ui.js",
  "game.js",
  "animation-manager.js",
  "firebaseClient.js",
  "route-worker.js",
  "assets/map-editor-data.js",
]) {
  assert(
    staticCacheUrls.some(url => localPathFromUrl(url) === requiredShellFile),
    `${requiredShellFile} is missing from the offline game shell.`
  );
}

assert.equal(manifest.schemaVersion, 1, "Unknown optimized-art manifest version.");
assert(Array.isArray(manifest.assets) && manifest.assets.length >= 40, "The optimized-art manifest is incomplete.");

const appReferenceSource = [indexSource, gameSource, commonGearUiScriptSource, baseCitiesSource, commonGearSource, instantEconomyActionsSource, stylesSource, commonGearUiSource, interfaceThemeSource, manuscriptPrototypeSource, uiContrastCorrectionSource, profileThemeSource, crownlandsPaletteSource, actionButtonsSource, mobileViewportSource, siteInfoSource].join("\n");
let optimizedBytes = 0;
let sourceBytes = 0;
for (const asset of manifest.assets) {
  const sourcePath = path.join(root, asset.source);
  const outputPath = path.join(root, asset.output);
  assert(fs.existsSync(sourcePath), `Source master ${asset.source} is missing.`);
  assert(fs.existsSync(outputPath), `Optimized derivative ${asset.output} is missing.`);

  const payload = fs.readFileSync(outputPath);
  const digest = crypto.createHash("sha256").update(payload).digest("hex");
  const webp = getWebpMetadata(payload);
  assert.equal(payload.length, asset.bytes, `${asset.id} byte count drifted from the manifest.`);
  assert.equal(digest, asset.sha256, `${asset.id} hash drifted from the manifest.`);
  assert(asset.output.includes(digest.slice(0, 12)), `${asset.id} filename is not content hashed.`);
  assert(
    asset.output.includes(`-${asset.width}x${asset.height}-`),
    `${asset.id} filename must advertise its browser dimensions.`
  );
  assert.equal(webp.width, asset.width, `${asset.id} encoded width drifted from the manifest.`);
  assert.equal(webp.height, asset.height, `${asset.id} encoded height drifted from the manifest.`);
  if (asset.hasAlpha) assert(webp.hasAlpha, `${asset.id} lost its transparent background.`);
  assert(
    payload.length <= categoryFileBudgets[asset.category],
    `${asset.id} is ${(payload.length / 1024).toFixed(1)} KiB; ${asset.category} budget is ${(categoryFileBudgets[asset.category] / 1024).toFixed(0)} KiB.`
  );
  assert(
    appReferenceSource.includes(asset.output),
    `${asset.id} was generated but the shipped client does not reference ${asset.output}.`
  );

  optimizedBytes += payload.length;
  sourceBytes += fs.statSync(sourcePath).size;
}
assert(optimizedBytes <= MAX_OPTIMIZED_ART_BYTES, `Optimized art totals ${mib(optimizedBytes)}; budget is ${mib(MAX_OPTIMIZED_ART_BYTES)}.`);
assert(optimizedBytes <= sourceBytes * 0.1, "Optimized derivatives must remain at least 90% smaller than their source masters.");

let fullMapBytes = 0;
let thumbnailBytes = 0;
const thumbnailEntries = new Map(thumbnailManifest.thumbnails.map(entry => [entry.output, entry]));
assert.equal(thumbnailEntries.size, 20, "The fingerprinted thumbnail manifest must cover all 20 maps.");
for (const map of layout.maps || []) {
  const fullMapPath = String(map.imageSrc || "");
  const thumbnailPath = String(map.thumbnailSrc || "");
  assert(fullMapPath.endsWith(".webp"), `${map.id} full map is not WebP.`);
  assert(thumbnailPath.endsWith(".webp"), `${map.id} thumbnail is not WebP.`);
  assert(
    thumbnailPath.startsWith("assets/worlds/world_01/thumbnails/versioned/"),
    `${map.id} must ship a content-hashed thumbnail.`
  );
  const thumbnailEntry = thumbnailEntries.get(thumbnailPath);
  assert(thumbnailEntry, `${map.id} thumbnail is missing from thumbnail-manifest.json.`);
  const thumbnailPayload = fs.readFileSync(path.join(root, thumbnailPath));
  const thumbnailDigest = crypto.createHash("sha256").update(thumbnailPayload).digest("hex");
  assert.equal(thumbnailDigest, thumbnailEntry.sha256, `${map.id} thumbnail fingerprint is stale.`);
  assert(thumbnailPath.includes(thumbnailDigest.slice(0, 12)), `${map.id} thumbnail filename is not content hashed.`);
  const mapBytes = statBytes(fullMapPath);
  assert(mapBytes <= MAX_WORLD_MAP_BYTES, `${map.id} is ${(mapBytes / 1024).toFixed(1)} KiB; map budget is 750 KiB.`);
  fullMapBytes += mapBytes;
  thumbnailBytes += statBytes(thumbnailPath);
}
assert(
  thumbnailBytes <= MAX_WORLD_THUMBNAIL_TOTAL_BYTES,
  `World thumbnails total ${(thumbnailBytes / 1024).toFixed(1)} KiB; budget is 500 KiB.`
);

for (const [relativePath, budget] of Object.entries(entrypointBudgets)) {
  const bytes = normalizedTextBytes(relativePath);
  assert(bytes <= budget, `${relativePath} is ${(bytes / 1024).toFixed(1)} KiB; budget is ${(budget / 1024).toFixed(0)} KiB.`);
}

assert.match(
  serviceWorkerSource,
  /if \(isWorldMapImageRequest\(url\)\) return Response\.error\(\);[\s\S]*IMAGE_FALLBACK_SVG/,
  "A failed world map must surface as an error before the generic image fallback is considered."
);
assert.match(
  netlifySource,
  /for = "\/assets\/optimized\/\*"[\s\S]*?max-age=31536000, immutable/,
  "Content-hashed optimized artwork needs immutable caching."
);
function getHeaderBlock(route) {
  const escapedRoute = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return netlifySource.match(new RegExp(
    `\\[\\[headers\\]\\]\\s*\\r?\\n\\s*for = "${escapedRoute}"([\\s\\S]*?)(?=\\r?\\n\\[\\[headers\\]\\]|$)`,
  ))?.[1] || "";
}

const mutableThumbnailHeaders = getHeaderBlock("/assets/worlds/world_01/thumbnails/*");
const versionedThumbnailHeaders = getHeaderBlock("/assets/worlds/world_01/thumbnails/versioned/*");
assert.match(mutableThumbnailHeaders, /max-age=3600/, "Editable source thumbnails need bounded caching.");
assert.doesNotMatch(mutableThumbnailHeaders, /immutable/, "Editable source thumbnails must not be immutable.");
assert.match(
  versionedThumbnailHeaders,
  /max-age=31536000, immutable/,
  "Content-hashed shipped thumbnails need immutable caching."
);

console.log(
  `Asset budgets passed: ${mib(loginPreloadBytes)} login preload, ${mib(installPrecacheBytes)} install cache, `
  + `${mib(optimizedBytes)} optimized art from ${mib(sourceBytes)} of masters, ${mib(fullMapBytes)} world maps, `
  + `${mib(thumbnailBytes)} thumbnails.`
);
