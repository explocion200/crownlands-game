"use strict";
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const realm = require("../release-config.json");
const economy = require("../economy-config.json");
const { createTravelFixture, canonicalCity } = require("../../tools/world-travel-test-fixtures.js");
if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("This test requires the Firestore emulator.");
const projectId = process.env.GCLOUD_PROJECT || "crown-land-b15e0";
initializeApp({ projectId });
const db = getFirestore();
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
let functionsHost;
let identity = { releaseId: realm.releaseId, resetGeneration: realm.resetGeneration, worldId: realm.worldId, realmShardId: "legacy" };
const fixture = createTravelFixture();

async function user(label) {
  const response = await fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: `travel-${label}-${randomUUID()}@example.test`, password: "Travel-Emulator-Only-123!", returnSecureToken: true }),
  });
  const body = await response.json();
  assert(response.ok, "Emulator auth signup failed.");
  return { uid: body.localId, token: body.idToken, label };
}

async function call(name, actor, data = {}) {
  if (!functionsHost) {
    const hub = await fetch(`http://${process.env.FIREBASE_EMULATOR_HUB || "127.0.0.1:4400"}/emulators`).then(response => response.json());
    functionsHost = `${hub.functions.host}:${hub.functions.port}`;
  }
  const response = await fetch(`http://${functionsHost}/${projectId}/us-central1/${name}`, {
    method: "POST", headers: { authorization: `Bearer ${actor.token}`, "content-type": "application/json" },
    body: JSON.stringify({ data: { ...data, clientReleaseId: identity.releaseId, clientResetGeneration: identity.resetGeneration,
      clientWorldId: identity.worldId, clientRealmShardId: identity.realmShardId } }),
  });
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(`${name}: ${JSON.stringify(body.error || body)}`);
  return body.result;
}

function cityRef(city) {
  return db.doc(`islands/${identity.worldId}--${identity.realmShardId}--${city.regionId}/cities/${city.id}`);
}

async function own(city, actor, troops = 1_000) {
  await cityRef(city).set({ ...city, ...identity, ownerKind: "player", owner: "player", ownerUid: actor.uid,
    ownerName: actor.label, troops, troopFloat: troops, isMainCity: false, productionUpdatedAtMs: Date.now() + 3_600_000 }, { merge: true });
}

async function neutral(city) {
  await cityRef(city).set({ ...city, ...identity, ownerKind: "neutral", owner: "neutral", ownerUid: "", ownerName: "Neutral",
    kind: "city", isStronghold: false, isMainCity: false, level: 1, troops: 100, troopFloat: 100,
    productionUpdatedAtMs: Date.now() + 3_600_000 }, { merge: true });
}

function payload(id, source, target, kind, troops = 10) {
  return { armyId: id, sourceRegionId: source.regionId, targetRegionId: target.regionId, targetType: "city",
    army: { id, fromId: source.id, toId: target.id, kind, troops, requestedTroops: troops,
      sourceRegionId: source.regionId, targetRegionId: target.regionId,
      // Malicious geometry/ETA must never shorten the trusted route.
      pathLength: 1, total: 0.001, path: [{ x: 0, y: 0 }, { x: 1, y: 1 }], pathSegments: [] } };
}

async function settle(actor, movement) {
  const stored = (await db.doc(`armies/${movement.id}`).get()).data();
  assert.deepEqual(stored.pathSegments, movement.pathSegments, "Reload lost march geometry.");
  assert.deepEqual(stored.routeRegionIds, movement.routeRegionIds, "Reload lost traversed maps.");
  for (const regionId of movement.routeRegionIds) {
    const view = await db.doc(`islands/${identity.worldId}--${identity.realmShardId}--${regionId}/armies/${movement.id}`).get();
    assert(view.exists, `March is absent on intermediate map ${regionId}.`);
  }
  await assert.rejects(call("resolveArmyOrder", actor, { armyId: movement.id, regionIds: movement.routeRegionIds }), /not arrived yet/);
  assert.equal((await db.doc(`armies/${movement.id}`).get()).data().status, "active", "March resolved early.");
  // Advance only the emulator clock for the persisted march, preserving its path.
  await db.doc(`armies/${movement.id}`).update({ arrivesAtMs: Date.now() - 1_000 });
  const result = await call("resolveArmyOrder", actor, { armyId: movement.id, regionIds: movement.routeRegionIds });
  assert(result.ok, `Arrival failed for ${movement.kind}.`);
  const replay = await call("resolveArmyOrder", actor, { armyId: movement.id, regionIds: movement.routeRegionIds });
  assert(replay.ok, "Arrival retry failed.");
  return result;
}

