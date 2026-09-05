"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const game = fs.readFileSync(path.join(__dirname, "../game.js"), "utf8");
const clientSource = fs.readFileSync(path.join(__dirname, "../firebaseClient.js"), "utf8");
const adapterFunctions = new Set(["getOnlineRequestScope", "readPendingOnlineArmyMovements", "writePendingOnlineArmyMovements", "forgetPendingOnlineArmyMovement", "submitRecoverableArmyOrder", "recoverPendingOnlineArmyMovements", "withArmyConfirmationTimeout", "isRetryableArmySubmissionError", "loadArmyOrder"]);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function extract(name) {
  const source = adapterFunctions.has(name) ? clientSource : game;
  const match = new RegExp(`(?:async )?function ${name}\\(`).exec(source);
  assert(match, `Missing ${name}`);
  let at = source.indexOf("(", match.index), depth = 0;
  do { if (source[at] === "(") depth++; if (source[at] === ")") depth--; at++; } while (depth);
  at = source.indexOf("{", at); depth = 0;
  do { if (source[at] === "{") depth++; if (source[at] === "}") depth--; at++; } while (depth);
  return source.slice(match.index, at);
}
function load(context, names) {
  vm.createContext(context);
  for (const name of names) vm.runInContext(extract(name), context, {filename:`game.js:${name}`});
  return context;
}
function storage() {
  const values = new Map();
  return {getItem:key=>values.get(key)||null, setItem:(key,value)=>values.set(key,value), removeItem:key=>values.delete(key)};
}
function fixture(store = storage()) {
  const ctx = {
    uid: "alice", ONLINE_WORLD_ID:"world", RESET_GENERATION:"reset", REALM_SHARD_ID:"realm",
    PENDING_ARMY_STORAGE_KEY:"pending", PENDING_ARMY_MAX_AGE_MS:259200000,
    localStorage:store, armySubmissionPromises:new Map(), pendingOutgoingMissions:new Map(), pendingArmyRecoveryInFlight:false,
    navigator:{onLine:true}, window:{setTimeout:callback=>setTimeout(callback,1),clearTimeout},
    getCurrentOnlineUid:()=>ctx.uid, getOnlineApi:()=>ctx.api, isOnlineWorldActive:()=>true,
    normalizeRegionId:value=>value, api:{}, adopted:[],
    adoptServerArmyMovement:army=>ctx.adopted.push(army),
    refreshServerEconomy:()=>true, loadServerReportsOnce:()=>true, updateOutgoingAttackUi:()=>{},
    console:{warn:()=>{}}, Math, Date, JSON, Promise, Error, Map, Set,
  };
  ctx.client={get user(){return {uid:ctx.uid};}};
  ctx.sendArmyOrder=data=>ctx.api.sendArmyOrder(data);
  ctx.loadArmyOrder=id=>ctx.api.loadArmyOrder(id);
  load(ctx, ["getOnlineRequestScope", "readPendingOnlineArmyMovements", "writePendingOnlineArmyMovements",
    "forgetPendingOnlineArmyMovement", "isRetryableArmySubmissionError", "submitRecoverableArmyOrder", "recoverPendingOnlineArmyMovements", "withArmyConfirmationTimeout"]);
  return ctx;
}
function payload(id, target="target", troops=1) {
  return {armyId:id,targetRegionId:"east",targetType:"city",army:{id,kind:"scout",toId:target,troops,requestedTroops:troops}};
}
function networkError() { return Object.assign(new Error("Synthetic response loss"),{code:"functions/unavailable"}); }

