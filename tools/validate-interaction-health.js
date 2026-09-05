"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const game = fs.readFileSync(path.join(root, "game.js"), "utf8");
const worker = fs.readFileSync(path.join(root, "route-worker.js"), "utf8");
const styles = `${fs.readFileSync(path.join(root, "styles.css"), "utf8")}\n${fs.readFileSync(path.join(root, "interface-theme.css"), "utf8")}`;
const actionButtons = fs.readFileSync(path.join(root, "action-buttons.css"), "utf8");

function extractFunction(name) {
  const plainStart = game.indexOf(`function ${name}(`);
  const asyncStart = game.indexOf(`async function ${name}(`);
  const start = [plainStart, asyncStart].filter(index => index >= 0).sort((a, b) => a - b)[0];
  assert.ok(Number.isInteger(start), `Missing ${name}.`);
  const bodyStart = game.indexOf("{", game.indexOf(")", start));
  let depth = 0;
  for (let index = bodyStart; index < game.length; index += 1) {
    if (game[index] === "{") depth += 1;
    if (game[index] === "}") depth -= 1;
    if (depth === 0) return game.slice(start, index + 1);
  }
  throw new Error(`Could not parse ${name}.`);
}

const directScout = extractFunction("scoutTarget");
const automaticServerScout = extractFunction("launchAutomaticServerScout");
const nearestScout = extractFunction("findNearestScoutSourceAsync");
const nearbyScout = extractFunction("getNearbyScoutOptionsAsync");
const regroup = extractFunction("getNearbyRegroupOptionsAsync");
for (const [label, source] of Object.entries({ directScout, nearestScout, nearbyScout, regroup })) {
  assert.doesNotMatch(source, /findLandRoute\s*\(|findRoute\s*\(/, `${label} must not run synchronous routing on the interaction thread.`);
}
assert.match(directScout, /pendingDirectScoutTargets\.has/, "Direct scout clicks must suppress duplicate calculations.");
assert.match(directScout, /usesServerArmyAuthority\(\)[\s\S]*launchAutomaticServerScout/, "Online direct scouts must dispatch target-only without waiting for route batches.");
assert.match(automaticServerScout, /api\.submitRecoverableArmyOrder/, "Online direct scouts must use the canonical army confirmation adapter.");
assert.doesNotMatch(automaticServerScout, /fromId|sourceRegionId\s*:/, "The client must not choose an origin for an automatic online scout.");
assert.match(nearestScout, /await findRoutesAsync/, "Nearest scout selection must use the route worker batch.");
assert.match(nearbyScout, /await findRoutesAsync/, "Scout Nearby must use the route worker batch.");
assert.match(regroup, /await findRoutesAsync/, "Regroup must use the route worker batch.");

const toggleScout = extractFunction("toggleScoutNearby");
const toggleRegroup = extractFunction("toggleRegroup");
const capabilityLookup = extractFunction("getRealmCapabilityVersion");
const authoritativeRouteSupport = extractFunction("supportsAuthoritativeArmyRoutes");
const bulkOrderSupport = extractFunction("supportsBulkArmyOrders");
const bulkOrderAvailability = extractFunction("canUseBulkArmyOrders");
assert.match(capabilityLookup, /verifiedRealmInfo\?\.\[name\][\s\S]*verifiedRealmInfo\?\.features\?\.\[name\]/, "Realm capability versions must accept both top-level and feature payloads.");
assert.match(authoritativeRouteSupport, /authoritativeRoutesVersion/, "Authoritative route previews must require the advertised capability version.");
assert.match(bulkOrderSupport, /bulkOrdersVersion/, "Bulk controls must require the advertised capability version.");
assert.match(bulkOrderAvailability, /!isOnlineWorldActive\(\)[\s\S]*supportsBulkArmyOrders\(\)/, "Offline demos must retain local bulk orders while online realms require the capability.");
assert.match(toggleScout, /canUseBulkArmyOrders\(\)/, "Scout Nearby must reject unsupported online realms.");
assert.match(toggleRegroup, /canUseBulkArmyOrders\(\)/, "Regroup must reject unsupported online realms.");
assert.match(toggleScout, /api\.sendNearbyScouts/, "Online Scout Nearby must use the atomic server callable.");
assert.match(toggleRegroup, /api\.sendRegroupOrders/, "Online Regroup must use the atomic server callable.");
assert.match(toggleScout, /serverBulkOrder[\s\S]*getNearbyScoutCandidates/, "Online Scout Nearby must not wait for route previews before dispatch.");
assert.match(toggleRegroup, /serverBulkOrder[\s\S]*getNearbyRegroupCandidates/, "Online Regroup must not wait for route previews before dispatch.");
assert.match(toggleScout, /requestId:\s*action\.requestId/, "Scout Nearby must send an idempotency key.");
assert.match(toggleRegroup, /requestId:\s*action\.requestId/, "Regroup must send an idempotency key.");
assert.match(toggleRegroup, /route:\s*option\.route/, "Offline Regroup must reuse worker routes instead of recalculating synchronously.");

const routeRequest = extractFunction("requestAuthoritativeOrderRoute");
const routeRefresh = extractFunction("scheduleAuthoritativeRoutePreviewRefresh");
const troopSliderUpdate = extractFunction("updateTroopSliderModal");
const instantRoute = extractFunction("createInstantOrderRoute");
const troopSliderOpen = extractFunction("showTroopSliderModalAsync");
const publishOrder = extractFunction("publishOnlineArmyMovement");
const cityWheel = extractFunction("renderSelectedCityWheel");
const cityFortificationDisplay = extractFunction("getCityFortificationDisplay");
assert.match(routeRequest, /supportsAuthoritativeArmyRoutes\(\)/, "Authoritative preview calls must be capability-gated.");
assert.match(routeRequest, /api\.previewArmyRoute/, "Online order previews must request the authoritative route.");
assert.match(instantRoute, /getCachedAsyncRoute/, "Immediate orders should reuse a cached route when available.");
assert.match(instantRoute, /previewStatus:\s*"estimated"/, "Uncached orders need a clearly marked provisional route.");
assert.ok(
  troopSliderOpen.indexOf("showTroopSliderModalWithRoute") < troopSliderOpen.indexOf("findRouteAsync(source, target).then"),
  "The interactive troop panel must render before local route hydration begins."
);
assert.match(troopSliderOpen, /void loadAttackProtectionPreview/, "Attack protection must hydrate without blocking the troop panel.");
assert.doesNotMatch(game, /function showTroopRouteLoadingModal/, "The blocking route-loading modal must stay removed.");
assert.match(publishOrder, /path:\s*\[\][\s\S]*pathSegments:\s*\[\][\s\S]*pathLength:\s*0/, "Online confirmation must support a route-free intent.");
assert.match(publishOrder, /api\.submitRecoverableArmyOrder\(orderPayload\)/, "Uncertain launches must use the durable confirmation adapter.");
assert.match(fs.readFileSync(path.join(root, "firebaseClient.js"), "utf8"), /api\.sendArmyOrder\(entry\.payload\)[\s\S]*isRetryableArmySubmissionError[\s\S]*window\.setTimeout[\s\S]*return send\(\)/,
  "Transport retries must preserve the journaled payload and order ID.");
assert.match(routeRefresh, /AUTHORITATIVE_ROUTE_PREVIEW_DEBOUNCE_MS/, "Troop-band route refreshes must be debounced.");
assert.match(routeRefresh, /getTroopTravelBandIndex/, "Authoritative route refreshes must track troop travel bands.");
assert.match(routeRefresh, /requestAuthoritativeOrderRoute/, "Troop-band changes must request a fresh authoritative ETA.");
assert.match(troopSliderUpdate, /getTroopTravelBandIndex\(route\.authoritativeRequestedTroops\)/, "An authoritative ETA must remain valid throughout its troop travel band.");
assert.match(troopSliderUpdate, /scheduleAuthoritativeRoutePreviewRefresh/, "The troop slider must refresh authoritative ETA when its travel band changes.");
assert.match(cityWheel, /bulkOrdersSupported\s*\?/, "Unsupported realms must hide bulk order controls.");
assert.match(cityWheel, /wheel-scout-nearby[\s\S]*wheel-regroup/, "Supported realms must expose both bulk order controls.");
assert.doesNotMatch(cityFortificationDisplay, /\bgetOwnerUid\s*\(/, "City Info must not call the server-only getOwnerUid helper.");
assert.match(cityFortificationDisplay, /String\(city\?\.ownerUid\s*\|\|\s*""\)\.trim\(\)/, "City Info must classify neutral wall visibility from the client city owner UID.");
const cityInfoContext = {
  DEFENSE_COMBAT_VERSION: 1,
  getCityFortificationSnapshot: () => ({
    integrityBps: 10_000,
    repairAtMs: 0,
    repairWindowMinutes: 15,
    fullWallPower: 200,
    currentWallPower: 200,
  }),
  getCityStats: () => ({ defenseCombatVersion: 1, troopDefense: 13 }),
  getObjectiveTroopDefenseBonusPercent: stats => Math.max(0, Number(
    stats?.objectiveTroopDefenseBonusPercent ?? stats?.strongholdDefenseBonusPercent
  ) || 0),
  normalizeCombatFortificationSnapshot: raw => raw || null,
  getSiegeRepairWindowMinutes: () => 15,
  getSiegeRepairLevel: () => 1,
};
vm.createContext(cityInfoContext);
vm.runInContext(cityFortificationDisplay, cityInfoContext);
assert.equal(
  cityInfoContext.getCityFortificationDisplay(
    { owner: "neutral", ownerUid: "" },
    { defenseCombatVersion: 1, troopDefense: 13 }
  ).powerVisible,
  true,
  "Neutral City Info should show its wall power without throwing."
);
assert.equal(
  cityInfoContext.getCityFortificationDisplay(
    { owner: "enemy", ownerUid: "enemy-uid" },
    { defenseCombatVersion: 1, troopDefense: 13 }
  ).powerVisible,
  false,
  "Unscouted enemy City Info must keep defense power hidden."
);
assert.equal(
  cityInfoContext.getCityFortificationDisplay(
    { owner: "enemy", ownerUid: "enemy-uid" },
    { defenseCombatVersion: 1, troopDefense: 13 },
    { fortification: { defenseCombatVersion: 1, fullWallPower: 200, currentWallPower: 200, garrisonDefensePower: 13, endingIntegrityBps: 10_000 } }
  ).powerVisible,
  true,
  "Scouted enemy City Info should reveal its recorded wall power."
);
assert.match(worker, /message\.type === "routeBatch"/, "The route worker must support bounded batch jobs.");

const refreshRoster = extractFunction("refreshAllOwnedCities");
assert.match(refreshRoster, /finally[\s\S]*onlineOwnedCitiesRefreshInFlight = false;[\s\S]*renderCityListModal/, "City-list sync must repaint after its in-flight state clears.");
assert.match(game, /Full roster unavailable\. Showing saved cities\./, "City-list sync failures must have an explicit fallback state.");

const layoutLabels = extractFunction("layoutCityLabels");
assert.ok(
  layoutLabels.indexOf("labelMetrics") < layoutLabels.indexOf("placements.forEach"),
  "City-label layout must batch measurements before class writes."
);
assert.match(game, /scheduleMainMapPinchUpdate\(\)/, "Main-map pinch work must be animation-frame coalesced.");
assert.match(styles, /--map-hit-size/, "Map interactions must retain a zoom-aware 44px target.");
assert.match(actionButtons, /--cl-action-size:\s*64px;[\s\S]*?:is\(\.city-wheel-action, \.gold-camp-wheel-action\)\.cl-action-button[\s\S]*?pointer-events:\s*auto;/, "City and camp action-wheel buttons must retain their shared 64px interactive target.");
assert.match(styles, /\.army-sync-status/, "Realtime march recovery must be visible to players.");

const dialogOpenScrollReset = extractFunction("installDialogOpenScrollReset");
const dialogScrollReset = extractFunction("resetDialogScrollTop");
assert.match(dialogOpenScrollReset, /HTMLDialogElement/, "Every dialog must share the open-time scroll reset.");
assert.match(dialogOpenScrollReset, /requestAnimationFrame/, "Dialog scroll must be confirmed after browser layout and focus handling.");
assert.match(dialogOpenScrollReset, /addEventListener\("close"/, "Closed dialogs must discard their previous scroll position.");
assert.match(dialogOpenScrollReset, /addEventListener\("toggle"/, "Dialog opening must reset scroll after native browser state settles.");
assert.match(dialogScrollReset, /#modalBody/, "The shared modal body must return to its top whenever a dialog opens.");
for (const view of ["profileView", "skillsView", "settingsView", "clanView"]) {
  assert.match(game, new RegExp(`resetUiScrollTop\\(${view}\\)`), `${view} must open at its top.`);
}
assert.match(game, /flagEditorControlScroll\.scrollTop = 0/, "The flag editor's independently scrollable controls must open at their top.");

const nearbyPreload = extractFunction("preloadNearbyIslandMaps");
assert.match(nearbyPreload, /saveData/, "Speculative map loads must respect Save-Data.");
assert.match(nearbyPreload, /"slow-2g", "2g"/, "Speculative map loads must skip slow connections.");
assert.match(nearbyPreload, /\.slice\(0, 2\)/, "No more than two neighboring maps may preload.");
assert.match(nearbyPreload, /3000/, "Neighbor preloading must wait for the active map to settle.");
const islandPreload = extractFunction("preloadIslandMap");
assert.match(islandPreload, /expectedWidth/, "Full map loads must validate declared image width.");
assert.match(islandPreload, /expectedHeight/, "Full map loads must validate declared image height.");

console.log("Interaction health validation passed.");