async function march(actor, source, target, kind, minimumMaps) {
  const troops = kind === "scout" ? 1 : 10;
  const preview = await call("previewArmyRoute", actor, { fromId: source.id, toId: target.id,
    sourceRegionId: source.regionId, targetRegionId: target.regionId, kind, requestedTroops: troops });
  assert(preview.routeRegionIds.length >= minimumMaps);
  assert(Number.isFinite(preview.durationMs) && preview.durationMs > 0);
  const marchOrders = economy.skills.marchOrders;
  const expectedSpeedMultiplier = 1 + Math.min(5 * marchOrders.percentPerLevel, marchOrders.maxPercent) / 100;
  assert.equal(preview.speedMultiplier, expectedSpeedMultiplier, "Travel bonus must expose the configured five-level March Orders multiplier.");
  const id = `travel_${kind}_${randomUUID().replaceAll("-", "")}`;
  const request = payload(id, source, target, kind, troops);
  const launched = await call("sendArmyOrder", actor, request);
  const movement = launched.movement;
  assert(movement, `${kind} did not create a march.`);
  assert.equal(movement.fromId, source.id, "The intended available source was not selected.");
  assert.equal(Math.ceil(movement.total * 1000), preview.durationMs, `${kind} preview disagrees with launch.`);
  assert.deepEqual(movement.pathSegments, preview.segments, `${kind} preview geometry disagrees with launch.`);
  const replay = await call("sendArmyOrder", actor, request);
  assert.equal(replay.movement.id, movement.id, "Retry duplicated a march.");
  const result = await settle(actor, movement);
  console.log(`${kind}: ${movement.routeRegionIds.length} maps, ${preview.durationMs}ms, arrival ${result.outcome || result.status}.`);
  return { movement, result };
}

