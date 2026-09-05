const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");

function requireMatch(source, pattern, message) {
  assert.match(source, pattern, message);
}

function readArray(source, declarationName) {
  const match = source.match(new RegExp(`const ${declarationName}\\s*=\\s*(\\[[\\s\\S]*?\\]);`));
  assert(match, `Could not read ${declarationName}.`);
  return JSON.parse(match[1]);
}

const managerSource = read("animation-manager.js");
const gameSource = read("game.js");
const firebaseClientSource = read("firebaseClient.js");
const indexSource = read("index.html");
const stylesSource = `${read("styles.css")}\n${read("interface-theme.css")}`;
const serverSource = read("functions/index.js");
const serviceWorkerSource = read("service-worker.js");
const buildSource = read("tools/build-production-client.js");
const releaseManifestSource = read("tools/generate-release-manifest.js");
const productionValidatorSource = read("tools/validate-production-artifact.js");
const editorServerSource = read("tools/editor-server.js");
const assetBudgetSource = read("tools/validate-asset-performance-budgets.js");
const functionsPackage = JSON.parse(read("functions/package.json"));

requireMatch(
  managerSource,
  /window\.CrownlandsAnimations\s*=/,
  "The animation manager must expose window.CrownlandsAnimations."
);
requireMatch(
  managerSource,
  /prefers-reduced-motion/,
  "The animation manager must honor the operating-system reduced-motion preference."
);
requireMatch(
  managerSource,
  /crownlands\.animation\.mode\.v1/,
  "The animation preference needs a stable, versioned storage key."
);

const requiredMethods = [
  "init",
  "emit",
  "captureAnchor",
  "setMode",
  "getMode",
  "getEffectiveMode",
  "beginMapTransition",
  "finishMapTransition",
  "cancelMapTransition",
  "cancelScope",
  "clearAll",
];
for (const method of requiredMethods) {
  requireMatch(managerSource, new RegExp(`\\b${method}\\b`), `Animation manager API is missing ${method}().`);
}

const requiredEffectTypes = [
  "city-attack",
  "city-capture",
  "city-upgrade",
  "reward-gold",
  "reward-troops",
  "camp-gold",
  "camp-warband",
  "camp-relic",
  "camp-deed",
  "deed-completed",
];
for (const effectType of requiredEffectTypes) {
  assert(managerSource.includes(`"${effectType}"`) || managerSource.includes(`'${effectType}'`),
    `Animation manager is missing the ${effectType} effect contract.`);
}

