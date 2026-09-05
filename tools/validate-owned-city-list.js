const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const clientSource = fs.readFileSync(path.resolve(__dirname, "..", "firebaseClient.js"), "utf8");
const gameSource = fs.readFileSync(path.resolve(__dirname, "..", "game.js"), "utf8");
const controllerSource = fs.readFileSync(path.resolve(__dirname, "..", "instant-economy-actions.js"), "utf8");
const regionCatalogSource = fs.readFileSync(path.resolve(__dirname, "..", "region-catalog.js"), "utf8");
const serverSource = fs.readFileSync(path.resolve(__dirname, "..", "functions", "index.js"), "utf8");
const styles = fs.readFileSync(path.resolve(__dirname, "..", "styles.css"), "utf8");
const actionButtons = fs.readFileSync(path.resolve(__dirname, "..", "action-buttons.css"), "utf8");
const contrastStyles = fs.readFileSync(path.resolve(__dirname, "..", "ui-contrast-correction.css"), "utf8");
const indexSource = fs.readFileSync(path.resolve(__dirname, "..", "index.html"), "utf8");
const workerSource = fs.readFileSync(path.resolve(__dirname, "..", "service-worker.js"), "utf8");
const firestoreIndexes = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "firestore.indexes.json"), "utf8"));
const benchmarkClientSource = fs.readFileSync(path.resolve(__dirname, "map-benchmark", "mock-firebase.js"), "utf8");

const loaderStart = clientSource.indexOf("async function loadOwnedCitiesAcrossIslands");
const loaderEnd = clientSource.indexOf("async function loadServerReports", loaderStart);
assert.ok(loaderStart >= 0 && loaderEnd > loaderStart, "Owned-city loader must exist.");
const loaderSource = clientSource.slice(loaderStart, loaderEnd);

