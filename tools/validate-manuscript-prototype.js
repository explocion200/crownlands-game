const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const resolve = relativePath => path.join(root, ...relativePath.split("/"));
const read = relativePath => fs.readFileSync(resolve(relativePath), "utf8");
const readBytes = relativePath => fs.readFileSync(resolve(relativePath));
const normalizedTextBytes = relativePath => Buffer.byteLength(read(relativePath).replace(/\r\n/g, "\n"), "utf8");
const exists = relativePath => fs.existsSync(resolve(relativePath));
const sha256 = relativePath => crypto.createHash("sha256").update(readBytes(relativePath)).digest("hex");
const jpegDimensions = bytes => {
  assert.equal(bytes[0], 0xff, "Screenshot must be a JPEG image.");
  assert.equal(bytes[1], 0xd8, "Screenshot must be a JPEG image.");
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
    const length = bytes.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  throw new Error("Could not read JPEG dimensions.");
};

const css = read("manuscript-prototype.css");
const index = read("index.html");
const baseStyles = `${read("styles.css")}\n${read("interface-theme.css")}`;
const serviceWorker = read("service-worker.js");
const productionBuilder = read("tools/build-production-client.js");
const releaseManifest = read("tools/generate-release-manifest.js");
const assetBudget = read("tools/validate-asset-performance-budgets.js");
const capture = read("docs/visual-qa/ui-manuscript-prototype/capture.html");
const gallery = read("docs/visual-qa/ui-manuscript-prototype/index.html");
const notes = read("docs/visual-qa/ui-manuscript-prototype/QA_NOTES.md");
const metrics = JSON.parse(read("docs/visual-qa/ui-manuscript-prototype/metrics.json"));

assert.ok(Buffer.byteLength(css) <= 64 * 1024, "The manuscript controller must stay within its 64 KiB budget.");
for (const token of [
  "--manuscript-paper",
  "--manuscript-ink",
  "--manuscript-burgundy",
  "--manuscript-rust",
  "--manuscript-ochre",
  "--manuscript-moss",
  "--manuscript-indigo",
  "--manuscript-button-primary",
]) assert.ok(css.includes(token), `Missing manuscript design token ${token}.`);

for (const selector of [
  ".profile-screen",
  ".shop-modal",
  ".daily-missions-section",
  ".troop-slider-modal",
  ".battle-report-modal",
]) assert.ok(css.includes(selector), `Missing prototype scope ${selector}.`);

assert.doesNotMatch(css, /font-family\s*:/i, "The prototype must not change the existing font assignments.");
assert.doesNotMatch(css, /@font-face|@import/i, "The prototype must not introduce a font or stylesheet dependency.");
assert.doesNotMatch(css, /login-background|game-menu-background|\.setup-screen/i, "The prototype must not alter the login artwork.");
assert.doesNotMatch(baseStyles, /\.setup-card::after/, "The unintended login-card status orb must remain removed.");

const expectedFontHref = "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800;900&family=Cinzel+Decorative:wght@700;900&family=IM+Fell+English:ital@0;1&display=swap";
assert.ok(index.includes(expectedFontHref), "The existing Crownlands font import changed.");
assert.ok(capture.includes(expectedFontHref), "The QA fixture must use the production font import.");
const readabilityPosition = index.indexOf("readability.css");
const prototypePosition = index.indexOf("manuscript-prototype.css");
assert.ok(readabilityPosition >= 0 && prototypePosition > readabilityPosition, "The prototype stylesheet must load after readability.css.");

assert.equal(
  sha256("assets/game-menu-background.jpg"),
  "2ee59f7455eea48d070f84c83fbacfef1cd865d69a5a48caf714b5ef2670a75d",
  "The original login background changed.",
);
assert.equal(
  sha256("assets/optimized/login-background-1448x1086-c8507d1988d6.webp"),
  "c8507d1988d6ae1badcf494911bfa8f47a4923032042a01507a296bda57d377e",
  "The optimized login background changed.",
);

