"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const timing = require("../functions/operation-timing");
const source = fs.readFileSync(require.resolve("../functions/index.js"), "utf8");
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const failure = new Error("private-error-text");
  const [first, second] = await Promise.all([
    timing.run(async () => {
      await timing.measure("realmContext", () => wait(12));
      timing.transactionAttempt();
      assert.equal(timing.measure("routePlanning", () => 7), 7);
      await assert.rejects(timing.measure("documentReads", async () => {throw failure;}), error => error === failure);
      return timing.snapshot();
    }),
    timing.run(async () => {
      timing.transactionAttempt(); timing.transactionAttempt();
      await timing.measure("transaction", () => wait(3));
      return timing.snapshot();
    }),
  ]);
  assert.equal(first.transactionAttempts, 1);
  assert.equal(second.transactionAttempts, 2, "Concurrent requests shared timing counters.");
  assert(first.requestDurationMs >= first.phaseDurationMs.realmContext);
  assert(!("realmContext" in second.phaseDurationMs));
  assert(!JSON.stringify([first, second]).includes("private-error-text"));
  assert.deepEqual(timing.snapshot(), {}, "Request timing escaped its async context.");
  assert.equal(timing.measure("ignored", () => 5), 5);
  assert.throws(() => timing.measure("routePlanning", () => {throw failure;}), error => error === failure);

  let passedOptions, callbacks = 0;
  const context = {OPERATION_TIMING:timing,db:{runTransaction:async (callback, options)=>{
    passedOptions=options;await callback({attempt:1});return callback({attempt:2});
  }}};
  vm.createContext(context);
  const start=source.indexOf("function measuredTransaction");
  const end=source.indexOf("function isRetryableTransactionInfrastructureError",start);
  vm.runInContext(source.slice(start,end),context);
  const measured=await timing.run(async()=>{
    const result=await context.measuredTransaction(tx=>{callbacks++;return tx.attempt;},{readOnly:true});
    return {result,...timing.snapshot()};
  });
  assert.equal(measured.result,2);assert.equal(callbacks,2);
  assert.equal(measured.transactionAttempts,2,"Firestore's internal retries were not counted.");
  assert.equal(passedOptions.readOnly,true,"The read-only option was dropped by transaction instrumentation.");
  const preview=source.slice(source.indexOf("exports.previewArmyRoute"),source.indexOf("exports.getSeasonalAchievementStatus"));
  assert.match(preview,/transaction\.getAll\(sourceRef, targetRef, playerRef, globalStatsRef\)/);
  assert.match(preview,/snapshotAnchor = await OPERATION_TIMING.measure\("documentReads", \(\) => playerRef.get\(\)\)/);
  assert.match(preview,/"previewArmyRoute", 3, \{ readOnly: true, readTime: snapshotAnchor.readTime \}/);
  console.log("Operation timing passed: concurrent isolation, no payload/error retention, preserved results/errors, batched read-only preview, and retry accounting.");
})().catch(error=>{console.error(error);process.exitCode=1;});