assert.match(loaderSource, /collectionGroup\(client\.db, "cities"\)/, "Owned cities must load with one collection-group query.");
assert.match(loaderSource, /where\("ownerUid", "==", uid\)/, "Owned-city query must be scoped to the signed-in player.");
assert.match(loaderSource, /where\("resetGeneration", "==", RESET_GENERATION\)/, "Owned-city query must be generation-scoped.");
assert.match(loaderSource, /where\("worldId", "==", ONLINE_WORLD_ID\)/, "Owned-city query must be world-scoped.");
assert.match(loaderSource, /\.\.\.getRealmShardQueryConstraints\(where\)/, "Owned-city query must be scoped to the player's current realm shard.");
assert.match(loaderSource, /cityDoc\.ref\?\.parent\?\.parent\?\.id/, "Owned-city results must retain their island ID.");
assert.doesNotMatch(loaderSource, /uniqueIslandIds\.includes\(city\.islandId\)/, "The collection-group roster must not discard server-owned cities against bundled client region IDs.");
assert.ok(
  firestoreIndexes.indexes.some(index => index.collectionGroup === "cities"
    && index.queryScope === "COLLECTION_GROUP"
    && index.fields.map(field => field.fieldPath).join(",") === "ownerUid,resetGeneration,worldId,realmShardId"),
  "The shard-scoped owned-city collection-group query is missing its composite index."
);
assert.match(gameSource, /const refreshPromise = refreshAllOwnedCities\(true\);/, "Opening the city list must request a fresh server roster before rendering.");
assert.match(gameSource, /Syncing full city roster\.\.\./, "An incomplete roster must show a syncing state.");
assert.match(gameSource, /function validateCompleteOwnedCityRoster[\s\S]*?expectedRegularCityCount[\s\S]*?missingLoadedCity[\s\S]*?complete: issues\.length === 0/, "Roster completeness must reconcile invalid, duplicate, count-mismatched, and already-loaded city evidence.");
assert.match(gameSource, /catch \(error\) \{\s*if \(requestScope !== getOnlineRequestScope\(\)\) return false;\s*onlineOwnedCitiesCacheComplete = false;[\s\S]*?onlineOwnedCitiesRefreshError = onlineLastError/, "Current-session denied and timed-out roster reads must retain an explicit incomplete retry state without overwriting a replacement session.");
assert.match(gameSource, /function getAllOwnedCitiesForDisplay[\s\S]*?const activeRegionId = getActiveMapRegionId\(\);[\s\S]*?filter\(city => getCityRegionId\(city\) === activeRegionId\)/, "Stale inactive-map snapshots must not reintroduce cities removed from a complete roster.");
assert.match(benchmarkClientSource, /loadOwnedCitiesAcrossIslands: async \(\) => Object\.entries\(fixture\.citiesByRegion\)\.flatMap[\s\S]*?islandId:/, "The browser fixture must exercise a genuine multi-region owned-city roster.");
assert.match(gameSource, /data-city-list-sort="level"[\s\S]*?data-city-list-sort="troops"/, "City list must retain Level and Troops sort controls.");
assert.match(gameSource, /function getOwnedCitySnapshotForUpgrade[\s\S]*?getAllOwnedCitiesForDisplay/, "Direct city upgrades must resolve owned cities outside the active map.");
assert.match(gameSource, /function getOwnedCitySnapshotForUpgrade[\s\S]*?getActiveMapRegionId\(\)[\s\S]*?getCityRegionId\(activeCity\) === activeRegionId[\s\S]*?getOwnedCitySnapshotById/, "Off-map upgrades must not prefer stale inactive-map state over the owned-city roster.");
assert.match(gameSource, /function getOwnedCityCacheKey[\s\S]*?resolvedRegionId[\s\S]*?cityId/, "Owned-city identity must use a region-and-city composite key.");
assert.match(gameSource, /const islandRegionId = rawIslandId \? getRegionIdFromOnlineIslandId[\s\S]*?getOnlineIslandId\(islandRegionId\) !== rawIslandId[\s\S]*?islandRegionId \|\| raw\.regionId/, "Owned-city snapshots must require and prefer their canonical island path over stale stored region metadata.");
assert.match(regionCatalogSource, /function isKnownCoreCityId[\s\S]*?\^core_\[a-f0-9\]\{18\}\$/i, "The region catalog must recognize generated Core city IDs.");
assert.match(gameSource, /REGION_CATALOG_RUNTIME\.isKnownCoreCityId\(value, cleanEditorRegionId\(canonicalRegionId\), REGION_CATALOG_SUMMARIES_BY_ID\)[\s\S]*?getKnownCityId\(raw\.id, islandRegionId\)/, "Unloaded Core-map city IDs must be accepted only against a canonical catalog island path.");
assert.match(serverSource, /function getRegionIdFromCityDoc[\s\S]*?doc\?\.ref\?\.parent\?\.parent\?\.id[\s\S]*?if \(islandId\) return getRegionIdFromOnlineIslandId\(islandId\)[\s\S]*?data\.regionId/, "The server must prefer the city document path over stale stored region metadata.");
assert.match(gameSource, /const sameIdIndexes = onlineOwnedCitiesCache[\s\S]*?if \(sameIdIndexes\.length === 1\) existingIndex = sameIdIndexes\[0\]/, "Stale-region repair must not overwrite one of multiple same-ID cities.");
assert.match(gameSource, /const currentRegionId = getCityRegionId\(city\)[\s\S]*?const updateRegionId = normalizeRegionId[\s\S]*?if \(currentRegionId !== updateRegionId\) continue;/, "Off-map updates must not mutate a same-ID city on the active map.");
assert.match(gameSource, /function getCityUpgradeOptionState[\s\S]*?makeExactOption\("\+1"[\s\S]*?makeExactOption\("\+5"[\s\S]*?label: "MAX"/, "City Info and City List must share +1, +5, and MAX option state.");
assert.match(gameSource, /const optionState = stronghold \? null : getCityUpgradeOptionState\(city\)/, "Stronghold rows must omit city-upgrade controls.");
assert.match(gameSource, /class="city-list-actions"[\s\S]*?renderCityListUpgradeButton[\s\S]*?class="city-list-info"/, "Regular city rows must place upgrade controls before Info.");
assert.match(gameSource, /data-city-upgrade-region=/, "City-list upgrade controls must retain their map binding.");
assert.doesNotMatch(controllerSource, /already has an upgrade pending/, "A pending city upgrade still blocks rapid follow-up actions.");
assert.doesNotMatch(controllerSource, /api\.getCityUpgradeXpPreview/, "City upgrades still perform a routine XP-preview request.");
assert.match(controllerSource, /function queueServerCityUpgrade[\s\S]*?getProjectedAffordableCityUpgradeLevels[\s\S]*?coalesce:\s*mode !== "max"[\s\S]*?reservedGold:/, "Authoritative exact upgrades must reserve projected Gold in bounded batches while MAX remains standalone.");
assert.match(controllerSource, /function canBatchExactCityActions[\s\S]*?previous\.key !== normalized\.key[\s\S]*?combinedLevels <= SERVER_CITY_UPGRADE_LEVEL_CHUNK/, "Undispatched exact upgrades are not bounded and keyed by region and city.");
assert.match(controllerSource, /async function executeInstantCityUpgrade[\s\S]*?const submitUpgrade[\s\S]*?result = await submitUpgrade/, "Queued city upgrades must submit directly when they reach the front.");
assert.match(controllerSource, /function discardQueuedCityUpgradeActions[\s\S]*?instantEconomyActions\.splice[\s\S]*?if \(action\.type === "city"\) discardQueuedCityUpgradeActions\(action\.key\)/, "A rejected action must clear dependent requests for that city.");
assert.match(gameSource, /const displayedLevel = optionState\?\.currentLevel[\s\S]*?getPendingCityUpgradeCount[\s\S]*?class="city-list-row[\s\S]*?upgrade-syncing[\s\S]*?formatNumber\(displayedLevel\)/, "City List rows must show the projected level with a nonblocking syncing state.");
assert.match(gameSource, /function patchCityListUpgradeRows\(dirtyCityKeys = null\)[\s\S]*?requestedKeys[\s\S]*?querySelectorAll\("\[data-city-list-row-key\]"\)[\s\S]*?row\.replaceWith\(replacement\)[\s\S]*?restoreCityListFocus/, "City upgrades must patch only affected visible rows without rebuilding the full modal.");
assert.match(controllerSource, /contains\("city-list-modal"\)[\s\S]*?patchCityListUpgradeRows\(dirtyCityKeys\)[\s\S]*?return;/, "The City List must be patched before any active-map redraw.");
assert.match(controllerSource, /applyServerEconomyResult\(result,[\s\S]*?render: false,[\s\S]*?renderCities: false,[\s\S]*?renderCityList: false/, "A city confirmation must reconcile authoritative state without rendering inside the queue lifecycle.");
assert.match(gameSource, /function applyServerCityUpdates\(cityUpdates = \[\], options = \{\}\)[\s\S]*?options\.render !== false/, "City-update reconciliation must support a no-render path for targeted City List updates.");
const levelButtonSource = gameSource.match(/function renderCityLevelUpButton[\s\S]*?(?=function renderCityLevelUpAction)/)?.[0] || "";
assert.doesNotMatch(levelButtonSource, /pending|aria-disabled|aria-busy/, "Pending state must not disable individual +1, +5, or MAX controls.");
assert.match(gameSource, /function compareCityListEntries[\s\S]*?getProjectedCityForInstantActions\(a\)[\s\S]*?getProjectedCityForInstantActions\(b\)/, "An explicit sort must use the currently displayed projected city levels.");
assert.match(controllerSource, /renderCityList: false,[\s\S]*?cityUpgradeFeedback: result\?\.replayed \? null[\s\S]*?startingLevel: clampCityLevel\(authoritativeFinalLevel - upgraded\)[\s\S]*?finalLevel: authoritativeFinalLevel/, "City-list success feedback must be derived from the authoritative upgrade receipt and deferred until pending state clears.");
assert.match(controllerSource, /if \(!result\?\.replayed\) \{[\s\S]*?playGameSound\("level_up"[\s\S]*?playCityUpgradeAnimation/, "Idempotent replay responses must not repeat success logs, audio, or animation.");
assert.doesNotMatch(gameSource.match(/function getCityUpgradeOptionState[\s\S]*?(?=function renderCityLevelUpButton)/)?.[0] || "", /Hero XP| XP|\.xp/, "City-upgrade option state still exposes XP estimates.");
assert.doesNotMatch(gameSource.match(/function renderCityLevelUpButton[\s\S]*?(?=function bindCityLevelUpButtons)/)?.[0] || "", /Hero XP| XP|option\.xp/, "City-upgrade controls still render XP text.");

const economyApplyStart = gameSource.indexOf("function applyServerEconomyResult");
const economyApplyEnd = gameSource.indexOf("function mergeServerEconomyRefreshOptions", economyApplyStart);
assert.ok(economyApplyStart >= 0 && economyApplyEnd > economyApplyStart, "Server economy result application must exist.");
const economyApplySource = gameSource.slice(economyApplyStart, economyApplyEnd);
assert.ok(
  economyApplySource.indexOf("applyServerCityUpdates(result.cityUpdates)") < economyApplySource.indexOf("setCityListUpgradeFeedback(options.cityUpgradeFeedback)"),
  "Authoritative city updates must reach active-map and off-map caches before success feedback is registered."
);
assert.match(economyApplySource, /result\.replayed !== true[\s\S]*?options\.renderCityList !== false/, "Economy reconciliation must suppress duplicate replay feedback and support one post-pending city-list render.");
assert.match(gameSource, /data-city-list-row-key=[\s\S]*?city-list-upgrade-result" role="status"/, "The upgraded city row must expose a stable identity and an accessible level-change result.");
const cityListRenderSource = gameSource.match(/function renderCityListModal\([\s\S]*?(?=function bindCityListRowActions)/)?.[0] || "";
assert.doesNotMatch(cityListRenderSource, /cityListPage\s*=\s*Math\.floor|ensureCityListRowVisible|consumeCityListUpgradeRevealKey/, "Upgrade settlement must not change the City List page or scroll position.");
assert.match(gameSource, /function reconcileCityListSessionOrder[\s\S]*?cityListSessionOrderKeys\.forEach[\s\S]*?sortedCities\.forEach[\s\S]*?cityListSessionOrderKeys = ordered\.map/, "An open City List session must retain surviving rows and append newly discovered rows.");
assert.match(cityListRenderSource, /cityListPage = 0;\s*resetCityListSessionOrder\(\);\s*renderCityListModal\(\);/, "Clicking either sort control must create a fresh ordering.");
assert.match(gameSource, /const closedCityListSession = modal\.classList\.contains\("city-list-modal"\)[\s\S]*?if \(closedCityListSession\) resetCityListSessionOrder\(\)/, "Closing the City List must end its ordering session.");
assert.match(cityListRenderSource, /previousScrollTop[\s\S]*?captureCityListFocus\(\)[\s\S]*?modalBody\.scrollTop = previousScrollTop;[\s\S]*?restoreCityListFocus/, "City-list reconciliation must preserve scroll and keyboard focus without revealing or moving the upgraded row.");
assert.match(styles, /\.city-list-row\.upgrade-confirmed[\s\S]*?@keyframes crownlandsCityListUpgradeConfirmed[\s\S]*?prefers-reduced-motion: reduce/, "Confirmed city upgrades need a brief reduced-motion-safe row highlight.");
assert.match(gameSource, /cl-action-button cl-action-level[\s\S]*?renderCrownlandsIcon\("arrow-up"\)/, "The selected-city map action must use its dedicated arrow-up treatment.");
assert.match(indexSource, /id="cl-icon-arrow-up"/, "The dedicated map Level arrow glyph is missing.");
assert.match(actionButtons, /\.cl-action-button\.cl-action-level[\s\S]*?--cl-action-bg:\s*var\(--cl-action-level-bg\)/, "The selected-city Level action is missing its gold button treatment.");
assert.match(indexSource, /firebaseClient\.js\?v=20260902-march-sync-realm-scope-r1[\s\S]*?instant-economy-actions\.js\?v=20260829-city-upgrade-queue-stability-r1[\s\S]*?game\.js\?v=20260904-layer1-travel-balance-r1/, "Changed city-list client assets must have current cache-busting release tokens.");
assert.match(workerSource, /firebaseClient\.js\?v=20260902-march-sync-realm-scope-r1[\s\S]*?game\.js\?v=20260904-layer1-travel-balance-r1/, "The offline shell must precache the current City List client assets.");
assert.match(styles, /@media \(max-width: 600px\) and \(orientation: landscape\)[\s\S]*?\.city-list-art,[\s\S]*?display: none;[\s\S]*?\.city-list-upgrade \{ min-width: 40px; width: 40px; height: 40px;/, "The 540px layout must preserve 40px controls by hiding decorative row content.");
assert.match(contrastStyles, /\.city-list-modal \.city-list-toolbar button :is\(span, small, \.cl-icon\)[\s\S]*?color:\s*inherit !important;/, "City-list sort text and icons can still become brown on dark buttons.");

const completenessStart = gameSource.indexOf("function getOwnedCityRosterCompletenessIssues");
const completenessEnd = gameSource.indexOf("function validateCompleteOwnedCityRoster", completenessStart);
assert.ok(completenessStart >= 0 && completenessEnd > completenessStart, "Roster completeness helper must exist.");
const completenessContext = {};
vm.createContext(completenessContext);
vm.runInContext(`${gameSource.slice(completenessStart, completenessEnd)}\nthis.checkCompleteness = getOwnedCityRosterCompletenessIssues;`, completenessContext);
assert.deepEqual(
  Array.from(completenessContext.checkCompleteness({ regularCityCount: 3, expectedRegularCityCount: 3 })),
  [],
  "A matching complete roster should pass reconciliation."
);
assert.ok(completenessContext.checkCompleteness({ invalidRecordCount: 1 }).length > 0, "A normalized partial read was marked complete.");
assert.ok(completenessContext.checkCompleteness({ duplicateKeyCount: 1 }).length > 0, "Duplicate canonical city identities were marked complete.");
assert.ok(completenessContext.checkCompleteness({ regularCityCount: 2, expectedRegularCityCount: 3 }).length > 0, "A count-mismatched roster was marked complete.");
assert.ok(completenessContext.checkCompleteness({ regularCityCount: 3, expectedRegularCityCount: 3, missingLoadedCity: true }).length > 0, "A roster missing an already-loaded city was marked complete.");

const knownCityStart = gameSource.indexOf("function getKnownCityId");
const knownCityEnd = gameSource.indexOf("function normalizeRealmShardId", knownCityStart);
assert.ok(knownCityStart >= 0 && knownCityEnd > knownCityStart, "Core catalog city identity helpers must exist.");
const knownCityContext = {
  CORE_EXPANSION_TOPOLOGY_ACTIVE: true,
  REGION_CATALOG_RUNTIME: require(path.resolve(__dirname, "..", "region-catalog.js")),
  REGION_CATALOG_SUMMARIES_BY_ID: new Map([["core-v2-support", { id: "core-v2-support" }]]),
  WORLD_REGION_IDS: ["core-v2-support"],
  state: null,
  cleanEditorRegionId: value => String(value || "").toLowerCase(),
  getPlayableBaseCityById: () => null,
  getDynamicNewLandsCityIdentity: () => null,
};
vm.createContext(knownCityContext);
vm.runInContext(`${gameSource.slice(knownCityStart, knownCityEnd)}\nthis.getKnownCityId = getKnownCityId;`, knownCityContext);
const largeUnloadedCoreRoster = Array.from({ length: 42 }, (_, index) => (
  `core_${index.toString(16).padStart(18, "0")}`
));
assert.equal(
  largeUnloadedCoreRoster.filter(cityId => knownCityContext.getKnownCityId(cityId, "core-v2-support")).length,
  42,
  "A player with more than 30 cities lost unloaded Core-map holdings from the roster."
);
assert.equal(knownCityContext.getKnownCityId(largeUnloadedCoreRoster[0], "unknown-region"), "", "Opaque Core city IDs must not be accepted without a canonical catalog region.");

const upgradeLookupStart = gameSource.indexOf("function getOwnedCitySnapshotForUpgrade");
const upgradeLookupEnd = gameSource.indexOf("function ownedCities", upgradeLookupStart);
assert.ok(upgradeLookupStart >= 0 && upgradeLookupEnd > upgradeLookupStart, "Owned-city upgrade lookup must exist.");
const staleInactiveCity = { id: "city_b", regionId: "north", owner: "neutral", level: 1 };
const ownedRosterCity = { id: "city_b", regionId: "north", owner: "player", level: 42 };
const upgradeLookupContext = {
  activeRegionId: "west",
  stateCity: staleInactiveCity,
  rosterCity: ownedRosterCity,
  getKnownCityId: id => String(id || ""),
  normalizeRegionId: id => String(id || "west"),
  getActiveMapRegionId: () => upgradeLookupContext.activeRegionId,
  cityById: id => upgradeLookupContext.stateCity?.id === id ? upgradeLookupContext.stateCity : null,
  getCityRegionId: city => String(city?.regionId || "west"),
  getOwnedCitySnapshotById: (id, regionId) => (
    upgradeLookupContext.rosterCity?.id === id
      && (!regionId || upgradeLookupContext.rosterCity.regionId === regionId)
      ? upgradeLookupContext.rosterCity
      : null
  ),
};
vm.createContext(upgradeLookupContext);
vm.runInContext(`${gameSource.slice(upgradeLookupStart, upgradeLookupEnd)}\nthis.resolveUpgradeCity = getOwnedCitySnapshotForUpgrade;`, upgradeLookupContext);
assert.equal(
  upgradeLookupContext.resolveUpgradeCity("city_b", "north"),
  ownedRosterCity,
  "A stale inactive-map city overrode the authoritative owned-city roster."
);
upgradeLookupContext.activeRegionId = "north";
upgradeLookupContext.stateCity = { ...staleInactiveCity, owner: "player", level: 43 };
assert.equal(
  upgradeLookupContext.resolveUpgradeCity("city_b", "north"),
  upgradeLookupContext.stateCity,
  "The currently active map stopped providing the live city snapshot."
);

const orderStart = gameSource.indexOf("function resetCityListSessionOrder");
const orderEnd = gameSource.indexOf("function clearCityListUpgradeFeedback", orderStart);
assert.ok(orderStart >= 0 && orderEnd > orderStart, "City List session-order helpers must exist.");
const orderContext = {
  cityListSessionOrderKeys: [],
  getCityListRowKey: city => city.key,
};
vm.createContext(orderContext);
vm.runInContext(`${gameSource.slice(orderStart, orderEnd)}\nthis.reconcile = reconcileCityListSessionOrder; this.reset = resetCityListSessionOrder;`, orderContext);
const cityA = { key: "north:a", level: 1 };
const cityB = { key: "south:b", level: 2 };
const cityC = { key: "west:c", level: 3 };
const cityD = { key: "east:d", level: 4 };
const keys = cities => Array.from(cities, city => city.key);
assert.deepEqual(keys(orderContext.reconcile([cityA, cityB, cityC])), ["north:a", "south:b", "west:c"]);
assert.deepEqual(keys(orderContext.reconcile([cityC, cityB, cityA])), ["north:a", "south:b", "west:c"], "Value changes reordered an open City List session.");
assert.deepEqual(keys(orderContext.reconcile([cityD, cityC, cityB, cityA])), ["north:a", "south:b", "west:c", "east:d"], "A newly discovered city was not appended.");
assert.deepEqual(keys(orderContext.reconcile([cityD, cityC, cityB])), ["south:b", "west:c", "east:d"], "Removing a city reordered surviving rows.");
orderContext.reset();
assert.deepEqual(keys(orderContext.reconcile([cityD, cityC, cityB])), ["east:d", "west:c", "south:b"], "An explicit session reset did not accept a fresh sort.");
[
  ["level-low", [cityA, cityB, cityC]],
  ["level-high", [cityC, cityB, cityA]],
  ["troops", [cityB, cityA, cityC]],
].forEach(([sortLabel, initialOrder]) => {
  orderContext.reset();
  orderContext.reconcile(initialOrder);
  assert.deepEqual(
    keys(orderContext.reconcile([...initialOrder].reverse())),
    keys(initialOrder),
    `${sortLabel} moved a row after its displayed values changed.`
  );
});
const pagedCities = Array.from({ length: 12 }, (_, index) => ({ key: `region:city_${index}` }));
orderContext.reset();
orderContext.reconcile(pagedCities);
const reorderedPagedCities = orderContext.reconcile([...pagedCities].reverse());
assert.equal(reorderedPagedCities.findIndex(city => city.key === "region:city_7"), 7, "An upgraded row changed ordinal position.");
assert.equal(Math.floor(reorderedPagedCities.findIndex(city => city.key === "region:city_7") / 5), 1, "An upgraded row changed page.");

console.log("Validated shard-complete loading, stale off-map ownership recovery, session-stable ordering, optimistic queue feedback, replay safety, focus retention, and the gold map upgrade action.");
