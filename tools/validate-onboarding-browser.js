"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { CdpClient } = require("./map-benchmark/cdp-client");
const { createMapBenchmarkServer } = require("./map-benchmark/server");
const { startBrowserSession, waitForProcessExit, removeBrowserProfile } = require("./validate-focused-browser-smoke");
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const artifacts = path.resolve(__dirname, "../release-artifacts/onboarding");
async function main() {
  const browser = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].find(file => file && fs.existsSync(file));
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
    const evaluate = async expression => {
      const result = await client.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    const screenshot = async name => {
      const shot = await client.send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(artifacts, name + ".png"), Buffer.from(shot.data, "base64"));
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
      assert.match(await evaluate("document.getElementById('onboardingMapTip').textContent"), /first city upgrade/);
      const stable = await evaluate(`(() => { const h=document.getElementById('onboardingMapTip'); const first=h.firstElementChild; const b=first.querySelector('button');b.focus(); for(let i=0;i<5;i++)renderOnboardingMapTip();return first===h.firstElementChild && document.activeElement===b; })()`);
      assert(stable, "Unchanged HUD updates replaced guidance or keyboard focus.");
      await screenshot(`upgrade-map-${viewport.name}`);
      await evaluate("showCityInfoModal(onboardingQaSource.id)");
      assert.match(await evaluate("modalBody.querySelector('.onboarding-tip').textContent"), /Use \+1 below/);
      await screenshot(`upgrade-info-${viewport.name}`);
      await evaluate("modalBody.querySelector('[data-onboarding-dismiss]').click()");
      assert.equal(await evaluate("modalBody.querySelector('.onboarding-tip') === null"), true);
      await evaluate("modal.close();selectCity(onboardingQaTarget.id)");
      assert.match(await evaluate("document.getElementById('onboardingMapTip').textContent"), /One troop/);
      await evaluate("pendingDirectScoutTargets.add(onboardingQaTarget.id);renderOnboardingMapTip()");
      assert.match(await evaluate("document.getElementById('onboardingMapTip').textContent"), /on its way/);
      await evaluate("pendingDirectScoutTargets.delete(onboardingQaTarget.id);renderOnboardingMapTip()");
      await screenshot(`scout-map-${viewport.name}`);
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
      await evaluate(`(() => {
        modal.close();
        const camp=[...WORLD_CAMPS_BY_ID.values()].find(c=>getCampTargetById(c.id)?.owner==='neutral');
        if(!camp)throw Error('Fixture has no configured camp');
        window.onboardingQaCamp=camp;
        showRewardCampInfoModal(camp.id);
      })()`);
      assert.match(await evaluate("modalBody.querySelector('.onboarding-tip').textContent"), /Capture starts a/);
      await screenshot(`camp-${viewport.name}`);
      await evaluate(`onlineCampStates.set(onboardingQaCamp.id,{holderUid:getCurrentOnlineUid(),payoutPending:true,currentGarrison:100});renderOnboardingMapTip()`);
      assert.match(await evaluate("modalBody.querySelector('.onboarding-tip').textContent"), /You hold this camp/);
      await evaluate("showRewardCampInfoModal(onboardingQaCamp.id)");
      await screenshot(`camp-held-${viewport.name}`);
      await evaluate(`onlineCampStates.set(onboardingQaCamp.id,{holderUid:'another-ruler',payoutPending:true,currentGarrison:100});renderOnboardingMapTip()`);
      assert.match(await evaluate("modalBody.querySelector('.onboarding-tip').textContent"), /Capture starts a/, "Camp guidance remained stale after ownership changed.");
      await evaluate("modalBody.querySelector('[data-onboarding-hide]').click();modal.close();showProfileSettings();document.getElementById('helpBtn').click()");
      assert.equal(await evaluate("modalTitle.textContent"), "First steps & help");
      await evaluate("modalBody.querySelector('[data-onboarding-enable]').click()");
      assert.equal(await evaluate("getOnboardingPreferences().enabled && getOnboardingPreferences().dismissed.length===0 && !modal.open"), true);
      results.push({ viewport: viewport.name, stableFocus: stable, layout, firstSteps: ["upgrade", "scout", "attack", "camp"], dismissalAndReplay: true });
      console.log(JSON.stringify(results.at(-1)));
    }
    fs.writeFileSync(path.join(artifacts, "browser-validation.json"), JSON.stringify(results, null, 2));
  } finally {
    if (client) await client.send("Browser.close").catch(() => {});
    if (session) { await waitForProcessExit(session.browserProcess); await removeBrowserProfile(session.profilePath); }
    await server.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
