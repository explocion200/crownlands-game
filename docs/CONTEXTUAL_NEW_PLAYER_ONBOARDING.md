# Contextual new-player onboarding

This client presentation update adds optional guidance for the first city upgrade, scout, attack, and Camp capture. It uses the current monthly realm and existing runtime configuration without altering world data, gameplay authority, costs, balance, or permissions.

## Player experience

- A newly confirmed starting-city claim enables the tips. Replayed claims preserve an existing dismissal. Existing players can enable or replay tips through **Profile → Settings → First steps & help**.
- A compact map card follows the selected holding. The corresponding city Info, scout report, attack confirmation, or Camp Info panel explains the action alongside its existing controls.
- Upgrades show the current projected next-level cost and explain production. Low Gold and incoming-attack conditions use existing checks. Scouting explains the one-troop march, waiting for arrival, Reports, the configured intelligence lifetime, and the limits of a snapshot. Attacks explain choosing troops, reviewing the forecast and travel time, confirming, and reading the arrival result.
- Camp copy uses the selected Camp's configured hold duration and directs the ruler to its reward allowance. It distinguishes capture from earning a reward, explains contested ownership, and updates if control changes while the panel is open. It does not reveal hidden defender state or direct a new ruler to launch an underpowered army.
- **Got it** dismisses the topic; it is an acknowledgement of guidance, not a gameplay completion claim. **Hide tips** turns off all tips. Neither submits a gameplay action, pauses the realm, nor changes eligibility. Dismissals are local UI preferences keyed by account, world, reset generation, and shard. They survive reloads where browser storage is available; unavailable storage falls back to the current session. Other open tabs receive storage preference updates.
- The existing parchment palette and font are preserved. Map guidance sits clear of the bottom navigation and hides behind dialogs, Profile, setup, and transient toasts. Dialogs retain their existing scrolling and action controls. Stable HUD updates retain the guide DOM and keyboard focus.

The formerly disconnected Help entry is now available in Settings. Its long prototype-era instructions are replaced by a short four-action overview that matches the current confirmation flow.

## Validation and release

`tools/validate-onboarding-guidance.js` covers first-claim opt-in, dismissal and replay, reload, account/realm isolation, signed-out behavior, restricted browser storage, configured costs/timers, and context-specific copy. `tools/validate-onboarding-browser.js` exercises actual game panels against isolated local services at desktop 1440×900 and landscape 844×390: all four topics, stable DOM/focus, pending scouts, attack controls, ownership changes, dismissal, and replay through Settings. It checks horizontal overflow and settled 44-pixel dismissal targets. The existing dialog entrance animation is allowed to settle before measuring touch bounds.

Both checks are part of the static release gate. The complete repository gate, production build, required GitHub checks, and combined diff review must pass before merge. This is a client-only release: no Functions source, Firestore rules, indexes, world migration, cleanup job, or production-data change is required. Netlify publishes the merged web commit through the established Git deployment. Release-channel proof belongs in the release handoff; these implementation requirements alone do not establish live status.

Physical phone testing remains excluded at the user's request. Browser tests use isolated fixtures; production smoke tests remain signed out and do not consume real-player resources. Preferences do not synchronize across different browsers or devices.