async function submissions() {
  const store = storage(), ctx = fixture(store), accepted = new Map(), ids=[];
  let charges=0, drop=true;
  ctx.api.sendArmyOrder = async data => {
    const id=data.armyId;ids.push(id);
    if (!accepted.has(id)) { accepted.set(id,{...data.army,id,status:"active"});charges++; }
    if (drop) throw networkError();
    return {movement:accepted.get(id),duplicate:true};
  };
  ctx.navigator.onLine=false;
  await assert.rejects(ctx.submitRecoverableArmyOrder(payload("first")),error=>error.code==="functions/unavailable");
  assert.equal(charges,1);
  assert.equal(ctx.readPendingOnlineArmyMovements().length,1,"An uncertain submission was discarded.");
  await assert.rejects(ctx.submitRecoverableArmyOrder(payload("changed","target",2)),/earlier order/);
  drop=false;ctx.navigator.onLine=true;
  const retry=await ctx.submitRecoverableArmyOrder(payload("new-client-id"));
  assert.equal(retry.movement.id,"first","A manual retry changed the uncertain order ID.");
  assert.deepEqual(ids,["first","first"]);
  assert.equal(charges,1,"Response loss charged twice.");
  assert.equal(ctx.readPendingOnlineArmyMovements().length,0);

  let finish;
  ctx.api.sendArmyOrder = data => new Promise(resolve=>{finish=()=>resolve({movement:{...data.army,status:"active"}});});
  const one=ctx.submitRecoverableArmyOrder(payload("dedupe"));
  const two=ctx.submitRecoverableArmyOrder(payload("ignored"));
  assert.equal(one,two,"Concurrent duplicate taps did not share their request.");
  await wait(0);finish();await one;

  ctx.api.sendArmyOrder=async()=>{throw Object.assign(new Error("No troops"),{code:"functions/failed-precondition"});};
  await assert.rejects(ctx.submitRecoverableArmyOrder(payload("denied")),/No troops/);
  assert.equal(ctx.readPendingOnlineArmyMovements().length,0,"A definitive rejection retained an uncertain order.");
  const broken=fixture({getItem:()=>null,setItem:()=>{throw Error("Storage full");},removeItem:()=>{}});
  broken.api.sendArmyOrder=()=>assert.fail("Storage failure dispatched an unrecoverable order");
  await assert.rejects(broken.submitRecoverableArmyOrder(payload("storage")),/storage/);

  const reloadStore=storage(), beforeReload=fixture(reloadStore);
  beforeReload.navigator.onLine=false;
  beforeReload.api.sendArmyOrder=async()=>{throw networkError();};
  for (const id of ["slow","ready","unknown"]) await assert.rejects(beforeReload.submitRecoverableArmyOrder(payload(id,id)));
  const afterReload=fixture(reloadStore);
  let releaseSlow;
  afterReload.api.loadArmyOrder=id=>id==="slow"?new Promise(resolve=>{releaseSlow=resolve;}):Promise.resolve(id==="ready"?{id,status:"active"}:null);
  afterReload.api.sendArmyOrder=()=>assert.fail("Reconnect must not resend an uncertain action");
  const recovery=afterReload.recoverPendingOnlineArmyMovements(army=>afterReload.adopted.push(army));
  await wait(10);
  assert.equal(afterReload.adopted[0]?.id,"ready","One slow confirmation blocked another accepted order.");
  releaseSlow(null);await recovery;
  assert.equal(afterReload.readPendingOnlineArmyMovements().length,2,"Unknown orders were discarded instead of remaining replay-safe.");
  const bob=fixture(reloadStore);bob.uid="bob";
  bob.api.loadArmyOrder=()=>assert.fail("Another account's journal was queried");
  await bob.recoverPendingOnlineArmyMovements();

  const stale=fixture();let reject;
  let sends=0;
  stale.api.sendArmyOrder=()=>{sends++;return new Promise((_,r)=>{reject=r;});};
  const old=stale.submitRecoverableArmyOrder(payload("old"));await wait(0);
  stale.uid="bob";reject(networkError());await assert.rejects(old);
  assert.equal(sends,1,"A stopped account retried under the replacement account.");
  stale.uid="alice";
  assert.equal(stale.readPendingOnlineArmyMovements().length,1);

  const resolved=fixture();resolved.api.sendArmyOrder=async()=>{throw Object.assign(new Error("Already sent"),{code:"functions/already-exists"});};
  resolved.api.loadArmyOrder=async id=>({id,status:"resolved"});
  const receipt=await resolved.submitRecoverableArmyOrder(payload("completed"));
  assert.equal(receipt.alreadyResolved,true,"A completed order was treated as a new active march.");
  resolved.api.loadArmyOrder=async()=>{throw Object.assign(new Error("Read interrupted"),{code:"permission-denied"});};
  await assert.rejects(resolved.submitRecoverableArmyOrder(payload("unconfirmed")),error=>error.code==="functions/unknown");
  assert.equal(resolved.readPendingOnlineArmyMovements().length,1,"A failed receipt lookup discarded an accepted order.");
}

async function canonicalReads() {
  const ctx={init:async()=>{},requireSignedIn:()=>ctx.client.user.uid,client:{user:{uid:"alice"},db:{},modules:{firestore:{}}},
    ONLINE_WORLD_ID:"world",RESET_GENERATION:"reset",REALM_SHARD_ID:"shard"};
  let row={ownerUid:"alice",worldId:"world",resetGeneration:"reset",realmShardId:"shard",status:"resolved"};
  ctx.client.modules.firestore.doc=(_db,...parts)=>{assert.deepEqual(parts,["armies","receipt"]);return parts.join("/");};
  ctx.client.modules.firestore.getDocFromServer=async()=>({exists:()=>Boolean(row),id:"receipt",data:()=>row});
  load(ctx,["loadArmyOrder"]);
  assert.equal((await ctx.loadArmyOrder("receipt")).status,"resolved");
  for(const field of ["ownerUid","worldId","resetGeneration","realmShardId"]) {
    const saved=row[field];row[field]="other";assert.equal(await ctx.loadArmyOrder("receipt"),null);row[field]=saved;
  }
  assert.equal(await ctx.loadArmyOrder("../unsafe"),null);
  row=null;assert.equal(await ctx.loadArmyOrder("receipt"),null);
  let finish;ctx.client.modules.firestore.getDocFromServer=()=>new Promise(resolve=>{finish=resolve;});
  const read=ctx.loadArmyOrder("receipt");await wait(0);ctx.client.user.uid="bob";
  finish({exists:()=>{assert.fail("An old account's result was inspected");}});
  assert.equal(await read,null);
}