for (const elementId of ["mapTransitionStage", "mapVfxLayer", "screenVfxLayer", "animationModeStatus"]) {
  requireMatch(indexSource, new RegExp(`id="${elementId}"`), `The animation integration is missing #${elementId}.`);
}
assert(
  indexSource.indexOf("animation-manager.js") < indexSource.indexOf("game.js"),
  "animation-manager.js must load before game.js."
);
for (const mode of ["full", "reduced", "off"]) {
  requireMatch(indexSource, new RegExp(`data-animation-mode-option="${mode}"`), `Settings is missing the ${mode} animation option.`);
}
requireMatch(gameSource, /CrownlandsAnimations/, "game.js does not connect to the animation manager.");
requireMatch(gameSource, /crownlandsAnimations\?\.init\?\.\(\{[\s\S]*?worldLayer:\s*mapVfxLayer[\s\S]*?screenLayer:\s*screenVfxLayer/, "game.js does not initialize both VFX layers.");
const gameEffectContracts = {
  "city-attack": /["']city-attack["']/,
  "city-capture": /["']city-capture["']/,
  "city-upgrade": /["']city-upgrade["']/,
  "reward-gold": /playRewardAnimation\("gold"/,
  "reward-troops": /playRewardAnimation\("troops"/,
  "camp-gold": /["']camp-gold["']/,
  "camp-warband": /["']camp-warband["']/,
  "camp-relic": /["']camp-relic["']/,
  "camp-deed": /["']camp-deed["']/,
  "deed-completed": /["']deed-completed["']/,
};
for (const [effectType, pattern] of Object.entries(gameEffectContracts)) {
  requireMatch(gameSource, pattern, `game.js is missing its ${effectType} integration hook.`);
}
requireMatch(gameSource, /beginMapTransition\(\{[\s\S]*?root:\s*mapFrame[\s\S]*?stage:\s*mapTransitionStage/, "Map switching must use the lightweight live map stage.");
requireMatch(gameSource, /watchdogMs:\s*45000/, "Map transitions need enough watchdog time for a valid slow island load.");
requireMatch(
  gameSource,
  /function getMapTransitionDirection\([\s\S]*?getIslandMapGridCoordinate\(sourceRegion\)[\s\S]*?Math\.abs\(deltaX\)\s*>=\s*Math\.abs\(deltaY\)[\s\S]*?"east"\s*:\s*"west"[\s\S]*?"south"\s*:\s*"north"/,
  "Map-picker transitions must derive a cardinal cloud direction from map-grid coordinates."
);
assert.doesNotMatch(
  gameSource,
  /function getMapTransitionDirection\([^)]*fromMapPicker[^)]*\)\s*\{\s*if\s*\(fromMapPicker\)\s*return\s*"none"/,
  "Map-picker transitions must not fall back to a directionless fade."
);
requireMatch(
  gameSource,
  /function isMapInteractionBlocked\(\)[\s\S]*?mapTransitionStage\?\.classList\.contains\("is-transitioning"\)/,
  "Map input must remain blocked through the visual settle phase."
);
assert.doesNotMatch(gameSource, /await\s+(?:begin|finish)MapVisualTransition/, "Map state must not wait for transition completion.");
requireMatch(gameSource, /prefers-reduced-motion:\s*reduce/, "game.js must honor the operating-system reduced-motion preference.");
requireMatch(gameSource, /eventKind:\s*String\(report\.eventKind\s*\|\|\s*""\)/, "The client drops Deed completion event metadata.");
requireMatch(
  gameSource,
  /function getVisibleMainCityTroopRewardDestination\(destinationCityId = "", destinationRegionId = ""\)[\s\S]*?destinationCityId \|\| state\?\.mainCityId[\s\S]*?getActiveMapRegionId\(\)[\s\S]*?getBoundingClientRect\(\)/,
  "Troop reward effects must target the rendered Main City when it is in the active viewport."
);
requireMatch(
  gameSource,
  /getVisibleMainCityTroopRewardDestination\(destinationCityId, destinationRegionId\)[\s\S]*?\|\| getVisibleTroopRewardDestination\(\)/,
  "Troop reward effects must fall back to the player profile UI when the Main City is not visible."
);
assert.doesNotMatch(
  gameSource,
  /pendingTroopRewardHighlights|queueTroopRewardDestinationHighlight|flushPendingTroopRewardHighlights/,
  "Troop reward effects must not queue a later off-map city pulse instead of using the profile fallback."
);
requireMatch(gameSource, /const cityBattleId\s*=\s*String\([\s\S]*?\.battleId/, "City attack VFX must require authoritative battle evidence.");
assert.doesNotMatch(
  gameSource,
  /previousVisibleOnlineArmiesForVfx|onlineArmyVfxHydrated/,
  "Army disappearance must not fabricate city combat before an authoritative result."
);
assert.doesNotMatch(
  gameSource,
  /Boolean\(after\.deedCampId\s*&&\s*after\.deedAwardedAtMs\)/,
  "Historical Deed provenance must not suppress a later legitimate combat capture."
);
requireMatch(
  gameSource,
  /freshCombatCapture\s*=\s*after\.lastCapturedAtMs\s*>\s*before\.lastCapturedAtMs/,
  "Realtime ownership fallback must require a newly advanced capture timestamp."
);
requireMatch(gameSource, /seenWorldAnimationEventIds/, "Cross-channel city effects need a bounded game-level dedupe ledger.");
requireMatch(gameSource, /cityId:\s*String\(options\.cityId\s*\|\|\s*rewardCity\?\.id/, "Level-up reward bundles must retain their credited troop city ID.");
requireMatch(gameSource, /levelUpReward:\s*result\.currentUser\.levelUpReward/, "Combat rewards must use the server-confirmed level-up receipt and troop destination.");
requireMatch(
  serverSource,
  /function finalizeLevelUpReward[\s\S]*?troopCredit\?\.cityId[\s\S]*?troopCredit\?\.cityName/,
  "Combat resolution must embed the caller's authoritative troop destination in its level-up receipt."
);
requireMatch(gameSource, /requestedHost\s*=\s*host\?\.isConnected[\s\S]*?host\.open/, "Reward effects must not render inside a closed dialog.");
requireMatch(
  firebaseClientSource,
  /onSnapshot\(\s*reportsQuery,\s*\{\s*includeMetadataChanges:\s*true\s*\}/,
  "Report hydration relies on metadata-only cache-to-server snapshot updates."
);
requireMatch(firebaseClientSource, /fromCache:\s*Boolean\(snapshot\.metadata\?\.fromCache\)/, "Report snapshots must expose cache provenance.");
const oneShotReportLoadStart = gameSource.indexOf("async function loadServerReportsOnce");
const oneShotReportLoadEnd = gameSource.indexOf("function subscribeOnlineServerReports", oneShotReportLoadStart);
assert(oneShotReportLoadStart >= 0 && oneShotReportLoadEnd > oneShotReportLoadStart, "Could not isolate one-shot report loading.");
assert.doesNotMatch(
  gameSource.slice(oneShotReportLoadStart, oneShotReportLoadEnd),
  /authoritative:\s*true/,
  "A default getDocs() result may be cached and must not mark report VFX hydration authoritative."
);
for (const selector of [".crownlands-vfx--city-attack", ".crownlands-vfx--city-capture", ".crownlands-vfx--reward-gold", ".crownlands-map-transition"]) {
  assert(stylesSource.includes(selector), `styles.css is missing ${selector}.`);
}
requireMatch(stylesSource, /html\[data-animation-mode="off"\]/, "styles.css is missing Animations Off behavior.");
requireMatch(stylesSource, /html\[data-animation-mode="reduced"\]/, "styles.css is missing Reduced Animations behavior.");
requireMatch(
  stylesSource,
  /\.map-transition-stage\.is-transitioning\s+\.map-world\s*\{[\s\S]*?pointer-events:\s*none/,
  "Map hit testing must stay disabled while the fog transition is active."
);
requireMatch(
  stylesSource,
  /\.map-transition-stage\.is-transitioning\s*\{(?=[^}]*opacity:\s*1)(?=[^}]*transform:\s*translate3d\(0,\s*0,\s*0\))[^}]*\}/,
  "The live map stage must remain fixed and opaque throughout map transfer."
);
assert.doesNotMatch(
  stylesSource,
  /crownlandsMapStage(?:Leave|Enter|Reduced)/,
  "Map transfer must not translate or fade the live map stage."
);
requireMatch(
  stylesSource,
  /\.crownlands-map-transition__part--mist\s*\{(?=[^}]*inset:\s*-30%)(?=[^}]*#e8e9df)(?=[^}]*will-change:\s*transform,\s*opacity)[^}]*\}/,
  "The cloud transition needs an overscanned opaque pale-mist cover."
);
requireMatch(
  stylesSource,
  /crownlands-map-transition--east[\s\S]*?crownlands-map-transition__part--mist[\s\S]*?mask-image:\s*linear-gradient\(to right,\s*transparent 0%,\s*#000 16%,\s*#000 84%,\s*transparent 100%\)/,
  "Directional mist needs a feathered edge instead of exposing a rectangular curtain."
);
requireMatch(
  stylesSource,
  /\.crownlands-map-transition__part--cloud-back,[\s\S]*?map-transition-clouds-448x448-[a-f0-9]{12}\.webp[\s\S]*?will-change:\s*transform,\s*opacity/,
  "The transition must use the optimized painterly cloud texture on GPU-friendly layers."
);
requireMatch(stylesSource, /@keyframes crownlandsMapMistCover/, "The directional pale-mist cover animation is missing.");
requireMatch(stylesSource, /@keyframes crownlandsMapMistReveal/, "The directional pale-mist reveal animation is missing.");
requireMatch(stylesSource, /@keyframes crownlandsMapCloudCover/, "The painterly cloud cover animation is missing.");
requireMatch(stylesSource, /@keyframes crownlandsMapCloudReveal/, "The painterly cloud reveal animation is missing.");
requireMatch(managerSource, /Number\.isFinite\(Number\(event\.coverDurationMs\)\)\s*\?\s*event\.coverDurationMs\s*:\s*420/, "Full cloud cover must default to 420ms.");
requireMatch(managerSource, /options\.duration,\s*240,\s*900\)\)\s*:\s*520/, "Full cloud reveal must default to 520ms.");
for (const part of ["mist", "cloud-back", "cloud-front"]) {
  requireMatch(managerSource, new RegExp(`createMapTransitionPart\\(element, "${part}"\\)`), `Map transitions are missing their ${part} layer.`);
}
requireMatch(
  managerSource,
  /transitionCoverReadyAt[\s\S]*?remainingCoverMs[\s\S]*?transitionRevealScheduled/,
  "An early map load must defer only the visual reveal until the clouds fully cover the map."
);
requireMatch(
  stylesSource,
  /\.map-frame\.map-switching\s*\{[\s\S]*?background:[\s\S]*?#071218/,
  "Map switching needs a dark fallback instead of the normal blue ocean background."
);
requireMatch(
  stylesSource,
  /\.map-frame\.map-switching\s+\.map-loading-panel\s*\{[\s\S]*?650ms\s+forwards/,
  "The map loading panel must wait briefly so cached switches do not flash a spinner."
);

class FakeElement {
  constructor() {
    this.nodeType = 1;
    this.children = [];
    this.dataset = {};
    this.isConnected = true;
    this.parentNode = null;
    this.style = {
      setProperty() {},
      removeProperty() {},
    };
    const classNames = new Set();
    this.classList = {
      add(...tokens) { tokens.forEach(token => classNames.add(String(token))); },
      remove(...tokens) { tokens.forEach(token => classNames.delete(String(token))); },
      toggle(token, force) {
        const key = String(token);
        const enabled = force === undefined ? !classNames.has(key) : Boolean(force);
        if (enabled) classNames.add(key);
        else classNames.delete(key);
        return enabled;
      },
      contains(token) { return classNames.has(String(token)); },
    };
  }

  append(...children) {
    for (const child of children) {
      child.parentNode = this;
      this.children.push(child);
    }
  }

  appendChild(child) {
    this.append(child);
    return child;
  }

  remove() {
    this.isConnected = false;
  }

  removeChild(child) {
    this.children = this.children.filter(entry => entry !== child);
    child.parentNode = null;
    return child;
  }

  setAttribute() {}
  removeAttribute() {}
  addEventListener() {}
  removeEventListener() {}
  querySelector() { return null; }
  querySelectorAll() { return []; }
  closest() { return null; }
  getBoundingClientRect() {
    return { left: 0, top: 0, right: 10, bottom: 10, width: 10, height: 10, x: 0, y: 0 };
  }

  animate() {
    return {
      finished: Promise.resolve(),
      cancel() {},
      finish() {},
      addEventListener() {},
      removeEventListener() {},
    };
  }
}

const mediaQuery = {
  matches: false,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
};
const storage = new Map();
const fakeDocument = {
  body: new FakeElement(),
  documentElement: new FakeElement(),
  createElement: () => new FakeElement(),
  createDocumentFragment: () => new FakeElement(),
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {},
  removeEventListener() {},
};
const sandbox = {
  AbortController,
  CSS: { escape: value => String(value) },
  Element: FakeElement,
  HTMLElement: FakeElement,
  Node: FakeElement,
  Promise,
  URL,
  addEventListener() {},
  removeEventListener() {},
  crypto: { randomUUID: () => "00000000-0000-4000-8000-000000000000" },
  clearTimeout,
  console,
  document: fakeDocument,
  getComputedStyle: () => ({ getPropertyValue: () => "", transform: "none" }),
  localStorage: {
    getItem: key => storage.get(key) || null,
    removeItem: key => storage.delete(key),
    setItem: (key, value) => storage.set(key, String(value)),
  },
  matchMedia: () => mediaQuery,
  innerHeight: 768,
  innerWidth: 1024,
  scrollX: 0,
  scrollY: 0,
  performance: { now: () => 1 },
  requestAnimationFrame: () => 1,
  cancelAnimationFrame() {},
  setTimeout,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(managerSource, sandbox, { filename: "animation-manager.js" });
const animations = sandbox.CrownlandsAnimations;
assert(animations && typeof animations === "object", "Animation manager did not install its browser global.");
for (const method of requiredMethods) {
  assert.equal(typeof animations[method], "function", `Animation manager runtime API is missing ${method}().`);
}

const initialMode = animations.getMode();
assert(["auto", "full", "reduced", "off"].includes(initialMode), "Animation manager returned an unknown preference mode.");
animations.setMode("reduced", { persist: false });
assert.equal(animations.getMode(), "reduced", "Reduced animation mode did not apply.");
assert.equal(animations.getEffectiveMode(), "reduced", "Reduced animation mode did not become effective.");
animations.setMode("off", { persist: false });
assert.equal(animations.getEffectiveMode(), "off", "Off animation mode did not become effective.");
assert.equal(animations.emit("city-attack", {}), null, "String-form emit must be a no-op while animations are off.");
assert.equal(animations.emit({ type: "city-attack" }), null, "Object-form emit must be a no-op while animations are off.");
mediaQuery.matches = true;
animations.setMode("auto", { persist: false });
assert.equal(animations.getEffectiveMode(), "reduced", "Auto mode did not honor prefers-reduced-motion.");
mediaQuery.matches = false;
let frameClock = 10000;
animations.sampleFrame(frameClock, false);
for (let index = 0; index < 34; index++) animations.sampleFrame(frameClock += 30);
assert.equal(animations.getEffectiveMode(), "full", "One slow window must not oscillate quality.");
for (let index = 0; index < 34; index++) animations.sampleFrame(frameClock += 30);
assert.equal(animations.getEffectiveMode(), "reduced", "Sustained frame pressure should reduce automatic effects.");
animations.setMode("full", { persist: false });
assert.equal(animations.getEffectiveMode(), "full", "Adaptive effects must preserve an explicit Full preference.");
animations.setMode("auto", { persist: false });
for (let index = 0; index < 400; index++) animations.sampleFrame(frameClock += 16);
assert.equal(animations.getEffectiveMode(), "full", "Sustained recovery should restore automatic effects.");
for (let index = 0; index < 200; index++) animations.sampleFrame(frameClock += 1000, false);
assert.equal(animations.getEffectiveMode(), "full", "Background gaps must not reduce animation quality.");
animations.clearAll("static-validator");
animations.setMode(initialMode, { persist: false });

const transitionRoot = new FakeElement();
const transitionStage = new FakeElement();
animations.init({ transitionRoot, mapStage: transitionStage, mode: "full" });
const mapTransition = animations.beginMapTransition({
  root: transitionRoot,
  stage: transitionStage,
  direction: "east",
  coverDurationMs: 420,
});
assert(mapTransition, "The cloud map transition did not start.");
for (const part of ["mist", "cloud-back", "cloud-front"]) {
  assert(
    mapTransition.element.children.some(child => String(child.className).includes(`crownlands-map-transition__part--${part}`)),
    `The runtime map transition is missing its ${part} layer.`
  );
}
assert(transitionStage.classList.contains("is-transitioning"), "Map interaction guard did not activate.");
assert(!transitionStage.classList.contains("is-leaving"), "The live map stage must not receive a leaving animation.");
assert(animations.finishMapTransition(mapTransition.token), "An early map transition finish was not accepted.");
assert.equal(mapTransition.element.dataset.phase, "loading", "Early finish must hold the cloud cover before reveal.");
assert(!transitionStage.classList.contains("is-entering"), "The live map stage must not receive an entering animation.");
assert(animations.cancelMapTransition("static-validator", mapTransition.token), "Cloud transition cleanup failed.");
assert(!transitionStage.classList.contains("is-transitioning"), "Cloud transition cleanup left map input blocked.");
animations.setMode(initialMode, { persist: false });

const reportStart = serverSource.indexOf("function makeReport({");
const reportEnd = serverSource.indexOf("exports.markReportsViewed", reportStart);
const reportSource = serverSource.slice(reportStart, reportEnd);
assert(reportSource, "Could not isolate makeReport().");
for (const field of ["rewardEventId", "rewardSourceId", "rewardSourceRegionId"]) {
  requireMatch(reportSource, new RegExp(`\\b${field}\\s*=\\s*""`), `makeReport() is missing optional ${field} input.`);
  requireMatch(reportSource, new RegExp(`\\{\\s*${field}:`), `makeReport() does not serialize ${field}.`);
}

const payoutStart = serverSource.indexOf("async function resolveRewardCampPayoutByRef");
const payoutEnd = serverSource.indexOf("async function resolveRewardCampPayoutAndStats", payoutStart);
const payoutSource = serverSource.slice(payoutStart, payoutEnd);
assert(payoutSource, "Could not isolate the reward-camp payout transaction.");
requireMatch(
  payoutSource,
  /const deedCompletionMetadata\s*=\s*deedCityPatch\s*\?\s*\{[\s\S]*?eventKind:\s*"deed_camp_completed"/,
  "Deed completion metadata must only exist when an eligible city was actually awarded."
);
requireMatch(
  payoutSource,
  /rewardEventId:\s*safeString\([\s\S]*?deed_camp_completed_\$\{camp\.id\}_\$\{deedCityPatch\.id\}_\$\{payoutAtMs\}[\s\S]*?\.replace\(\/\[\^a-zA-Z0-9_-\]\//,
  "Deed completion rewardEventId must be stable across transaction retries and safe for client deduplication."
);
requireMatch(payoutSource, /rewardSourceId:\s*safeString\(camp\.id,\s*96\)/, "Deed completion metadata is missing its source camp ID.");
requireMatch(
  payoutSource,
  /rewardSourceRegionId:\s*safeString\(normalizeRegionId\(camp\.regionId\),\s*80\)/,
  "Deed completion metadata is missing its normalized source region."
);
assert.equal(
  [...payoutSource.matchAll(/\.\.\.\(deedCompletionMetadata \|\| \{\}\)/g)].length,
  2,
  "The same Deed completion metadata must be shared by the persisted report and direct payout result."
);

const staticCacheUrls = readArray(serviceWorkerSource, "STATIC_CACHE_URLS");
assert(
  staticCacheUrls.some(url => new URL(url, "https://crownlands.test/").pathname === "/animation-manager.js"),
  "animation-manager.js is missing from the offline game shell."
);
requireMatch(buildSource, /"animation-manager\.js"/, "Production client build omits animation-manager.js.");
requireMatch(releaseManifestSource, /"animation-manager\.js"/, "Release source hashing omits animation-manager.js.");
requireMatch(productionValidatorSource, /"animation-manager\.js"/, "Production artifact validation does not require animation-manager.js.");
requireMatch(editorServerSource, /"\/animation-manager\.js"/, "The local editor server cannot serve animation-manager.js.");
requireMatch(
  assetBudgetSource,
  /"animation-manager\.js":\s*80\s*\*\s*1024/,
  "animation-manager.js is missing its 80 KiB entrypoint budget."
);
requireMatch(
  assetBudgetSource,
  /requiredShellFile[\s\S]*?"animation-manager\.js"/,
  "Asset validation does not require animation-manager.js in the offline shell."
);
assert(functionsPackage.scripts.lint.includes("node --check ../animation-manager.js"), "Lint does not syntax-check animation-manager.js.");
assert(functionsPackage.scripts.lint.includes("../animation-manager.js ../audio-manager.js"), "ESLint does not inspect animation-manager.js.");
assert(functionsPackage.scripts.test.includes("node ../tools/validate-animation-system.js"), "The animation validator is not part of the static test gate.");

console.log("Validated animation runtime, game/UI hooks, motion modes, Deed metadata, offline delivery, release packaging, and performance budgets.");