async function main() {
  await verifyReadOnlyPreviewIsolation();
  const [leader, ally] = await Promise.all([user("Road Leader"), user("Road Ally")]);
  const info = await call("getRealmInfo", leader);
  assert.equal(info.worldTopology, "core-expansion-v1");
  identity = { releaseId: info.currentReleaseId, worldId: info.worldId, resetGeneration: info.resetGeneration, realmShardId: info.sharedRealmId };
  const leaderClaim = await call("claimStartingCity", leader, { playerName: leader.label });
  const allyClaim = await call("claimStartingCity", ally, { playerName: ally.label });
  const stateRef = db.doc(`realmGenerations/${identity.resetGeneration}/expansion/current`);
  await stateRef.set({ activeRegionIds: fixture.activeRegionIds, admittingRegionIds: fixture.activeRegionIds,
    nextActivationOrdinal: fixture.activeRegionIds.length }, { merge: true });
  const source = canonicalCity(fixture.planner, fixture.activeRegionIds[0], 10);
  const farRegion = fixture.activeRegionIds[12];
  for (const regionId of [source.regionId, fixture.activeRegionIds[1], fixture.activeRegionIds[2], farRegion]) {
    await call("ensureMainIsland", leader, { regionId });
  }
  // Drain the actual Main Cities so automatic Scout selection has one eligible source.
  await db.doc(`islands/${leaderClaim.islandId}/cities/${leaderClaim.cityId}`).update({ troops: 0, troopFloat: 0, productionUpdatedAtMs: Date.now() + 3_600_000 });
  await db.doc(`islands/${allyClaim.islandId}/cities/${allyClaim.cityId}`).update({ troops: 0, troopFloat: 0, productionUpdatedAtMs: Date.now() + 3_600_000 });
  const clanId = `travel_clan_${randomUUID().replaceAll("-", "")}`;
  await db.doc(`clans/${clanId}`).set({ ...identity, status: "active", leaderUid: leader.uid, name: "Road Clan", tag: "ROAD", memberCount: 2 });
  for (const [actor, role] of [[leader, "leader"], [ally, "member"]]) {
    await db.doc(`clans/${clanId}/members/${actor.uid}`).set({ ...identity, clanId, uid: actor.uid, status: "active", role, displayName: actor.label });
    await db.doc(`players/${actor.uid}`).set({ clanId, clanName: "Road Clan", clanTag: "ROAD", clanRole: role,
      upgrades: { marchOrders: 5 }, itemEffects: {}, gold: 1_000_000, goldFloat: 1_000_000, economyUpdatedAtMs: Date.now() + 3_600_000 }, { merge: true });
  }
  await own(source, leader, 50_000);
  const scoutTarget = canonicalCity(fixture.planner, farRegion, 11);
  await neutral(scoutTarget);
  await march(leader, source, scoutTarget, "scout", 7);
  for (const [ordinal, minMaps] of [[0, 1], [1, 2], [2, 3], [12, 7]]) {
    const target = canonicalCity(fixture.planner, fixture.activeRegionIds[ordinal], 12);
    await neutral(target);
    const { result } = await march(leader, source, target, "attack", minMaps);
    assert(result.outcome, "Attack generated no battle outcome.");
  }
  const transferTarget = canonicalCity(fixture.planner, farRegion, 13);
  await own(transferTarget, leader, 100);
  const before = (await cityRef(transferTarget).get()).data().troops;
  await march(leader, source, transferTarget, "transfer", 7);
  assert((await cityRef(transferTarget).get()).data().troops >= before + 10);
  await march(leader, transferTarget, source, "transfer", 7);
  const alliedCity = canonicalCity(fixture.planner, farRegion, 14);
  await own(alliedCity, ally, 5_000);
  await march(leader, source, alliedCity, "reinforce", 7);
  const stations = await db.collection("reinforcements").where("ownerUid", "==", leader.uid).get();
  assert(stations.docs.some(doc => doc.data().targetId === alliedCity.id && doc.data().status === "stationed"));

  const objectiveModel = [...fixture.planner.routeData.models.values()].find(model => model.map.objectives?.some(objective => objective.type !== "crown"));
  const objective = objectiveModel.map.objectives.find(entry => entry.type !== "crown");
  const rallyId = `travel_rally_${randomUUID().replaceAll("-", "")}`;
  await call("createClanRally", leader, { ...payload(rallyId, source, { ...objective, regionId: objectiveModel.id }, "attack", 100), rallyId });
  const rallyPreview = await call("previewArmyRoute", ally, { fromId: alliedCity.id, toId: source.id,
    sourceRegionId: alliedCity.regionId, targetRegionId: source.regionId, kind: "rally_join", requestedTroops: 100 });
  assert.equal(rallyPreview.kind, "rally_join");
  const joinId = `travel_join_${randomUUID().replaceAll("-", "")}`;
  const joined = await call("joinClanRally", ally, { clanId, rallyId, ...payload(joinId, alliedCity, source, "rally_join", 100) });
  assert.equal(Math.ceil(joined.movement.total * 1000), rallyPreview.durationMs,
    `Rally assembly preview differs from launch: ${rallyPreview.length} vs ${joined.movement.pathLength} map units, ${joined.movement.troops} troops.`);
  assert.equal((await settle(ally, joined.movement)).outcome, "assembled");
  const launchId = `travel_rally_attack_${randomUUID().replaceAll("-", "")}`;
  const launched = await call("launchClanRally", leader, { clanId, rallyId, armyId: launchId });
  const combined = launched.movement || { id: launchId, ...(await db.doc(`armies/${launchId}`).get()).data() };
  assert(combined.pathSegments.length > 1 && combined.rallyAttack);
  await settle(leader, combined);
  console.log("World travel emulator passed: same/one/two/many-map attacks, scout, transfer, reverse transfer, reinforcement, rally assembly/launch/arrival, forged ETA rejection, intermediate views, reconnect reads, and idempotent launch/arrival.");
}

async function verifyReadOnlyPreviewIsolation() {
  const measurements = [];
  for (const readOnly of [false, true]) {
    const ref = db.doc(`reliabilityProbe/${readOnly ? "snapshot" : "locking"}`);
    await ref.set({ value: 1 });
    let begin, release;
    const began = new Promise(resolve => { begin = resolve; });
    const held = new Promise(resolve => { release = resolve; });
    const reader = db.runTransaction(async transaction => {
      const [first] = await transaction.getAll(ref);
      begin(); await held;
      const [second] = await transaction.getAll(ref);
      return [first.data().value, second.data().value];
    }, readOnly ? { readOnly: true } : {});
    await began;
    const started = performance.now();
    let writeCompleted = false;
    const writer = ref.update({ value: 2 }).then(() => {writeCompleted = true;return performance.now()-started;});
    let completedWhileHeld;
    try {
      await Promise.race([writer, new Promise(resolve => setTimeout(resolve, readOnly ? 3000 : 250))]);
      completedWhileHeld = writeCompleted;
    } finally { release(); }
    const [values, writerMs] = await Promise.all([reader, writer]);
    assert.deepEqual(values, [1, 1], "Preview reads lost snapshot consistency during a concurrent update.");
    assert.equal(completedWhileHeld, readOnly, "Preview isolation did not remove its write-blocking read lock.");
    measurements.push({readOnly,writerMs:Math.round(writerMs),consistentSnapshot:true,completedWhileHeld});
  }
  console.log(`Preview transaction isolation: ${JSON.stringify(measurements)}`);
}
main().then(() => process.exit(0)).catch(error => { console.error(error.stack); process.exit(1); });