for (const source of [serviceWorker, productionBuilder, releaseManifest, assetBudget]) {
  assert.ok(source.includes("manuscript-prototype.css"), "The prototype stylesheet is missing from release packaging or validation.");
}
const staticCacheSource = serviceWorker.match(/const STATIC_CACHE_URLS\s*=\s*(\[[\s\S]*?\]);/);
assert.ok(staticCacheSource, "Could not read the service-worker installation cache.");
const staticCacheUrls = JSON.parse(staticCacheSource[1]);
const staticCacheBytes = staticCacheUrls.reduce((total, url) => {
  const relativePath = url.replace(/^\//, "").split("?")[0];
  return total + (/\.(?:css|html|js|json|webmanifest)$/i.test(relativePath)
    ? normalizedTextBytes(relativePath)
    : fs.statSync(resolve(relativePath)).size);
}, 0);
// Keep this aligned with validate-asset-performance-budgets.js. The 20-region
// current world adds canonical map metadata, while map rasters remain lazy.
// Heraldry v2 adds four small runtime modules, its stylesheet, and the two
// optimized charge sprites so the editor remains usable after installation.
// City XP previews, replay-safe upgrades, and the City List controls use the
// same bounded steps as the main asset-performance validator, including the
// confirmed-row feedback and focus-retention client update. The staged wall
// and production helpers advance the shared allowance by one 16 KiB step.
// Identity guidance and arrows add under one bounded 8 KiB step.
assert.ok(staticCacheBytes <= 3656 * 1024, "The service-worker installation cache exceeds 3656 KiB.");
assert.ok(!staticCacheUrls.some(url => url.includes("audio-manager.js")), "The optional audio controller should be runtime-cached.");

assert.match(gallery, /before-\$\{screen\}-\$\{key\}\.jpg/);
assert.match(gallery, /after-\$\{screen\}-\$\{key\}\.jpg/);
assert.match(notes, /stops after five screens/i);

const screens = ["profile", "shop", "daily", "attack", "battle"];
const viewports = [
  { key: "desktop", width: 1440, height: 900, rasterWidth: 1248 },
  { key: "android-landscape", width: 844, height: 390, rasterWidth: 844 },
];
for (const mode of ["before", "after"]) {
  for (const screen of screens) {
    for (const viewport of viewports) {
      const relativePath = `docs/visual-qa/ui-manuscript-prototype/screenshots/${mode}-${screen}-${viewport.key}.jpg`;
      assert.ok(exists(relativePath), `Missing QA capture ${relativePath}.`);
      const dimensions = jpegDimensions(readBytes(relativePath));
      assert.equal(dimensions.width, viewport.rasterWidth, `${relativePath} has the wrong captured raster width.`);
      assert.equal(dimensions.height, viewport.height, `${relativePath} has the wrong height.`);
    }
  }
}
for (const detail of ["button-treatment", "progress-bar", "list-row", "major-title", "text-readability", "modal-panel"]) {
  const relativePath = `docs/visual-qa/ui-manuscript-prototype/screenshots/detail-${detail}.jpg`;
  assert.ok(exists(relativePath) && readBytes(relativePath).length > 1000, `Missing detail capture ${detail}.`);
}

assert.equal(metrics.length, 20, "Visual QA must record twenty full-screen measurements.");
for (const result of metrics.filter(entry => entry.mode === "after")) {
  assert.equal(result.overflowX, false, `${result.screen} has horizontal overflow at ${result.viewport.join("×")}.`);
  assert.match(result.fonts.body, /Cinzel/i, `${result.screen} lost the existing body font.`);
  assert.match(result.fonts.heading, /Cinzel Decorative/i, `${result.screen} lost the existing heading font.`);
  assert.deepEqual(result.page, result.viewport, `${result.screen} was not measured at its requested viewport.`);
}

console.log("Validated the five-screen manuscript prototype, preserved fonts/login artwork, release packaging, and 20 browser captures.");
