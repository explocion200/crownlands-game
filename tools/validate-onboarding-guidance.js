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
  vm.runInContext(`const ONBOARDING_TOPICS = ["upgrade", "scout", "attack", "camp"]; let onboardingScope = ""; let onboardingPrefs = null; ${source}`, context);
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
for (const holdSeconds of [600, 900, 1800, 3600, 2100]) {
  const camp = { camp: true, holdSeconds, owner: "neutral" };
  assert.match(session.getOnboardingCopy("camp", camp).text, new RegExp(`${holdSeconds / 60}m hold`));
  assert.match(session.getOnboardingCopy("camp", { ...camp, owner: "player" }).text, /Another ruler taking it restarts/);
}
assert.match(game, /if \(onlineFreshClaimCityId\) enableOnboardingGuidance\(\{ onlyIfNew: true \}\)/);
assert.match(game, /orderKind === "attack" \? renderOnboardingTip/);
assert.match(game, /renderOnboardingTip\("scout", city, "report"\)/);
assert.match(game, /data-onboarding-scope/);
assert.match(fs.readFileSync(path.join(root, "index.html"), "utf8"), /id="helpBtn"/);
console.log("Validated contextual onboarding: first claim, replay, dismissal/reload, account/realm isolation, storage failure, dynamic costs/timers, and action-specific copy.");
