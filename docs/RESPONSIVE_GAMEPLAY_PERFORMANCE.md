# Responsive gameplay performance review

## Scope

`codex/responsive-gameplay-performance` starts from main `61bc30a4d846f1779cfb81299e4887ccb8db5245` (PR #254). The user authorized all ten proposed performance areas, internal review, normal PR merge, and production deployment after checks. The current `core-expansion-v1` release contract is unchanged. This update changes client presentation and scheduling; it does not alter backend gameplay, world topology, costs, cooldowns, routes, permissions, or intended travel time.

## Findings and implementation

| Area | Confirmed finding and response |
| --- | --- |
| Touch and zoom | Pinch calculation scheduled a second animation frame for the camera. It now paints in the coalesced pinch frame. After a pinch, the remaining finger previously had no pan state; it now continues dragging from the current camera position. Tap tolerances, hit areas, pointer cancellation, and click suppression remain intact. |
| Action feedback | Direct scouting reserved its target internally but did not show pending feedback during the callable. City, Stronghold, and Camp scout controls now show Sending, remain disabled while pending, and recover on completion/failure. A presentation exception cannot strand this lock. Dialog/profile controls also acknowledge presses without moving their hit areas. Existing attack pending marches, batch scout feedback, atomic upgrade projection, and reward-claim feedback remain in use. |
| Map switching | Art and lazy region definitions can load together. Once verified city data is connected, presence delivery runs through its existing guarded background path without blocking map readiness. Loading text distinguishes connection and city-data stages. Existing previous-map recovery and bounded neighbor preloading remain intact. |
| Initial loading | Saved game/global-stat reads previously waited for skill synchronization. Independent reads now start together; the authoritative profile still waits for skill migration. The signed-out shell no longer fetches an unused default map before the player's map is known. Four unreachable functions belonging to the replaced command panel were removed after a repository-wide reference audit; the active troop dialog is unchanged. Existing asset-size budgets were retained. |
| Chat | Every incoming update recreated the displayed message rows and a hidden quick preview. The controller now reuses unchanged rows, changes only affected rows, shares its time formatter, preserves reading anchors/focus, and skips hidden or unchanged preview work. Native close events arriving after reopening no longer change the reopened mode. |
| Menus | The Shop rebuilt its item carousel every second during the ad cooldown, replacing focused controls. Countdown ticks now patch only availability text. Existing menu shells, independent report delivery, City List row reconciliation, inventory pagination, and immediate attack-panel hydration remain intact. |
| Slower devices | Automatic mode previously depended only on reduced-motion preference and was then converted into an explicit mode by the game UI. It now stays automatic when the player has no saved choice, reduces decorative effects after two sustained slow sampling windows, and recovers after five healthy windows. Hidden/startup gaps do not trigger degradation. Explicit settings still win. |
| Loading/retry feedback | Existing bounded retries and actionable failures are retained. Map-stage text and pending scout controls expose actual progress without fabricated percentages or premature success. |
| Foreground return | Fresh economy presentation previously waited for the entire refresh group, including presence. It now paints when authoritative economy is ready; independent refreshes still complete and report their own results. The final redundant full-map repaint is removed. Account/world/region checks prevent stale presentation. |
| Server confirmation | The previous release's two-worker scout settlement queue and receipt-based retry protection remain unchanged. Added bounded, local request-duration diagnostics (50 records, operation/duration/success only) to separate server-response time from UI work. Production logs show occasional slow route previews, but the available aggregate timings do not identify their cause. No new production server-latency improvement is claimed, and no speculative backend capacity, balance, or scheduler changes were made. |

## Controlled measurements

Measurements use the repository's loopback browser fixture and current game code, with no production player data or Firebase gameplay requests. Baseline uses main `61bc30a`; after uses this branch. Results vary by machine load. The synthetic burst reports cumulative synchronous work, not the latency of one real message. The deliberately delayed operations isolate dependency ordering; they are not estimates of normal network latency.

| Scenario, desktop / 844×390 landscape | Before | After, representative runs |
| --- | ---: | ---: |
| 100 individual chat updates, starting with 80 messages | 5,388 / 5,545 ms | 158 / 156 ms |
| Chat rows inserted / removed during that burst | 13,050 / 12,950 | 100 / 0 |
| 30 Shop cooldown ticks | 200 / 155 ms | 0.4 / 0.1 ms |
| Independent skill/saved-state phase, each given a 300 ms delay | 619 / 607 ms | 305 / 303 ms |
| Map switch with an injected 2,000 ms presence delay | about 2,930–3,150 ms | about 1,185–1,225 ms in settled runs; one disk-busy first switch was 1,977 ms |
| Pinch camera update | second scheduled frame | first scheduled frame |
| Existing chat rows and Shop focus | replaced | preserved |

These observations do not establish physical-device frame rates or authenticated production latency. The existing multi-scout improvement from PR #254 remains the measured server-settlement baseline; intended scouting travel remains separate and unchanged.

A read-only production log query at 18:28 UTC succeeded after an earlier HTTP 429 quota rejection. It sampled the latest 1,000 matching operation entries within the preceding 24 hours and was truncated; it is not a census of that entire interval. Successful route previews (232 samples) had p50 173 ms, p95 5,069 ms, and maximum 15,840 ms; army orders (77 samples) had p50 803 ms and p95 1,922 ms. Army resolution (106 successful samples) had p50 849 ms and p95 3,698 ms, with two separate failures. These are handler execution times, excluding transport and display delay. The preview already reads its independent documents together within an authoritative transaction. The sampled tail does not distinguish route computation, data access, contention, or infrastructure delay, and no production mutation was performed to investigate it.

## Regression coverage and review

- `tools/validate-responsive-browser.js`: desktop, landscape, and a 4× CPU landscape diagnostic; startup read ordering, first-frame pinch, remaining-finger drag, immediate scout pending state and presentation failure cleanup, stable Shop focus, delayed presence/map switching without duplicate listeners, 100 independent chat updates, edit/delete/reopen behavior, hidden previews, and screenshots. `--baseline-root=<checkout>` runs the same measurements against an unmodified checkout.
- `tools/validate-responsive-runtime.js`: bounded diagnostics, preservation of results/errors and authority payloads, no payload/identity/result retention, immutable diagnostic copies, and unchanged authoritative clock sampling.
- Extended animation checks: sustained slowdown, recovery hysteresis, explicit Full preference, system reduced motion, and background-gap rejection.
- Extended foreground checks: a stalled presence request cannot delay fresh economy painting or cause a duplicate full-map repaint. Existing tests cover heartbeat timeouts, retries, welcome-back ordering, and realtime recovery.
- Existing chat retention, report delivery, route parity, map input, login, asset budget, desktop/landscape smoke, and multiplayer emulator gates protect integration with the previous release.

Internal review checked the complete branch diff for authority/balance changes, unrelated removals, stale callbacks, locks, UI focus, expiry/access behavior, cancellation, adaptive-mode oscillation, and startup dependency ordering. Review found and corrected the scouting presentation-exception lock risk and the queued chat-close race. Removed command-panel functions have no remaining runtime, HTML, or validator references. No asset or dependency versions were upgraded and no existing performance budget was raised.

## Release procedure and limits

The branch must pass the repository's complete `prepare-pr` flow, production build, and required GitHub checks (`Static validation`, `Multiplayer emulator validation`, `Validate`) against current main. Normal merge is followed by the established Netlify Git deployment and safe public desktop/landscape smoke checks at `https://playcrownlands.com/play/`, including the merged commit in release metadata and loaded scripts. This release requires no Functions, rules, indexes, cleanup migration, or production data changes. The backend contract remains compatible with the deployed PR #254 backend.

The final PR and release handoff record actual gate, merge, deployment, and live-smoke outcomes. Physical mobile hardware and authenticated production mutation timings require a controlled QA session; emulator/browser results must not be presented as that evidence.
