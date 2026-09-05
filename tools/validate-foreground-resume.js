const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const game = fs.readFileSync(path.join(root, "game.js"), "utf8");

function extractFunction(source, name) {
  const regularStart = source.indexOf(`function ${name}(`);
  const asyncStart = source.indexOf(`async function ${name}(`);
  const start = asyncStart >= 0 && (regularStart < 0 || asyncStart < regularStart)
    ? asyncStart
    : regularStart;
  assert.ok(start >= 0, `Missing ${name}.`);
  const parametersStart = source.indexOf("(", start);
  let parameterDepth = 0;
  let parametersEnd = -1;
  for (let index = parametersStart; index < source.length; index += 1) {
    if (source[index] === "(") parameterDepth += 1;
    if (source[index] === ")") parameterDepth -= 1;
    if (parameterDepth === 0) {
      parametersEnd = index;
      break;
    }
  }
  assert.ok(parametersEnd >= 0, `Could not parse ${name} parameters.`);
  const bodyStart = source.indexOf("{", parametersEnd);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Could not parse ${name}.`);
}

function functionSource(name) {
  return extractFunction(game, name);
}

assert.match(game, /const FOREGROUND_LONG_RESUME_MS = 60 \* 1000;/, "Long foreground catch-up must start after 60 seconds.");
assert.match(game, /const FOREGROUND_RESUME_RETRY_DELAYS_MS = Object\.freeze\(\[2000, 8000\]\);/, "Foreground retries must use the planned 2s and 8s delays.");
assert.match(game, /const GAME_SERVER_HEARTBEAT_TIMEOUT_MS = 15 \* 1000;/, "Realm heartbeats must release after the 15-second transport timeout.");
assert.match(game, /let gameServerHeartbeatGeneration = 0;/, "Realm heartbeat lifecycles must invalidate stale async attempts.");
for (const eventName of ["visibilitychange", "pagehide", "pageshow", "focus", "freeze", "resume", "online"]) {
  assert.match(game, new RegExp(`addEventListener\\("${eventName}"`), `Missing ${eventName} lifecycle handling.`);
}

const foregroundSync = functionSource("synchronizeForegroundGame");
const applyEconomyResult = functionSource("applyServerEconomyResult");
const gameServerHeartbeat = functionSource("heartbeatGameServerMembership");
const stopGameServerHeartbeat = functionSource("stopGameServerHeartbeat");
assert.ok(
  stopGameServerHeartbeat.includes("gameServerHeartbeatGeneration += 1")
    && gameServerHeartbeat.includes("heartbeatGeneration !== gameServerHeartbeatGeneration")
    && gameServerHeartbeat.includes("heartbeatGeneration === gameServerHeartbeatGeneration"),
  "Realm heartbeat stop/restart does not invalidate stale responses and finalizers."
);
assert.ok(
  gameServerHeartbeat.includes("withTimeout(")
    && gameServerHeartbeat.includes("api.heartbeatGameServer(GAME_SERVER_ID)")
    && gameServerHeartbeat.includes("GAME_SERVER_HEARTBEAT_TIMEOUT_MS")
    && gameServerHeartbeat.includes("Crownlands realm heartbeat timed out."),
  "Realm membership heartbeat does not use the focused transport timeout."
);
for (const operation of [
  "refreshServerEconomy(true",
  "refreshAllOwnedCities(true)",
  "loadOnlineRegionCitiesForResolution(targetRegionId)",
  "loadServerReportsOnce()",
  "heartbeatGameServerMembership()",
  "publishOnlinePresence(true)",
  "retryOverdueOnlineArmyResolutions()",
  "renderAll()",
]) {
  assert.ok(foregroundSync.includes(operation), `Foreground synchronization is missing ${operation}.`);
}
assert.ok(
  foregroundSync.includes("awayMs >= FOREGROUND_LONG_RESUME_MS")
    && foregroundSync.includes("longRefresh || onlineRealtimeRecoveryNeeded")
    && foregroundSync.includes("Boolean(pendingWelcomeBackSession?.eligible)"),
  "Foreground synchronization does not separate silent short resumes from long/listener recovery."
);
assert.doesNotMatch(
  foregroundSync,
  /requestWelcomeBack:\s*shouldShowWelcomeBack/,
  "A foreground resume can request and redisplay a cached login summary."
);
assert.match(
  applyEconomyResult,
  /const awaySummary = options\.requestWelcomeBack === true[\s\S]*?result\.awaySummary/,
  "An unsolicited cached login summary can replace fresh foreground production."
);

const rewardFormatContext = { Math, Number };
vm.createContext(rewardFormatContext);
vm.runInContext(functionSource("formatOfflineRewardAmount"), rewardFormatContext, { filename: "game.js" });
assert.equal(
  rewardFormatContext.formatOfflineRewardAmount(12_345.9),
  "12,345",
  "Welcome Back rewards are abbreviated instead of showing the exact credited amount."
);

const realtimeRestart = functionSource("restartOnlineRealtimeSubscriptionsForResume");
for (const watcher of [
  "startActiveOnlineIslandSubscription",
  "subscribeOnlineArmyWatchers",
  "subscribeOnlineReinforcements",
  "subscribeOnlineHeldCamps",
  "subscribeOnlineServerReports",
  "subscribeOnlineGlobalStats",
  "subscribeOnlineCrownCitadel",
  "watchGameServerMembership",
  "refreshClanState",
]) {
  assert.ok(realtimeRestart.includes(watcher), `Long resume does not re-arm ${watcher}.`);
}
assert.ok(
  realtimeRestart.includes("clearOnlineArmyWatchers({ clear: false })")
    && realtimeRestart.includes("clearOnlineCrownCitadelWatcher({ clear: false })"),
  "Realtime recovery must preserve cached world state until replacement snapshots arrive."
);

const localCatchUp = functionSource("applyLocalForegroundCatchUp");
assert.ok(
  localCatchUp.includes("pendingOfflineProgressSeconds")
    && localCatchUp.includes("applyPendingOfflineProgress({ showSummary: awayMs >= FOREGROUND_LONG_RESUME_MS })"),
  "Non-authoritative sessions do not reuse the offline production path."
);

const economyContext = {
  state: {},
  ONLINE_WORLD_ID: "world",
  RESET_GENERATION: "reset",
  serverEconomyRefreshInFlight: false,
  serverEconomyRefreshQueued: false,
  serverEconomyRefreshPromise: null,
  serverEconomyRefreshActiveOptions: null,
  serverEconomyRefreshQueuedOptions: null,
  serverEconomyLastSyncAt: 0,
  serverEconomyLastToastAt: 0,
  onlineLastError: "",
  usesServerEconomyAuthority: () => true,
  resolveLoginPresentationWelcomePhase: () => {},
  updateOnlineUi: () => {},
  showToast: () => {},
  console,
};
const economyRequests = [];
const economyRequestPayloads = [];
const appliedResults = [];
economyContext.getOnlineApi = () => ({
  collectEconomy: payload => {
    economyRequestPayloads.push(payload);
    return new Promise(resolve => economyRequests.push(resolve));
  },
});
economyContext.applyServerEconomyResult = (result, options) => appliedResults.push({ result, options });
vm.createContext(economyContext);
for (const name of [
  "mergeServerEconomyRefreshOptions",
  "performServerEconomyRefresh",
  "refreshServerEconomy",
]) {
  vm.runInContext(functionSource(name), economyContext, { filename: "game.js" });
}

async function validateAsyncBehavior() {
  const heartbeatWarnings = [];
  const appliedMemberships = [];
  let heartbeatCalls = 0;
  const heartbeatContext = {
    GAME_SERVER_ID: "crown-marches",
    GAME_SERVER_HEARTBEAT_TIMEOUT_MS: 10,
    gameServerHeartbeatGeneration: 0,
    gameServerHeartbeatInFlight: false,
    hasActiveGameServerSlot: () => true,
    isWaitingForGameServerSlot: () => false,
    getOnlineApi: () => ({
      isSignedIn: () => true,
      heartbeatGameServer: () => {
        heartbeatCalls += 1;
        return heartbeatCalls === 1
          ? new Promise(() => {})
          : Promise.resolve({ serverId: "crown-marches", status: "active" });
      },
    }),
    applyGameServerMembership: result => appliedMemberships.push(result),
    console: { warn: (...args) => heartbeatWarnings.push(args) },
    window: { setTimeout, clearTimeout },
    Error,
    Promise,
  };
  vm.createContext(heartbeatContext);
  vm.runInContext(functionSource("withTimeout"), heartbeatContext, { filename: "game.js" });
  vm.runInContext(gameServerHeartbeat, heartbeatContext, { filename: "game.js" });
  assert.equal(
    await Promise.race([
      heartbeatContext.heartbeatGameServerMembership(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Heartbeat regression test did not settle.")), 100)),
    ]),
    false,
    "A lost heartbeat response did not fail safely."
  );
  assert.equal(heartbeatContext.gameServerHeartbeatInFlight, false, "A timed-out heartbeat retained the in-flight lock.");
  assert.equal(heartbeatWarnings.length, 1, "A timed-out heartbeat was not recorded for diagnostics.");
  assert.equal(await heartbeatContext.heartbeatGameServerMembership(), true, "The heartbeat could not retry after timing out.");
  assert.equal(heartbeatCalls, 2, "The heartbeat retry did not reach the server adapter exactly once.");
  assert.deepEqual(
    { ...appliedMemberships[0] },
    { serverId: "crown-marches", status: "active" },
    "The successful retry did not apply the authoritative membership."
  );

  const lifecycleHeartbeatResolvers = [];
  const lifecycleAppliedMemberships = [];
  let lifecycleHeartbeatCalls = 0;
  const heartbeatLifecycleContext = {
    GAME_SERVER_ID: "crown-marches",
    GAME_SERVER_HEARTBEAT_TIMEOUT_MS: 1000,
    gameServerHeartbeatGeneration: 0,
    gameServerHeartbeatInFlight: false,
    gameServerHeartbeatIntervalId: 0,
    hasActiveGameServerSlot: () => true,
    isWaitingForGameServerSlot: () => false,
    getOnlineApi: () => ({
      isSignedIn: () => true,
      heartbeatGameServer: () => {
        lifecycleHeartbeatCalls += 1;
        return new Promise(resolve => lifecycleHeartbeatResolvers.push(resolve));
      },
    }),
    applyGameServerMembership: result => lifecycleAppliedMemberships.push(result),
    console,
    window: { setTimeout, clearTimeout, clearInterval: () => {} },
    Error,
    Promise,
  };
  vm.createContext(heartbeatLifecycleContext);
  vm.runInContext(functionSource("withTimeout"), heartbeatLifecycleContext, { filename: "game.js" });
  vm.runInContext(functionSource("stopGameServerHeartbeat"), heartbeatLifecycleContext, { filename: "game.js" });
  vm.runInContext(gameServerHeartbeat, heartbeatLifecycleContext, { filename: "game.js" });

  const staleHeartbeat = heartbeatLifecycleContext.heartbeatGameServerMembership();
  heartbeatLifecycleContext.stopGameServerHeartbeat();
  const currentHeartbeat = heartbeatLifecycleContext.heartbeatGameServerMembership();
  assert.equal(lifecycleHeartbeatCalls, 2, "A restarted heartbeat lifecycle did not start one replacement request.");

  lifecycleHeartbeatResolvers[0]({ serverId: "crown-marches", status: "active", response: "stale" });
  assert.equal(await staleHeartbeat, false, "A stopped heartbeat lifecycle applied its late response.");
  assert.equal(lifecycleAppliedMemberships.length, 0, "A stale heartbeat response replaced current membership state.");
  assert.equal(heartbeatLifecycleContext.gameServerHeartbeatInFlight, true, "A stale heartbeat cleared the replacement request lock.");
  assert.equal(await heartbeatLifecycleContext.heartbeatGameServerMembership(), false, "A third heartbeat overlapped the current replacement request.");
  assert.equal(lifecycleHeartbeatCalls, 2, "A stale finalizer allowed an overlapping heartbeat request.");

  lifecycleHeartbeatResolvers[1]({ serverId: "crown-marches", status: "active", response: "current" });
  assert.equal(await currentHeartbeat, true, "The current heartbeat did not settle after a lifecycle restart.");
  assert.equal(heartbeatLifecycleContext.gameServerHeartbeatInFlight, false, "The current heartbeat retained its in-flight lock.");
  assert.deepEqual(
    { ...lifecycleAppliedMemberships[0] },
    { serverId: "crown-marches", status: "active", response: "current" },
    "The lifecycle restart did not apply only the current heartbeat response."
  );

  const initialRefresh = economyContext.refreshServerEconomy(false, { renderCities: false });
  const resumeRefresh = economyContext.refreshServerEconomy(true, { showOfflineRewards: true });
  assert.equal(initialRefresh, resumeRefresh, "Concurrent economy callers must share one draining promise.");
  assert.equal(economyRequests.length, 1, "Resume started a duplicate economy request before the active request settled.");

  economyRequests[0]({ ok: true, production: { goldGained: 120, troopsGained: 45, elapsedSeconds: 1200 } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(economyRequests.length, 2, "A forced resume during a poll must queue exactly one follow-up request.");
  assert.equal(appliedResults[0].options.showOfflineRewards, true, "The active economy result lost the queued Welcome Back option.");

  economyRequests[1]({ ok: true, production: { goldGained: 0, troopsGained: 0, elapsedSeconds: 0 } });
  assert.equal(await initialRefresh, true, "The shared economy drain did not report success.");
  assert.equal(economyContext.serverEconomyRefreshInFlight, false, "Economy refresh remained locked after draining.");

  economyContext.pendingWelcomeBackSession = { eligible: true };
  const welcomeRefresh = economyContext.refreshServerEconomy(true, {
    requestWelcomeBack: true,
    showOfflineRewards: true,
  });
  economyContext.refreshServerEconomy(true, {
    requestWelcomeBack: true,
    showOfflineRewards: true,
    resumeCatchUp: true,
  });
  assert.equal(economyRequestPayloads[2].includeWelcomeBack, true);
  economyRequests[2]({
    ok: true,
    awaySummary: { goldGained: 500, troopsGained: 20, elapsedSeconds: 300 },
    production: { goldGained: 500, troopsGained: 20, elapsedSeconds: 300 },
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(economyRequestPayloads[3].includeWelcomeBack, false, "A queued economy refresh can claim the same Welcome Back summary twice.");
  economyRequests[3]({ ok: true, production: { goldGained: 0, troopsGained: 0, elapsedSeconds: 0 } });
  assert.equal(await welcomeRefresh, true);
  assert.equal(economyContext.pendingWelcomeBackSession, null);

  const foregroundEconomyOptions = [];
  const foregroundPresentationStarts = [];
  const foregroundContext = {
    FOREGROUND_LONG_RESUME_MS: 60_000,
    ONLINE_WORLD_ID: "world",
    getCurrentOnlineUid: () => "qa",
    pendingWelcomeBackSession: null,
    onlineRealtimeRecoveryNeeded: false,
    navigator: { onLine: true },
    gameBackgroundProductionCities: [],
    getOnlineApi: () => ({ isSignedIn: () => true }),
    isOnlineWorldActive: () => true,
    usesServerEconomyAuthority: () => true,
    getActiveOnlineRegionId: () => "center",
    refreshServerEconomy: (_force, options) => {
      foregroundEconomyOptions.push(options);
      return true;
    },
    beginLoginPresentationSequence: options => {
      foregroundPresentationStarts.push(options);
      return foregroundPresentationStarts.length;
    },
    startLoginPresentationDailyRefresh: () => {},
    markLoginPresentationMapReady: () => {},
    refreshAllOwnedCities: () => true,
    loadOnlineRegionCitiesForResolution: () => true,
    loadServerReportsOnce: () => true,
    heartbeatGameServerMembership: () => true,
    publishOnlinePresence: () => true,
    restartOnlineRealtimeSubscriptionsForResume: () => true,
    refreshDailyLoginRewardStatus: () => {},
    retryPendingRewardedAdClaim: () => {},
    recoverPendingOnlineArmyMovements: () => {},
    retryOverdueOnlineArmyResolutions: () => {},
    renderAll: () => {},
    updateIncomingAttackUi: () => {},
    updateOutgoingAttackUi: () => {},
    refreshOpenServerDrivenPanels: () => {},
    applyLocalForegroundCatchUp: () => true,
    Promise,
    Boolean,
  };
  vm.createContext(foregroundContext);
  vm.runInContext(functionSource("synchronizeForegroundGame"), foregroundContext, { filename: "game.js" });
  let finishPresence;
  let resumePaints = 0;
  foregroundContext.publishOnlinePresence = () => new Promise(resolve => { finishPresence = resolve; });
  foregroundContext.renderAll = () => { resumePaints += 1; };
  const slowPresenceResume = foregroundContext.synchronizeForegroundGame(120_000);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(resumePaints, 1, "Fresh authoritative economy waited for slow background presence before painting.");
  finishPresence(true);
  assert.equal(await slowPresenceResume, true);
  assert.equal(resumePaints, 1, "Completing unrelated resume reads caused a second full-map repaint.");
  foregroundContext.publishOnlinePresence = () => true;
  foregroundEconomyOptions.length = 0;
  foregroundPresentationStarts.length = 0;
  assert.equal(await foregroundContext.synchronizeForegroundGame(120_000), true);
  assert.deepEqual(
    { ...foregroundEconomyOptions[0] },
    {
      requestWelcomeBack: false,
      showOfflineRewards: true,
      resumeCatchUp: true,
      presentationGeneration: 1,
    },
    "A normal foreground resume requests the stale one-use login summary."
  );
  assert.equal(
    foregroundPresentationStarts[0].welcomeExpected,
    false,
    "The login sequence waits for a Welcome Back receipt that was not requested."
  );
  foregroundContext.pendingWelcomeBackSession = { eligible: true };
  assert.equal(await foregroundContext.synchronizeForegroundGame(5_000), true);
  assert.deepEqual(
    { ...foregroundEconomyOptions[1] },
    {
      requestWelcomeBack: true,
      showOfflineRewards: true,
      resumeCatchUp: true,
      presentationGeneration: 2,
    },
    "An unclaimed login summary is not requested independently of foreground duration."
  );
  assert.equal(
    foregroundPresentationStarts[1].welcomeExpected,
    true,
    "The login sequence does not wait for an eligible Welcome Back receipt."
  );

  let nowMs = 1_201_000;
  let nextTimerId = 1;
  const timers = new Map();
  let performedResumes = 0;
  const lifecycleContext = {
    Date: { now: () => nowMs },
    document: { visibilityState: "visible" },
    window: {
      setTimeout: callback => {
        const id = nextTimerId++;
        timers.set(id, callback);
        return id;
      },
      clearTimeout: id => timers.delete(id),
    },
    FOREGROUND_LONG_RESUME_MS: 60_000,
    FOREGROUND_RESUME_COALESCE_MS: 150,
    gameBackgroundedAtMs: 1000,
    foregroundResumeAwayMs: 0,
    foregroundResumeLongRefresh: false,
    foregroundResumeRequested: false,
    foregroundResumeInFlight: null,
    foregroundResumeCoalesceTimer: 0,
    foregroundResumeRetryTimer: 0,
    foregroundResumeRetryIndex: 0,
    onlineRealtimeRecoveryNeeded: false,
    performGameForegroundResume: () => { performedResumes += 1; },
  };
  vm.createContext(lifecycleContext);
  vm.runInContext(functionSource("scheduleGameForegroundResume"), lifecycleContext, { filename: "game.js" });
  assert.equal(lifecycleContext.scheduleGameForegroundResume("visibilitychange"), true);
  assert.equal(lifecycleContext.foregroundResumeLongRefresh, true, "A 20-minute suspension was not classified as a long resume.");
  assert.equal(lifecycleContext.scheduleGameForegroundResume("focus"), true);
  assert.equal(timers.size, 1, "Foreground event burst was not coalesced into one timer.");
  [...timers.values()][0]();
  assert.equal(performedResumes, 1, "Foreground event burst executed more than one resume.");

  const shownSummaries = [];
  const modalContext = {
    modal: { open: true },
    pendingOfflineRewardsSummary: null,
    loginPresentationSequence: null,
    isLoginPresentationSequenceActive: () => false,
    advanceLoginPresentationSequence() {},
    screenRewardAnimationBlockUntilMs: 0,
    showOfflineRewardsModal: summary => shownSummaries.push(summary),
    window: { setTimeout: callback => callback() },
    Date,
    Map,
    Math,
    Number,
    String,
  };
  vm.createContext(modalContext);
  for (const name of ["mergeOfflineRewardsSummaries", "deferWhileScreenRewardAnimationRuns", "queueOfflineRewardsSummary", "showPendingOfflineRewardsSummary"]) {
    vm.runInContext(functionSource(name), modalContext, { filename: "game.js" });
  }
  modalContext.queueOfflineRewardsSummary({ goldGained: 10, troopsGained: 5, elapsed: 60, lostCities: [] });
  assert.equal(shownSummaries.length, 0, "Welcome Back summary replaced an active command modal.");
  modalContext.modal.open = false;
  assert.equal(modalContext.showPendingOfflineRewardsSummary(), true);
  assert.equal(shownSummaries.length, 1, "Deferred Welcome Back summary was not shown after the modal closed.");
}

validateAsyncBehavior()
  .then(() => console.log("Validated coalesced foreground resume, heartbeat timeout recovery, authoritative catch-up, listener recovery, retries, and safe summaries."))
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
