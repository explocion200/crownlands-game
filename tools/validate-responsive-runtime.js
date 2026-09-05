"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

async function main() {
  const source = fs.readFileSync(path.resolve(__dirname, "../firebaseClient.js"), "utf8");
  const start = source.indexOf("  const serverRequestTimings = [];");
  const end = source.indexOf("  async function callSensitiveServerFunction(", start);
  assert(start > 0 && end > start);
  let clock = 0;
  const rejection = new Error("synthetic network failure");
  const submitted = [];
  const context = {
    init: async () => {}, requireSignedIn: () => "qa-identity",
    client: { user: {uid:"qa-identity"}, functions: {}, modules: { functions: { httpsCallable: (_service, name) => async payload => {
      submitted.push(payload);
      clock += 37;
      if (name === "failedAction") throw rejection;
      return {data:{privateResult:"not-in-metrics",serverTimeMs:123456}};
    } } } },
    sanitizeForFirestore: payload => payload,
    APP_RELEASE_ID: "release", RESET_GENERATION: "reset", ONLINE_WORLD_ID: "world", REALM_SHARD_ID: "shard",
    serverClock: null, window: {dispatchEvent:()=>{}}, Event: class {}, performance: {now:()=>clock},
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  for(let index=0;index<55;index++) {
    const result = await context.callServerFunction("sendArmyOrder", {privatePayload:"not-in-metrics",armyId:"same-id"});
    assert.equal(result.privateResult,"not-in-metrics");
  }
  await assert.rejects(context.callServerFunction("failedAction"), error => error === rejection);
  const samples = context.getServerRequestTimings();
  assert.equal(samples.length,50,"Diagnostics must remain bounded.");
  assert.equal(samples[0].durationMs,37);
  assert.equal(samples[samples.length-1].succeeded,false);
  assert.deepEqual(Object.keys(samples[0]).sort(),["durationMs","operation","succeeded"]);
  assert(!JSON.stringify(samples).includes("not-in-metrics"));
  assert.equal(submitted[0].armyId,"same-id");
  assert.equal(submitted[0].clientRealmShardId,"shard");
  samples[0].operation="tampered";
  assert.equal(context.getServerRequestTimings()[0].operation,"sendArmyOrder","Diagnostics exposed mutable internal records.");
  await context.callServerFunction("getRealmInfo");
  assert.equal(context.serverClock.atMs,123456+37/2,"Latency measurement changed the authoritative chat clock.");
  let finish;
  context.client.modules.functions.httpsCallable = () => () => new Promise(resolve => {finish=resolve;});
  const stale = context.callServerFunction("sendArmyOrder");
  await new Promise(resolve => setImmediate(resolve));
  context.client.user = {uid:"another-account"};
  finish({data:{currentUser:{gold:9000}}});
  await assert.rejects(stale, error => error.code === "functions/cancelled", "A previous account's callable response escaped into the new session.");
  context.client.user={uid:"qa-identity"};
  let initialized;context.init=()=>new Promise(resolve=>{initialized=resolve;});
  context.requireSignedIn=()=>context.client.user.uid;
  context.client.modules.functions.httpsCallable=()=>assert.fail("An old account's order reached the replacement account's transport.");
  const waiting=context.callServerFunction("sendArmyOrder");
  context.client.user={uid:"another-account"};initialized();
  await assert.rejects(waiting,error=>error.code==="functions/cancelled");
  console.log("Responsive runtime passed: bounded private-data-free timings, response/error parity, authority payload and server clock preserved.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
