"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const game = fs.readFileSync(path.join(root, "game.js"), "utf8");
const source = game.slice(game.indexOf("function getOnboardingPrefs("), game.indexOf("function showHelpModal("));
assert(source.startsWith("function getOnboardingPrefs("));
const storage = new Map();
function createSession() {
  const context = vm.createContext({
    uid: "ruler-a", realm: "world-a:reset-a:shard-a", gold: 100, pending: false, report: null,
    window: { localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) } },
    getCurrentOnlineUid: () => context.uid,
    getOnlineRequestScope: () => `${context.uid}:${context.realm}`,
    isStronghold: target => target.stronghold === true,
    getLevelCost: city => city.cost,
    getProjectedCityForInstantActions: city => city,
    cityHasIncomingUpgradeBlocker: city => city.blocked,
    getProjectedGold: () => context.gold,
    formatNumber: String, formatDuration: seconds => `${seconds / 60}m`, SCOUT_REPORT_SECONDS: 600,
    isRewardCampTarget: target => target.camp === true,
    getRewardCampConfig: target => ({ holdSeconds: target.holdSeconds }),
    getPendingScoutMission: () => context.pending,
    getScoutReport: () => context.report,
    pendingDirectScoutTargets: new Set(),
    escapeHtml: value => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;"),
  });
  const topics = game.match(/const ONBOARDING_TOPICS = Object.freeze\((\[[^;]+\])\);/)[1];
  vm.runInContext(`const ONBOARDING_TOPICS = ${topics}; let onboardingScope = ""; let onboardingPrefs = null; ${source}`, context);
  return context;
}
let session = createSession();
assert.equal(session.getOnboardingPrefs(), null, "Existing accounts must not be opted in automatically.");
assert.equal(session.renderOnboardingTip("upgrade"), "");
session.enableOnboardingGuidance({ onlyIfNew: true });
assert.match(session.renderOnboardingTip("upgrade"), /Your first city upgrade/);
session.saveOnboardingPrefs({ enabled: true, dismissed: ["upgrade"] });
assert.equal(session.renderOnboardingTip("upgrade"), "");
session = createSession();
assert.equal(session.renderOnboardingTip("upgrade"), "", "A dismissed tip returned after reload.");
assert.match(session.renderOnboardingTip("scout"), /One troop/);
session.saveOnboardingPrefs({ enabled: false, dismissed: [] });
session.enableOnboardingGuidance({ onlyIfNew: true });
assert.equal(session.renderOnboardingTip("scout"), "", "Admission replay re-enabled dismissed guidance.");
session.uid = "ruler-b";
assert.equal(session.getOnboardingPrefs(), null, "Preferences leaked between accounts.");
session.uid = "ruler-a";
session.realm = "world-b:reset-b:shard-b";
assert.equal(session.getOnboardingPrefs(), null, "Preferences leaked between realms.");
session.realm = "world-a:reset-a:shard-a";
session.enableOnboardingGuidance();
assert.match(session.renderOnboardingTip("upgrade"), /Your first city upgrade/, "Explicit replay did not restore the tips.");
session.uid = "";
assert.equal(session.renderOnboardingTip("upgrade"), "", "Signed-out clients exposed the previous ruler's guidance.");
assert.equal(session.saveOnboardingPrefs({ enabled: true, dismissed: [] }), false);
session.uid = "storage-unavailable";
session.window.localStorage = { getItem() { throw Error("denied"); }, setItem() { throw Error("denied"); } };
assert.doesNotThrow(() => session.enableOnboardingGuidance());
assert.match(session.renderOnboardingTip("scout"), /One troop/, "Storage failure must retain a usable session preference.");
session.gold = 10;
assert.match(session.getOnboardingCopy("upgrade", { owner: "player", cost: 60 }, "info").text, /Use \+1 below.*60 Gold/);
assert.match(session.getOnboardingCopy("upgrade", { owner: "player", cost: 60, blocked: true }).text, /incoming attack blocks/);
session.pending = true;
assert.match(session.getOnboardingCopy("scout", { id: "city" }).title, /on its way/);
session.pending = false;
session.report = {};
assert.match(session.getOnboardingCopy("scout", { id: "city" }).title, /ready/);
assert.match(session.getOnboardingCopy("scout", {}, "report").text, /10 minutes.*defenders can change/);
assert.match(session.getOnboardingCopy("attack", {}, "order").text, /slider.*Tap Attack to send.*arrival/);
assert.equal(session.getOnboardingCopy("camp"), null);
for (const topic of ["scout", "attack", "camp"]) assert.equal(session.renderOnboardingTip(topic, { camp: true }), "", "Camp guidance must not encourage a beginner attack.");
assert.match(session.getOnboardingCopy("name", null, "profile").text, /18 characters.*check mark/);
assert.match(session.getOnboardingCopy("flag", null, "editor").text, /colors, a pattern, and a symbol.*Save Flag.*retry/);
session.uid = "legacy-guidance";
session.window.localStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) };
storage.set(`crownlands-first-steps-v1:${session.getOnlineRequestScope()}`, JSON.stringify({ enabled: false, dismissed: ["camp", "upgrade"] }));
assert.equal(session.getOnboardingPrefs().enabled, false, "Adding identity tips must preserve an existing opt-out.");
assert.deepEqual(Array.from(session.getOnboardingPrefs().dismissed), ["upgrade"]);
// A fresh claim may redirect into a second, already-claimed admission. Exercise
// the actual admission prefix so the tips cannot be lost before that return.
const admissionStart = game.indexOf("      if (claim.currentUser) applyOnlineProfileSnapshot(claim.currentUser, state.playerName);");
const admissionEnd = game.indexOf("      const claimedCity =", admissionStart);
assert(admissionStart > 0 && admissionEnd > admissionStart);
const admission = game.slice(admissionStart, admissionEnd);
const admissionSession = createSession();
Object.assign(admissionSession, {
  uid: "redirected-new-ruler", realm: "current-realm", state: { online: {}, playerName: "Test" },
  claim: { cityId: "new-home", islandId: "spawn-map", alreadyClaimed: false },
  islandId: "requested-map", targetRegionId: "requested-map", profile: null,
  allowWelcomeBack: false, announceLocation: false, onlineStatusDetail: {},
  applyOnlineProfileSnapshot() {}, getRegionIdFromOnlineIslandId: id => id,
  getRegionLabel: id => id, connectOnlineIsland: id => id,
});
assert.equal(vm.runInContext(`(function () { ${admission} })()`, admissionSession), "spawn-map");
assert.equal(admissionSession.getOnboardingPrefs()?.enabled, true, "Starting-map redirection skipped automatic guidance.");
admissionSession.saveOnboardingPrefs({ enabled: false, dismissed: ["upgrade"] });
admissionSession.claim.alreadyClaimed = true;
vm.runInContext(`(function () { ${admission} })()`, admissionSession);
assert.equal(admissionSession.getOnboardingPrefs().enabled, false, "Admission replay overrode the ruler's dismissal.");
assert.match(game, /orderKind === "attack" && !campTarget \? renderOnboardingTip/);
assert.match(game, /renderOnboardingTip\("scout", city, "report"\)/);
assert.match(game, /data-onboarding-scope/);
assert.match(fs.readFileSync(path.join(root, "index.html"), "utf8"), /id="helpBtn"/);
console.log("Validated contextual onboarding: first claim, replay, dismissal/reload, account/realm isolation, storage failure, dynamic costs/timers, and action-specific copy.");
