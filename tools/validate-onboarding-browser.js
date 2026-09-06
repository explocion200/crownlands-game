"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { CdpClient } = require("./map-benchmark/cdp-client");
const { createMapBenchmarkServer } = require("./map-benchmark/server");
const { startBrowserSession, waitForProcessExit, removeBrowserProfile } = require("./validate-focused-browser-smoke");
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const artifacts = path.resolve(__dirname, "../release-artifacts/onboarding-controls");
async function main() {
  const browser = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].find(file => file && fs.existsSync(file));
  assert(browser, "Set CHROME_PATH to a Chromium browser.");
  fs.mkdirSync(artifacts, { recursive: true });
  const server = createMapBenchmarkServer();
  const address = await server.listen();
  let session, client;
  const results = [];
  const errors = [];
  try {
    session = await startBrowserSession(browser);
    client = await CdpClient.connect(session.targets.find(target => target.type === "page").webSocketDebuggerUrl);
    await Promise.all([client.send("Page.enable"), client.send("Runtime.enable")]);
    client.on("Runtime.exceptionThrown", event => errors.push(event.exceptionDetails?.exception?.description || event.exceptionDetails?.text));
    const evaluate = async expression => {
      const result = await client.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    const screenshot = async name => {
      const shot = await client.send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(artifacts, name + ".png"), Buffer.from(shot.data, "base64"));
    };
    const arrowAt = async selector => {
      await wait(450);
      const result = await evaluate(`(() => {
        const arrow=document.getElementById('onboardingArrow'), control=document.querySelector(${JSON.stringify(selector)});
        if(!arrow || getComputedStyle(arrow).display==='none' || !control) return { visible:false, control:arrow?.dataset.control };
        const tip=(modal.open ? modalBody : profileScreen.classList.contains('open') ? document.getElementById('onboardingProfileTip') : document.getElementById('onboardingMapTip')).querySelector('.onboarding-tip');
        const chosen=getOnboardingControl(tip), r=control.getBoundingClientRect(), a=arrow.getBoundingClientRect();
        const nums=arrow.querySelector('path').getAttribute('d').match(/-?[0-9.]+/g).map(Number);
        const endpoint={x:a.x+nums[4]*a.width/arrow.clientWidth,y:a.y+nums[5]*a.height/arrow.clientHeight};
        return { visible:true, correct:chosen===control, clickThrough:control.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)), distance:Math.min(Math.abs(endpoint.y-r.top),Math.abs(endpoint.y-r.bottom)), aligned:Math.abs(endpoint.x-r.x-r.width/2)<2, topLayer:!modal.open||arrow.parentElement===modal };
      })()`);
      assert(result.visible && result.correct && result.clickThrough && result.distance<=7 && result.aligned && result.topLayer, `${selector}: ${JSON.stringify(result)}`);
    };
    for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "landscape", width: 844, height: 390 }]) {
      await client.send("Emulation.setDeviceMetricsOverride", { ...viewport, deviceScaleFactor: 1, mobile: false });
      await client.send("Page.navigate", { url: `${address.url}/__benchmark__/?scenario=A&visualMarches=0` });
      for (let i = 0; i < 480 && !await evaluate("window.__CROWNLANDS_BENCHMARK__?.getStatus().status === 'ready'"); i++) await wait(250);
      assert.equal(await evaluate("window.__CROWNLANDS_BENCHMARK__?.getStatus().status"), "ready");
      await evaluate(`(() => {
        window.__CROWNLANDS_BENCHMARK__.closeModal();
        enableOnboardingGuidance();
        window.onboardingQaSource = state.cities.find(c => c.owner === 'player' && !isStronghold(c) && c.troops > 0);
        window.onboardingQaTarget = state.cities.find(c => c.owner === 'neutral' && !isStronghold(c) && !c.isMainCity && getCityRegionId(c) === getCityRegionId(onboardingQaSource));
        selectCity(onboardingQaSource.id);
      })()`);
      await wait(350);
      await evaluate("toast.classList.remove('visible')");
      await arrowAt('#profileBtn');
      await screenshot(`identity-map-${viewport.name}`);
      await evaluate("profileBtn.click()");
      await arrowAt('#profileNameEditBtn');
      await client.send('Emulation.setDeviceMetricsOverride', { width:viewport.width-40,height:viewport.height,deviceScaleFactor:1,mobile:false });
      await arrowAt('#profileNameEditBtn');
      await client.send('Emulation.setDeviceMetricsOverride', { width:viewport.width,height:viewport.height,deviceScaleFactor:1,mobile:false });
      await arrowAt('#profileNameEditBtn');
      await evaluate("window.dispatchEvent(new StorageEvent('storage',{key:'crownlands-first-steps-v1:'+getOnlineRequestScope()}))");
      await arrowAt('#profileNameEditBtn');
      await screenshot(`name-profile-${viewport.name}`);
      await evaluate("profileNameEditBtn.click()");
      await arrowAt('#profileNameInput');
      await evaluate("profileNameInput.value='Guided Ruler';profileNameInput.dispatchEvent(new Event('input',{bubbles:true}))");
      await arrowAt('#profileNameSaveBtn');
      assert.notEqual(await evaluate("state.playerName"), 'Guided Ruler', 'Guidance must not save the name automatically.');
      await screenshot(`name-save-${viewport.name}`);
      await evaluate(`(async () => {
        const identity=syncPlayerIdentityToAllOwnedCities, save=flushOnlineSave;
        syncPlayerIdentityToAllOwnedCities=async()=>true;flushOnlineSave=async()=>true;
        try {await saveProfileName();} finally {syncPlayerIdentityToAllOwnedCities=identity;flushOnlineSave=save;}
        if(state.playerName!=='Guided Ruler' || !profileNameEditor.hidden)throw Error('Explicit name save failed');
        profileNameEditBtn.click();profileNameInput.value='Discarded name';profileNameCancelBtn.click();
        if(state.playerName!=='Guided Ruler')throw Error('Cancelling name edit changed the saved name');
        document.querySelector('#onboardingProfileTip [data-onboarding-dismiss]').click();
      })()`);
      await arrowAt('#profileFlagBtn');
      await evaluate("profileFlagBtn.click()");
      await arrowAt('#flagPrimaryColors button:not(.active)');
      await evaluate("document.querySelector('[data-flag-editor-tab=pattern]').click()");
      await arrowAt('#flagPatternOptions button:not(.active)');
      await evaluate("document.querySelector('[data-flag-editor-tab=symbol]').click()");
      await arrowAt('#flagSymbolOptions button:not(.active)');
      await evaluate("document.querySelector('[data-flag-editor-tab=colors]').click()");
      await arrowAt('#flagPrimaryColors button:not(.active)');
      await screenshot(`flag-colors-${viewport.name}`);
      await evaluate("window.onboardingSavedFlag=JSON.stringify(state.flag);document.querySelector('#flagPrimaryColors button:not(.active)').click()");
      await arrowAt('#flagSaveBtn');
      assert.equal(await evaluate("JSON.stringify(state.flag)===onboardingSavedFlag"), true, 'Guidance saved a draft without player confirmation.');
      await screenshot(`flag-save-${viewport.name}`);
      await evaluate("flagSaveInFlight=true;renderFlagEditor();updateOnboardingPointer()");
      assert.equal(await evaluate("getComputedStyle(document.getElementById('onboardingArrow')).display"), 'none');
      await evaluate("flagSaveInFlight=false;flagEditorSaveStatus.textContent='Save failed — retry';renderFlagEditor()");
      await arrowAt('#flagSaveBtn');
      assert.equal(await evaluate("getOnboardingPrefs().dismissed.includes('flag')"), false, 'A failed save dismissed flag guidance.');
      await evaluate(`(async () => {
        const original=getOnlineApi;
        let fail=true; window.onboardingSaveCalls=0;
        const save=async()=>{onboardingSaveCalls++;if(fail)throw Error('Controlled flag save failure');return {};};
        getOnlineApi=()=>({isSignedIn:()=>true,savePlayerProfile:save,syncPlayerIdentity:save,saveGameSnapshot:save,savePresence:save});
        try {
          await saveFlagEditor();
          if(JSON.stringify(state.flag)!==onboardingSavedFlag || !isFlagEditorDirty())throw Error('Failed save lost the draft or committed a flag');
          fail=false;await saveFlagEditor();
          if(JSON.stringify(state.flag)===onboardingSavedFlag || isFlagEditorDirty())throw Error('Explicit retry did not save the flag');
        } finally {getOnlineApi=original;}
        document.querySelector('#flagPrimaryColors button:not(.active)').click();
        toast.classList.remove('visible');
      })()`);
      assert.equal(await evaluate("onboardingSaveCalls"), 8);
      await evaluate("document.querySelector('#onboardingProfileTip [data-onboarding-dismiss]').click();profileCloseBtn.click()");
      assert.equal(await evaluate("flagDiscardDialog.open"), true, 'Guidance bypassed unsaved-flag protection.');
      await evaluate("document.getElementById('flagDiscardChangesBtn').click();selectCity(onboardingQaSource.id);toast.classList.remove('visible')");
      assert.match(await evaluate("document.getElementById('onboardingMapTip').textContent"), /first city upgrade/);
      const stable = await evaluate(`(() => { const h=document.getElementById('onboardingMapTip'); const first=h.firstElementChild; const b=first.querySelector('button');b.focus(); for(let i=0;i<5;i++)renderOnboardingMapTip();return first===h.firstElementChild && document.activeElement===b; })()`);
      assert(stable, "Unchanged HUD updates replaced guidance or keyboard focus.");
      await arrowAt('.city-action-wheel .wheel-level');
      await screenshot(`upgrade-map-${viewport.name}`);
      await evaluate("camera.x+=12;applyCameraTransform()");
      await arrowAt('.city-action-wheel .wheel-level');
      await evaluate("showCityInfoModal(onboardingQaSource.id)");
      assert.match(await evaluate("modalBody.querySelector('.onboarding-tip').textContent"), /Use \+1 below/);
      await screenshot(`upgrade-info-${viewport.name}`);
      await evaluate(`modalBody.querySelector('[data-city-upgrade-mode="exact"][data-city-upgrade-levels="1"]').scrollIntoView({block:'center'})`);
      await arrowAt('[data-city-upgrade-mode="exact"][data-city-upgrade-levels="1"]');
      await screenshot(`upgrade-button-${viewport.name}`);
      await evaluate("modalBody.scrollTop=0;updateOnboardingPointer()");
      await evaluate("modalBody.querySelector('[data-onboarding-dismiss]').click()");
      assert.equal(await evaluate("modalBody.querySelector('.onboarding-tip') === null"), true);
      await evaluate("modal.close();selectCity(onboardingQaTarget.id)");
      assert.match(await evaluate("document.getElementById('onboardingMapTip').textContent"), /One troop/);
      await evaluate("pendingDirectScoutTargets.add(onboardingQaTarget.id);renderOnboardingMapTip()");
      assert.match(await evaluate("document.getElementById('onboardingMapTip').textContent"), /on its way/);
      await evaluate("pendingDirectScoutTargets.delete(onboardingQaTarget.id);renderOnboardingMapTip()");
      await screenshot(`scout-map-${viewport.name}`);
      await arrowAt('.city-action-wheel .wheel-scout');
      await evaluate("document.querySelector('.wheel-scout').disabled=true;updateOnboardingPointer()");
      assert.equal(await evaluate("getComputedStyle(document.getElementById('onboardingArrow')).display"), 'none', 'A disabled action retained an arrow.');
      await evaluate("document.querySelector('.wheel-scout').disabled=false");
      await evaluate("state.scoutReports[onboardingQaTarget.id]=createScoutReportSnapshot(onboardingQaTarget);renderOnboardingMapTip()");
      assert.match(await evaluate("document.getElementById('onboardingMapTip').textContent"), /report is ready/);
      await evaluate("showScoutReportModal(onboardingQaTarget.id)");
      assert.match(await evaluate("modalBody.querySelector('.onboarding-tip').textContent"), /Intelligence lasts 10 minutes/);
      await screenshot(`scout-report-${viewport.name}`);
      await evaluate("modalBody.querySelector('[data-onboarding-dismiss]').click();modal.close()");
      await evaluate(`(() => {
        supportsAuthoritativeArmyRoutes=()=>true;
        requestAuthoritativeOrderRoute=async (source,target,kind,troops)=>({...createInstantOrderRoute(source,target),previewStatus:'authoritative',authoritativeDurationSeconds:30,authoritativeRequestedTroops:troops,authoritativeSpeedMultiplier:1});
        return showTroopSliderModalAsync(onboardingQaSource,onboardingQaTarget);
      })()`);
      await wait(500);
      assert.match(await evaluate("modalBody.querySelector('.onboarding-tip').textContent"), /slider.*Tap Attack to send/);
      const layout = await evaluate(`(() => {
        const tip=modalBody.querySelector('.onboarding-tip');
        const buttons=[...tip.querySelectorAll('button')];
        return { overflow: modalBody.scrollWidth>modalBody.clientWidth+2, touchTargets:buttons.every(b=>b.getBoundingClientRect().height>=44), sizes:buttons.map(b=>({height:b.getBoundingClientRect().height,minHeight:getComputedStyle(b).minHeight})), slider:Boolean(document.getElementById('troopAmountSlider')) };
      })()`);
      await screenshot(`attack-${viewport.name}`);
      assert(!layout.overflow && layout.touchTargets && layout.slider, JSON.stringify(layout));
      await arrowAt('#troopAmountSlider');
      await screenshot(`attack-controls-${viewport.name}`);
      await evaluate("modalBody.scrollTop=modalBody.scrollHeight");
      await wait(450);
      assert.equal(await evaluate("getComputedStyle(document.getElementById('onboardingArrow')).display!=='none'"), await evaluate("onboardingControlIsVisible(document.getElementById('troopAmountSlider'))"), 'Scroll left the arrow inconsistent with target visibility.');
      await evaluate(`(() => {
        modal.close();
        const camp=[...WORLD_CAMPS_BY_ID.values()].find(c=>getCampTargetById(c.id)?.owner==='neutral');
        if(!camp)throw Error('Fixture has no configured camp');
        window.onboardingQaCamp=camp;
        showRewardCampInfoModal(camp.id);
      })()`);
      assert.equal(await evaluate("modalBody.querySelector('.onboarding-tip')"), null);
      await screenshot(`camp-${viewport.name}`);
      await evaluate(`onlineCampStates.set(onboardingQaCamp.id,{holderUid:getCurrentOnlineUid(),payoutPending:true,currentGarrison:100});renderOnboardingMapTip()`);
      assert.equal(await evaluate("modalBody.querySelector('.onboarding-tip')"), null);
      await evaluate("showRewardCampInfoModal(onboardingQaCamp.id)");
      await screenshot(`camp-held-${viewport.name}`);
      await evaluate(`onlineCampStates.set(onboardingQaCamp.id,{holderUid:'another-ruler',payoutPending:true,currentGarrison:100});renderOnboardingMapTip()`);
      assert.equal(await evaluate("modalBody.querySelector('.onboarding-tip')"), null);
      await evaluate("modal.close();selectedTargetId=onboardingQaCamp.id;renderOnboardingMapTip()");
      assert.equal(await evaluate("document.getElementById('onboardingMapTip').hidden"), true);
      await evaluate("showTroopSliderModalAsync(onboardingQaSource,getCampTargetById(onboardingQaCamp.id))");
      assert.equal(await evaluate("modalBody.querySelector('.onboarding-tip')"), null, 'A Camp attack displayed a beginner tip.');
      await evaluate("modal.close()");
      await evaluate("saveOnboardingPrefs({enabled:false,dismissed:[]});renderOnboardingMapTip();showProfileSettings();document.getElementById('helpBtn').click()");
      assert.equal(await evaluate("modalTitle.textContent"), "First steps & help");
      assert.equal(await evaluate("modalBody.querySelectorAll('.onboarding-help-steps li').length"), 5);
      assert.doesNotMatch(await evaluate("modalBody.textContent"), /camp/i);
      await evaluate("modalBody.querySelector('[data-onboarding-enable]').click()");
      assert.equal(await evaluate("getOnboardingPrefs().enabled && getOnboardingPrefs().dismissed.length===0 && !modal.open"), true);
      await evaluate(`(() => {
        const uid=getCurrentOnlineUid;
        getCurrentOnlineUid=()=>'';
        try {
          renderOnboardingMapTip();updateOnboardingPointer();
          if(document.getElementById('onboardingArrow') || !document.getElementById('onboardingProfileTip').hidden)throw Error('Signed-out account retained a guide arrow');
        } finally {getCurrentOnlineUid=uid;}
      })()`);
      results.push({ viewport: viewport.name, stableFocus: stable, layout, firstSteps: ["name", "flag", "upgrade", "scout", "attack"], campExcluded: true, controlArrows: true, dismissalAndReplay: true });
      console.log(JSON.stringify(results.at(-1)));
    }
    assert.deepEqual(errors, [], 'Uncaught errors occurred during onboarding.');
    fs.writeFileSync(path.join(artifacts, "browser-validation.json"), JSON.stringify({ results, errors }, null, 2));
  } finally {
    if (client) await client.send("Browser.close").catch(() => {});
    if (session) { await waitForProcessExit(session.browserProcess); await removeBrowserProfile(session.profilePath); }
    await server.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