async function previews() {
  const ctx={authoritativeRoutePreviewTimer:0,authoritativeRoutePreviewRequestId:0,authoritativeRoutePreviewPendingKey:"",
    selectedTroopAmount:10,activeTroopOrderKind:"attack",AUTHORITATIVE_ROUTE_PREVIEW_DEBOUNCE_MS:1,
    supportsAuthoritativeArmyRoutes:()=>true,getTroopTravelBandIndex:n=>Math.floor(n/100),
    scope:"alice:realm",getOnlineRequestScope:()=>ctx.scope,getCityRegionId:city=>city.regionId,
    troopSliderActive:true,modal:{open:true,classList:{contains:()=>true}},
    window:{setTimeout,clearTimeout},cloneRoute:route=>({...route}),updates:[],requests:[],
    requestAuthoritativeOrderRoute:(_s,_t,_k,n)=>new Promise(resolve=>ctx.requests.push({n,resolve})),
    updateTroopSliderModal:(_s,_t,route)=>ctx.updates.push(route),
  };
  const source={id:"source",regionId:"west"},target={id:"target",regionId:"east"},route={points:[{x:0,y:0},{x:1,y:1}]};
  ctx.activeTroopSliderRoute={sourceId:source.id,targetId:target.id,route};
  load(ctx,["cancelAuthoritativeRoutePreviewRefresh","scheduleAuthoritativeRoutePreviewRefresh"]);
  ctx.scheduleAuthoritativeRoutePreviewRefresh(source,target,route);await wait(10);
  for(let n=0;n<4;n++){ctx.scheduleAuthoritativeRoutePreviewRefresh(source,target,{...route});await wait(3);}
  assert.equal(ctx.requests.length,1,"Unrelated slider repaints restarted a slow preview.");
  ctx.requests[0].resolve({...route,authoritativeDurationSeconds:30,authoritativeRequestedTroops:10});await wait(0);
  assert.equal(ctx.updates.length,1,"A completed slow preview was discarded.");
  ctx.selectedTroopAmount=200;ctx.scheduleAuthoritativeRoutePreviewRefresh(source,target,route);await wait(10);
  ctx.selectedTroopAmount=300;ctx.scheduleAuthoritativeRoutePreviewRefresh(source,target,route);await wait(10);
  ctx.requests[1].resolve({...route,authoritativeDurationSeconds:99});await wait(0);
  assert.equal(ctx.updates.length,1,"An older troop band's result replaced the current preview.");
  ctx.scope="bob:realm";ctx.requests[2].resolve({...route,authoritativeDurationSeconds:88});await wait(0);
  assert.equal(ctx.updates.length,1,"A previous account's preview was applied.");
  ctx.cancelAuthoritativeRoutePreviewRefresh();
}

async function reports() {
  const ctx={state:{},scope:"alice",getOnlineRequestScope:()=>ctx.scope,onlineLastError:"",audioServerReportsHydrated:false,
    getOnlineApi:()=>ctx.api,api:{isSignedIn:()=>true},withTimeout:p=>p,merged:[],mergeServerReports:rows=>{ctx.merged.push(rows);return false;},console:{warn:()=>{}}};
  load(ctx,["loadServerReportsOnce"]);
  ctx.api.loadServerReports=async()=>[];
  assert.equal(await ctx.loadServerReportsOnce(),true,"An unchanged valid report snapshot was treated as a failed read.");
  let finish;ctx.api.loadServerReports=()=>new Promise(resolve=>{finish=resolve;});
  const task=ctx.loadServerReportsOnce();ctx.scope="bob";finish([{id:"private-old-report"}]);
  assert.equal(await task,false);assert.equal(ctx.merged.length,1,"An old account's one-time reports were merged.");
}

(async()=>{await submissions();await canonicalReads();await previews();await reports();console.log("Connection recovery passed: stable preview requests, durable submission IDs, independent read-only reconciliation, canonical receipt authorization, stale-session isolation, and report read outcomes.");})().catch(error=>{console.error(error);process.exitCode=1;});
