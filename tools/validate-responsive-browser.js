"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { CdpClient } = require("./map-benchmark/cdp-client");
const { startBrowserSession, waitForProcessExit, removeBrowserProfile } = require("./validate-focused-browser-smoke");
const baselineRoot = process.argv.find(arg => arg.startsWith("--baseline-root="))?.split("=").slice(1).join("=");
const root = baselineRoot ? path.resolve(baselineRoot) : path.resolve(__dirname, "..");
const { createMapBenchmarkServer } = require(path.join(root, "tools/map-benchmark/server"));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const artifacts = path.resolve(__dirname, "../release-artifacts/performance");

async function verifyConnectionRecovery(client, evaluate) {
  const preview = await evaluate(`(async () => {
    const original = {requestAuthoritativeOrderRoute, supportsAuthoritativeArmyRoutes};
    const source = state.cities.find(city => city.owner === 'player' && city.troops > 0);
    const target = state.cities.find(city => city.id !== source.id && getCityRegionId(city) === getCityRegionId(source) && createInstantOrderRoute(source,city)?.points?.length);
    let calls = 0, finish, requestedTroops;
    supportsAuthoritativeArmyRoutes = () => true;
    requestAuthoritativeOrderRoute = (_s,_t,_k,n) => {calls++; requestedTroops=n;return new Promise(resolve => {finish=resolve;});};
    try {
      selectedSourceId=source.id;selectedTargetId=target.id;sendMode=true;
      await showTroopSliderModalAsync(source, target);
      await new Promise(resolve => setTimeout(resolve, AUTHORITATIVE_ROUTE_PREVIEW_DEBOUNCE_MS+100));
      if(!activeTroopSliderRoute) throw new Error('Troop fixture did not open: '+modalTitle.textContent);
      for(let i=0;i<3;i++) {updateTroopSliderModal(source,target,activeTroopSliderRoute.route);await new Promise(resolve=>setTimeout(resolve,50));}
      const route = activeTroopSliderRoute.route;
      finish({...route,previewStatus:'authoritative',authoritativeDurationSeconds:30,authoritativeRequestedTroops:requestedTroops,authoritativeSpeedMultiplier:1});
      await new Promise(resolve=>setTimeout(resolve,50));
      return {calls,accepted:activeTroopSliderRoute.route.authoritativeDurationSeconds===30};
    } finally {cancelAuthoritativeRoutePreviewRefresh();requestAuthoritativeOrderRoute=original.requestAuthoritativeOrderRoute;supportsAuthoritativeArmyRoutes=original.supportsAuthoritativeArmyRoutes;modal.close();}
  })()`);
  assert.equal(preview.calls,1,"A real troop dialog restarted an in-flight route on repaint.");
  assert(preview.accepted,"A slow route did not reach the real troop dialog.");
  await evaluate(`(() => {
    const original = {usesServerEconomyAuthority,refreshServerEconomy,refreshAllOwnedCities,loadOnlineRegionCitiesForResolution,loadServerReportsOnce,heartbeatGameServerMembership,publishOnlinePresence,restartOnlineRealtimeSubscriptionsForResume};
    const qa = window.connectionRecoveryQa = {reports:0,restarts:0};
    usesServerEconomyAuthority=()=>true;refreshServerEconomy=()=>true;refreshAllOwnedCities=()=>true;loadOnlineRegionCitiesForResolution=()=>true;
    loadServerReportsOnce=()=>++qa.reports>1;heartbeatGameServerMembership=()=>true;publishOnlinePresence=()=>true;
    restartOnlineRealtimeSubscriptionsForResume=()=>{qa.restarts++;onlineRealtimeRecoveryNeeded=false;return Promise.resolve(true);};
    qa.restore=()=>{({usesServerEconomyAuthority,refreshServerEconomy,refreshAllOwnedCities,loadOnlineRegionCitiesForResolution,loadServerReportsOnce,heartbeatGameServerMembership,publishOnlinePresence,restartOnlineRealtimeSubscriptionsForResume}=original);};
  })()`);
  try {
    await client.send("Page.bringToFront");
    await client.send("Emulation.setFocusEmulationEnabled",{enabled:true});
    await client.send("Network.enable");
    await client.send("Network.emulateNetworkConditions", {offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
    await wait(100);
    const offline = await evaluate("navigator.onLine===false && onlineRealtimeRecoveryNeeded");
    assert(offline,"A real offline event did not mark realtime state for recovery.");
    await client.send("Page.setWebLifecycleState",{state:"frozen"});
    await wait(100);
    await client.send("Page.setWebLifecycleState",{state:"active"});
    await client.send("Page.bringToFront");
    await client.send("Network.emulateNetworkConditions", {offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
    for(let i=0;i<80 && !await evaluate("connectionRecoveryQa.reports>=2 && !foregroundResumeInFlight");i++) await wait(100);
    const resumed=await evaluate("({reports:connectionRecoveryQa.reports,restarts:connectionRecoveryQa.restarts,pending:Boolean(foregroundResumeInFlight),online:navigator.onLine,visibility:document.visibilityState,error:onlineLastError})");
    assert(resumed.online && !resumed.pending && resumed.reports>=2 && resumed.reports<=4 && resumed.restarts>=1,
      `Reconnect/freeze recovery did not retry failed reports cleanly: ${JSON.stringify(resumed)}`);
    return {preview,offline,freezeResume:resumed};
  } finally {await evaluate("connectionRecoveryQa.restore()");}
}

async function main() {
  const browser = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/usr/bin/google-chrome", "/usr/bin/chromium"].find(file => file && fs.existsSync(file));
  assert(browser, "Set CHROME_PATH to a Chromium browser.");
  fs.mkdirSync(artifacts, { recursive: true });
  const server = createMapBenchmarkServer();
  const address = await server.listen();
  let session, client;
  const results = [];
  try {
    session = await startBrowserSession(browser);
    client = await CdpClient.connect(session.targets.find(target => target.type === "page").webSocketDebuggerUrl);
    await Promise.all([client.send("Page.enable"), client.send("Runtime.enable")]);
    await client.send("Page.addScriptToEvaluateOnNewDocument", { source: `
      Object.defineProperty(window, 'CrownlandsOnline', {configurable:true, set(api) {
        const qa = window.performanceStartupQa = {};
        const delay = () => new Promise(resolve => setTimeout(resolve, 300));
        const wrapped = {...api,
          syncSkillPointSystem: async (...args) => {
            qa.skillStart = performance.now(); await delay();
            const result = await api.syncSkillPointSystem?.(...args);
            qa.skillEnd = performance.now(); return result;
          },
          loadGameSnapshot: async (...args) => {
            qa.snapshotStart = performance.now(); await delay();
            const result = await api.loadGameSnapshot(...args);
            qa.snapshotEnd = performance.now(); return result;
          },
          loadPlayerProfile: async (...args) => {
            qa.profileStart = performance.now(); return api.loadPlayerProfile(...args);
          }};
        Object.defineProperty(window, 'CrownlandsOnline', {configurable:true,writable:true,value:wrapped});
      }});
    ` });
    const evaluate = async expression => {
      const result = await client.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "landscape", width: 844, height: 390 }, { name: "landscape-4x", width: 844, height: 390, cpuRate: 4 }]) {
      await client.send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: false });
      await client.send("Emulation.setCPUThrottlingRate", {rate:viewport.cpuRate || 1});
      await client.send("Page.navigate", { url: `${address.url}/__benchmark__/?scenario=A&visualMarches=0` });
      for (let i = 0; i < 480 && !await evaluate("window.__CROWNLANDS_BENCHMARK__?.getStatus().status === 'ready'"); i += 1) await wait(250);
      assert.equal(await evaluate("window.__CROWNLANDS_BENCHMARK__.getStatus().status"), "ready");
      const startup = await evaluate("({...performanceStartupQa,readPhaseMs:Math.max(performanceStartupQa.skillEnd,performanceStartupQa.snapshotEnd)-Math.min(performanceStartupQa.skillStart,performanceStartupQa.snapshotStart)})");
      assert(startup.profileStart >= startup.skillEnd, "Startup read the profile before skill migration settled.");
      if (!baselineRoot) assert(startup.snapshotStart < startup.skillEnd, "Independent saved-state loading waited for skill migration.");
      await evaluate("window.__CROWNLANDS_BENCHMARK__.closeModal()");
      await wait(400);
      const pinch = await evaluate(`new Promise(resolve => {
        const bounds = mapFrame.getBoundingClientRect();
        zoom = .6; updateCameraTransform();
        activePointers.set(91, {x: bounds.left + 200, y: bounds.top + 100});
        activePointers.set(92, {x: bounds.left + 400, y: bounds.top + 100});
        beginPinch();
        const before = mapWorld.style.transform;
        activePointers.set(92, {x: bounds.left + 500, y: bounds.top + 100});
        const start = performance.now();
        scheduleMainMapPinchUpdate();
        requestAnimationFrame(() => {
          const firstFrameChanged = before !== mapWorld.style.transform;
          const firstFrameMs = performance.now() - start;
          requestAnimationFrame(() => {
            const secondFrameChanged = before !== mapWorld.style.transform;
            finishTrackedMapPointer({pointerId:92,type:'pointerup'}, {renderPanelAfter:false});
            const resumedDrag = panState?.pointerId === 91 && panState.moved === true;
            activePointers.clear(); pinchState = null; panState = null;
            mapFrame.classList.remove('dragging'); finishCameraInteraction();
            resolve({ firstFrameChanged, secondFrameChanged, firstFrameMs, resumedDrag });
          });
        });
      })`);
      if (!baselineRoot) {
        assert(pinch.firstFrameChanged, "Pinch camera did not paint in its first scheduled frame.");
        assert(pinch.resumedDrag, "Lifting one pinch finger did not resume dragging with the remaining finger.");
      }

      const scout = await evaluate(`(async () => {
        const target = state.cities.find(city => city.owner === 'neutral' && !isStronghold(city) && !city.isMainCity);
        const originalLaunch = launchAutomaticServerScout;
        let finish;
        launchAutomaticServerScout = () => new Promise(resolve => { finish = resolve; });
        try {
          const task = scoutTarget(target);
          renderSelectedForeignWheel(target);
          const buttons = [...cityLayer.querySelectorAll('.wheel-scout')];
          const button = buttons[buttons.length - 1];
          const pending = button?.disabled && button?.getAttribute('aria-busy') === 'true' && button?.textContent.includes('Sending');
          finish(true); await task;
          const released = !pendingDirectScoutTargets.has(target.id);
          let failedFeedbackReleased = true;
          if (typeof renderScoutRequestFeedback === 'function') {
            const render = renderCities;
            renderCities = () => { throw new Error('Synthetic presentation failure'); };
            try {
              const failedFeedback = scoutTarget(target);
              finish(true); await failedFeedback;
              failedFeedbackReleased = !pendingDirectScoutTargets.has(target.id);
            } finally { renderCities = render; }
          }
          return { pending, released, failedFeedbackReleased };
        } finally { launchAutomaticServerScout = originalLaunch; }
      })()`);
      if (!baselineRoot) assert(scout.pending && scout.released && scout.failedFeedbackReleased, "Scout request feedback or cleanup failed.");

      const shop = await evaluate(`(() => {
        const interval = window.setInterval;
        const getRemaining = getRewardedAdCooldownRemainingMs;
        let tick;
        window.setInterval = callback => { tick = callback; return 0; };
        getRewardedAdCooldownRemainingMs = () => 120000;
        try {
          showShopModal();
          const card = modalBody.querySelector('.shop-items');
          const button = modalBody.querySelector('[data-shop-select]');
          button?.focus();
          const start = performance.now();
          for (let index = 0; index < 30; index++) tick();
          return { thirtyTicksMs: performance.now() - start, sameCards: card === modalBody.querySelector('.shop-items'), focusPreserved: !button || document.activeElement === button };
        } finally { window.setInterval = interval; getRewardedAdCooldownRemainingMs = getRemaining; }
      })()`);
      if (!baselineRoot) assert(shop.sameCards && shop.focusPreserved, "Cooldown ticks replaced Shop controls.");
      await evaluate("window.__CROWNLANDS_BENCHMARK__.closeModal()");
      const switching = await evaluate(`(async () => {
        const original = publishOnlinePresence;
        const pending = [];
        publishOnlinePresence = (...args) => {
          const request = new Promise(resolve => setTimeout(resolve, 2000)).then(() => original(...args));
          pending.push(request); return request;
        };
        try { return await __CROWNLANDS_BENCHMARK__.switchNeighborAndReturn(); }
        finally { await Promise.allSettled(pending); publishOnlinePresence = original; }
      })()`);
      assert(switching.neighborResult && switching.returnResult, "Map switch failed.");
      assert.equal(switching.after.duplicates.length, 0, "Map switch duplicated listeners.");
      const connection = baselineRoot ? null : await verifyConnectionRecovery(client,evaluate);

      await client.send("Page.navigate", { url: `${address.url}/docs/visual-qa/chat/index.html` });
      for (let i = 0; i < 80 && !await evaluate("Boolean(window.CrownlandsChatVisualQa)"); i += 1) await wait(100);
      const chat = await evaluate(`(() => {
        CrownlandsChatVisualQa.controller.dispose({resetSession:true});
        const handlers = {};
        const controller = CrownlandsChatVisualQa.controller;
        const now = Date.now();
        controller.start({uid:'qa',clanId:'qa-clan',api:{getServerNowMs:()=>now,
          subscribeChatMessages:(options,callbacks)=>{handlers[options.channel]=callbacks;return()=>{};}}});
        const message = index => ({id:'message-'+index,channel:'global',senderUid:'qa',senderDisplayName:'Tester',text:'Message '+index,createdAtMs:now+index,status:'visible'});
        handlers.global.onMessages(Array.from({length:80},(_,i)=>message(i)),{initial:true});
        controller.setMode('full');
        const list = document.getElementById('chatMessageList');
        const first = list.firstElementChild;
        const sender = first.querySelector('button'); sender.focus(); list.scrollTop=0;
        const observer = new MutationObserver(()=>{}); observer.observe(list,{childList:true});
        const start = performance.now();
        for(let i=80;i<180;i++) handlers.global.onMessages([message(i)],{});
        const updatesMs = performance.now()-start;
        const mutations = observer.takeRecords(); observer.disconnect();
        const sameFirst = first === list.firstElementChild;
        const focusPreserved = document.activeElement === sender;
        const actualCount = list.children.length;
        handlers.global.onMessages([{...message(0),text:'Edited'}],{});
        const edited = list.firstElementChild.textContent.includes('Edited');
        handlers.global.onMessages([], {changes:[{type:'removed',message:message(1)}]});
        const removed = !list.querySelector('[data-message-id="message-1"]');
        controller.setMode('closed');
        const quick = document.getElementById('quickChatMessages');
        const hiddenObserver = new MutationObserver(()=>{}); hiddenObserver.observe(quick,{childList:true});
        handlers.global.onMessages([message(180)],{});
        const hiddenMutations = hiddenObserver.takeRecords().length; hiddenObserver.disconnect();
        controller.setMode('full');
        const reopened = list.lastElementChild.dataset.messageId === 'message-180';
        return {updatesMs, added:mutations.reduce((n,r)=>n+r.addedNodes.length,0),removedNodes:mutations.reduce((n,r)=>n+r.removedNodes.length,0),sameFirst,focusPreserved,actualCount,edited,removed,hiddenMutations,reopened};
      })()`);
      assert.equal(chat.actualCount, 180);
      assert(chat.edited && chat.removed && chat.reopened);
      if (!baselineRoot) {
        assert(chat.sameFirst && chat.focusPreserved, "Chat updates replaced unchanged rows or focus.");
        assert.equal(chat.added, 100); assert.equal(chat.removedNodes, 0); assert.equal(chat.hiddenMutations, 0);
      }
      await wait(250);
      if (!baselineRoot) assert.equal(await evaluate("CrownlandsChatVisualQa.controller.diagnostics().mode"), "full", "A queued native close event collapsed reopened chat.");
      assert.equal(await evaluate("document.getElementById('chatDialog').open"), true);
      const shot = await client.send("Page.captureScreenshot", {format:"png"});
      fs.writeFileSync(path.join(artifacts, `chat-${baselineRoot?'before':'after'}-${viewport.name}.png`), Buffer.from(shot.data,"base64"));
      results.push({viewport:viewport.name,startup,pinch,scout,shop,chat,connection,mapSwitch:{outMs:switching.neighborLatencyMs,backMs:switching.returnLatencyMs}});
      console.log(JSON.stringify(results[results.length-1]));
    }
    fs.writeFileSync(path.join(artifacts, `${baselineRoot?'before':'after'}-interactions.json`), JSON.stringify(results,null,2)+'\n');
  } finally {
    if(client) await client.send("Browser.close").catch(()=>{});
    if(session) { await waitForProcessExit(session.browserProcess); await removeBrowserProfile(session.profilePath); }
    await server.close();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
