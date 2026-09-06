(function () {
  window.CROWNLANDS_PATCH_NOTES = Object.freeze({
    buildId: "20260906-onboarding-controls-v2",
    generatedAt: "2026-09-06T15:00:00.000Z",
    releases: Object.freeze([
      Object.freeze({
        buildId: "20260906-onboarding-controls-v2",
        dateKey: "2026-09-06",
        publishedAt: "2026-09-06T15:00:00.000Z",
        notes: Object.freeze([
          "New rulers receive short tips for editing their name and flag, upgrading a city, scouting, and planning a city attack. Camp attacks are excluded from beginner guidance.",
          "Arrows point to the controls for each step, including the Profile portrait, name and flag editors, and city actions. Dismiss tips anytime or replay them from Profile, Settings, First steps & help.",
        ]),
      }),
      Object.freeze({
        buildId: "20260905-server-connection-reliability-v1",
        dateKey: "2026-09-05",
        publishedAt: "2026-09-05T12:00:00.000Z",
        notes: Object.freeze([
          "Travel previews keep working while the troop panel updates and avoid holding up simultaneous city or resource updates.",
          "Scouts and troop orders retain their confirmation when a connection drops, so retrying the same order can recover its result without sending it twice.",
          "Returning to the game retries interrupted report and city refreshes and recovers completed order confirmations independently.",
          "Pinch zoom responds in one visual update, and your remaining finger can continue dragging when you finish a pinch.",
          "Scouting immediately shows when an order is being sent. Chat updates and Shop countdowns preserve existing controls and focus.",
          "Independent loading steps run together, and slow presence updates no longer hold map switching or fresh foreground resource updates.",
          "Automatic animation quality adapts to sustained slow frames while respecting your selected motion settings.",
          "Attack and movement dialogs now show a compact total travel bonus and travel time, with the same routes and speed rules.",
          "Multiple completed scouts deliver reports independently with less settlement delay, while preserving scouting travel, costs, and report duration.",
          "Deed Camps choose uniformly from eligible cities across every active map in your realm. An earned reward waits safely if no eligible city is available.",
          "Global chat messages disappear individually after 24 hours. Clan chat history stays until explicitly deleted.",
        ]),
      }),
      Object.freeze({
        buildId: "20260808-soldier-defense-v1",
        dateKey: "2026-08-08",
        publishedAt: "2026-08-08T12:00:00.000Z",
        notes: Object.freeze([
          "Defending soldiers now use a universal 1.30 base power instead of gaining troop defense from city level.",
          "The new Shieldwall Discipline skill adds 2% soldier defense per level, up to 60%, while Stoneworks remains exclusive to walls.",
          "Defense Stronghold and Crown Citadel support now strengthens soldiers only and never increases wall power.",
          "Existing rulers receive one permanent free skill reset for the new defense build; new rulers begin without the legacy credit.",
          "Scouting, forecasts, battle reports, the Economy editor, and the Battle & Economy Guide now separate soldier, Shieldwall, objective, wall, and Stoneworks power.",
          "Armies already marching keep their original defense forecast, while new city and objective attacks use the Version 1 soldier-defense model.",
        ]),
      }),
      Object.freeze({
        buildId: "20260807-login-resilience-v1",
        dateKey: "2026-08-07",
        publishedAt: "2026-08-07T18:15:00.000Z",
        notes: Object.freeze([
          "Google login now recovers when a browser hides or blocks the sign-in window, with a visible option to continue securely in the current tab.",
          "Redirected Google sessions are now completed explicitly after returning to Crownlands, and login errors explain the recovery needed instead of leaving the button disabled.",
        ]),
      }),
      Object.freeze({
        buildId: "20260805-linear-walls-v1",
        dateKey: "2026-08-05",
        publishedAt: "2026-08-05T12:00:00.000Z",
        notes: Object.freeze([
          "Base troop attack power is now 1.25, with maximum Swordmastery raising it to 2 power per troop.",
          "City walls now rise in a steady straight line at every level, reaching about 5 million power at Level 100 with maximum Stoneworks.",
          "City and objective battles now resolve through one physical wall before remaining attack power reaches the garrison.",
          "Wall strength now follows one smooth formula at every level, while repairs take 15 minutes plus 0.3 minutes per city level with no gameplay cap.",
          "Damaged-wall timers now follow the city through captures and ownership changes instead of resetting for the new owner.",
          "Forecasts, scout reports, and battle reports now explain wall absorption, garrison power, and why a holding was or was not captured.",
          "Attack forecasts now reserve Overwhelming for at least three times the resolved defense and show projected losses, capture thresholds, shortfalls, and meaningful wall-damage requirements.",
          "Daily login rewards now follow the UTC calendar month, with equal total value in 28-, 29-, 30-, and 31-day months and up to two earned rewards waiting for collection.",
          "A season economy audit now protects the intended Level 150 siege and 30-city production benchmarks whenever economy values change.",
          "A new public Battle & Economy Guide explains city growth, production, skills, siege phases, capture thresholds, wall repairs, and special combat rules with interactive calculators.",
        ]),
      }),
      Object.freeze({
        buildId: "20260804-combat-forecast-v1",
        dateKey: "2026-08-04",
        publishedAt: "2026-08-04T12:00:00.000Z",
        notes: Object.freeze([
          "Attack forecasts now use the full scouted defense total, including walls, bonuses, and allied reinforcement packages.",
          "Forecasts distinguish captures, wall breaches, protected raids, and defeats, and battle reports explain changes between launch and arrival.",
          "Army attack power is locked at launch while defending troops, reinforcements, bonuses, and ownership remain live until arrival.",
        ]),
      }),
      Object.freeze({
        buildId: "20260801-patch-notes-menu-v1",
        dateKey: "2026-08-01",
        publishedAt: "2026-08-01T12:00:00.000Z",
        notes: Object.freeze([
          "Patch notes are now available from the main menu.",
          "Updates released on the same UTC day are consolidated into one post.",
        ]),
      }),
    ]),
  });
})();
