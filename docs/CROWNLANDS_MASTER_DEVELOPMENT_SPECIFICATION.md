# Crownlands Master Development Specification

**Version:** 1.35
**Effective date:** September 5, 2026
**Document status:** Authoritative baseline with implementation and release verification
**Evidence reviewed through:** September 5, 2026

> [!IMPORTANT]
> This specification is the authority for intended Crownlands behavior and confirmed design decisions. The current Git repository and backend are the authority for current technical implementation. A verified production build is the authority for what players can actually use in that release channel. These states must never be silently conflated.

This document records confirmed rules, verified deployment status, unresolved conflicts, and planned direction for Crownlands. An old conversation, prompt, roadmap entry, implementation report, commit, or pull request does not become an authoritative design rule merely because it exists.

---

# Part I — Document Control

## FM-1. Authority and Source Precedence

### Intended behavior and design authority

1. This Master Development Specification is the planning source of truth for confirmed Crownlands behavior.
2. A later decision supersedes an existing rule only when the decision is explicitly confirmed and the affected rule is updated here.
3. If a new decision conflicts with this specification, the conflict must be identified before the specification is changed.
4. Brainstorms, questions, mockups, old prompts, roadmap ideas, and unapproved implementation suggestions are not authoritative rules.
5. Important replaced decisions should remain in the superseded-decision record when the history prevents future confusion.

### Technical implementation authority

1. The current Crownlands Git repository and backend are authoritative for how the game is technically implemented.
2. Codex must inspect the current repository before modifying anything. Prompts must not invent filenames, functions, Firebase collections, APIs, deployment topology, or architecture.
3. A local checkout that is behind current `main` is historical evidence, not current implementation authority.
4. A compiled distribution artifact can prove what that artifact contains, but it does not replace inspection of current source code.

### Deployment authority

1. `https://playcrownlands.com` is the primary LIVE web authority. Its public pages and the canonical game application at `https://game.playcrownlands.com` are separately published surfaces and must both be checked when player-facing documentation is part of a release.
2. itch.io is a secondary published distribution channel and may temporarily lag web production.
3. A feature is not LIVE merely because it was implemented, committed, pushed, reviewed, or merged.
4. LIVE status requires a verified deployment to the named channel. When risk warrants it, production smoke-test evidence is also required.
5. A feature present on web but absent from the published itch.io build must be recorded as `LIVE — WEB`, not `LIVE — ALL PUBLISHED CHANNELS`.

### Evidence precedence

When sources disagree, use the following evidence order for the specific question being answered:

1. Explicit confirmed design decision recorded in this specification — intended behavior.
2. Current repository/backend inspection — technical implementation.
3. Verified release manifest and production smoke result — deployed behavior for that channel.
4. Current player-facing rules and guides — documented player-facing behavior.
5. Merged PR and completion report — implemented behavior, subject to deployment verification.
6. Open PR or development branch — work in progress or implemented but not live.
7. Roadmap entry — planned direction only.
8. Old conversations, prompts, prototypes, and brainstorms — historical or proposed material only.

## FM-2. Current Production Snapshot

Snapshot verified on August 31, 2026.

| Item | Verified state |
|---|---|
| Canonical game web production | Build `fdf326a9462fab2982cbdd2cf9c8326060217159` |
| Canonical game deployment time | August 31, 2026 at 00:05:05 UTC / August 30 at 8:05:05 PM EDT |
| Canonical game Netlify production deploy | `6a94c517ebd65700085b9ad3` |
| Primary-domain public site | Separately published surface; exact build and deployment ownership remain **NEEDS VERIFICATION**. Its Rally guide is current, but its beginner guide still exposes the superseded three-ruler Rally rules. |
| Web world | 20 connected regions |
| Web release ID | `crownlands-2026-09-monthly-sharded-realms-v1` |
| Web reset generation | `fresh-2026-07-26-server-reset` |
| Web world ID | `main-fresh-2026-07-26-server-reset` |
| Web API contract hash | `86fc7b17ba028d02ee0ef6131f291f6673d5fdef4178a3463e04cf220bc35dbd` |
| Web manifest server-source fingerprint | `d69fb16ed79924c1721d818c88e6fccb9b37094da557f068132410a8cc09aa81` |
| Web manifest client-source fingerprint | `2a20d12227d8d41b7879e34101ad2865d786f1226e993da2abe9173cd11c9ef2` |
| Web manifest callable count | 109 |
| Published itch.io client | Build `fdf326a9462fab2982cbdd2cf9c8326060217159` on public HTML5 upload `#19037216`; the older Butler `html5` channel remains attached to upload `#18590779` and reports user version `2026-08-30-city-list-off-map-ownership-3390c83c` |
| itch.io client date | August 31, 2026 at 00:15 UTC; public iframe and exact build extraction verified after publication |
| itch.io world | 20 connected regions |
| Authoritative repository commit inspected | `origin/main` at `fdf326a9462fab2982cbdd2cf9c8326060217159` |
| Remote `origin/main` verification | Local `main`, remote-tracking `origin/main`, and merged PR #220 build matched with `0 0` divergence during the August 30 release audit |
| New-player initialization in inspected source | 100 Gold, 200 troops, one Level 1 Main City |
| City XP and instant-upgrade release baseline | PR #199 merged as `a561374b93b5a31849ddddbb4cfbfabf9be1dc94` |
| Skill controls and free-refund web release baseline | PR #201 merged as `291e5657594bc8d0e3e91b6b25af79f4e88cf5e5` |
| Session heartbeat recovery release baseline | PR #220 merged as `fdf326a9462fab2982cbdd2cf9c8326060217159`; the client bounds heartbeat responses at 15 seconds and invalidates stopped lifecycle generations before applying late responses or clearing replacement locks |
| Current Cloud Functions deployment | 109 active Node.js 22 functions deployed from clean build `291e5657594bc8d0e3e91b6b25af79f4e88cf5e5`; source generations span 16:08:33–16:15:57 UTC on August 27, 2026; shared Firebase Functions hash `322ab24baed05968ce263db586c2a6cacccfc018` |
| Exact current Cloud Functions build ID | Deployment provenance, generated manifest, post-deploy 29-callable access audit, production rules parity check, and refreshed inventory verify build `291e5657...`; `adjustSkillLevels` is ACTIVE and the obsolete `enforceSkillPointSystemState` trigger is absent. Authenticated skill mutation and `getRealmInfo` remain manual smoke checks. |

The web and itch.io clients now use the same exact client build `fdf326a...`, release ID, reset generation, world ID, and API contract hash. The locally packaged itch.io ZIP contains 279 files, passed all 57 relative-resource checks, and has SHA-256 `973137A3CC90023AF9340AFFC2D8B40FBA7A93B8DCE97F9FD0F9D1E9892A2C2D`. The public iframe serves upload `19037216`; its index, release manifest, service worker, heartbeat generation guard, and stale-response guard returned HTTP 200 and matched build `fdf326a...`. The older Butler `html5` channel metadata still reports build `3390c83c...`, so the latest-build API is not authoritative for the current web-uploaded public iframe.

The August 24 through August 27 audits remain historical evidence. The August 30 release audit records current `origin/main`, web production, and the public itch.io iframe at build `fdf326a...`; the existing Firebase Functions deployment was not changed by this client-only release. Repository and public-asset facts are not proof that authenticated production state follows the same path. Login, interrupted-connection recovery, and second-tab replacement remain manual production smoke tests because no approved QA account was used. The primary-domain public site remains a separate publication surface and is not proven current by the game Netlify deployment.

### Current cross-channel release ledger

| Channel / artifact | Build and deployment time | Validation result | Known difference |
|---|---|---|---|
| Firebase Functions and Firestore release | Build `291e5657594bc8d0e3e91b6b25af79f4e88cf5e5`; deployed August 27, 2026 | 109 Node.js 22 functions ACTIVE with shared hash `322ab24b...`; generated manifest recorded contract `86fc7b17...` and server source `ea28d763...`; 29 callable-access checks and production rules parity passed; `adjustSkillLevels` is active and the obsolete skill-state trigger is absent | Firestore rules and configured indexes deployed without deleting eight additional production indexes. A transient Functions mutation quota required automatic and narrow retries; final inventory is consistent. Authenticated skill and city mutations remain manual smoke checks. |
| Current canonical game production | Build `fdf326a9462fab2982cbdd2cf9c8326060217159`; deploy `6a94c517ebd65700085b9ad3`; published August 31, 2026 at 00:05:05 UTC | PR #220 and the post-merge `main` run passed Static validation, all 33 multiplayer emulator files, and Validate; live manifest, index, service worker, game code, heartbeat generation counter, and stale-response guard passed direct HTTP checks on both canonical hostnames | Client-only heartbeat lifecycle release; no Functions, Firestore, schema, contract, or gameplay formula deployment was required. |
| Primary-domain public pages | Exact build and deployment ownership **NEEDS VERIFICATION** | `clans-rallies-guide.html` exposes the current 2–20-player rules, but `how-to-play.html` still says a Rally holds up to three rulers, can target Reward Camps, removes the shield, may launch with inbound contributions, and uses the leader's march bonuses | The corrected beginner-guide source is merged and present on the canonical game host, but is not deployed to this separate public-site surface. Do not treat the game Netlify deploy as proof that these pages were refreshed. |
| itch.io published client | Build `fdf326a9462fab2982cbdd2cf9c8326060217159`; public HTML5 upload `#19037216`; published August 31, 2026 at 00:15 UTC | Production artifact validation passed 279 files and 57 itch-relative resources; the public page points to `html-classic.itch.zone/html/19037216/`, whose manifest, index, service worker, heartbeat generation counter, and stale-response guard matched `fdf326a...` over HTTP | Authenticated itch.io gameplay was not exercised. The older Butler `html5` channel and latest-build API remain labeled `2026-08-30-city-list-off-map-ownership-3390c83c`, but they do not control the verified public iframe. Local ZIP SHA-256: `973137A3CC90023AF9340AFFC2D8B40FBA7A93B8DCE97F9FD0F9D1E9892A2C2D`. |

## FM-3. Release Channel Matrix

| Capability | Web production | itch.io published client | Specification status |
|---|---|---|---|
| Core cities, economy, armies, combat, objectives, clans, rallies, chat, missions, achievements, Shop, Bag, and Common Gear foundation | Present | Present | `LIVE — ALL PUBLISHED CHANNELS` |
| Ordinary Rally lifecycle correction: 2–20 participants, deterministic participant settlement, safe returns, and creator-departure recall | Present; primary-domain beginner guide remains stale | Present in exact build `fdf326a...` | `LIVE — ALL PUBLISHED CHANNELS` |
| Connected world size | 20 regions | 20 regions | `LIVE — ALL PUBLISHED CHANNELS` |
| Gear skill stacking and same-level upgrade availability | Present | Present | `LIVE — ALL PUBLISHED CHANNELS` |
| Gear Effects in battle reports | Present | Present | `LIVE — ALL PUBLISHED CHANNELS` |
| Inner Castle entry from Profile | Present | Present | `LIVE — ALL PUBLISHED CHANNELS` |
| Stronghold/Citadel contrast restoration | Present | Present | `LIVE — ALL PUBLISHED CHANNELS` |
| Scalable Shop pricing | Present | Present | `LIVE — ALL PUBLISHED CHANNELS` |
| Clan Heraldry v2 and live-editor fixes | Present | Present | `LIVE — ALL PUBLISHED CHANNELS` |
| Reworked Item Bag presentation | Present | Present | `LIVE — ALL PUBLISHED CHANNELS` |
| Identical Bag-item quantity stacking | Present | Present | `LIVE — ALL PUBLISHED CHANNELS` |
| Shop ad-layout and carousel-stability fix | Present | Present | `LIVE — ALL PUBLISHED CHANNELS` |
| Touch map-selection Shop/Bag guard | Present | Present | `LIVE — ALL PUBLISHED CHANNELS` |
| City XP model v2, uncapped 1% awards, ordered optimistic upgrades, and selected-city gold arrow action | Present | Present in exact build `fdf326a...` | `LIVE — ALL PUBLISHED CHANNELS`; authenticated mutation smoke remains pending |
| Unified `− | cost | +` skill controls, free live refunds, free Reset Skills, signed optimistic adjustments, and revised Skills readability | Present in build `fdf326a...` | Present in build `fdf326a...` | `LIVE — ALL PUBLISHED CHANNELS`; authenticated mutation smoke remains pending |
| Bounded session heartbeat responses and lifecycle-safe late-response recovery | Present in build `fdf326a...` | Present in build `fdf326a...` | `LIVE — ALL PUBLISHED CHANNELS`; public assets and 120-session emulator admission passed, while authenticated interrupted-connection smoke remains pending |
| Next-reset regular-city Gold production curve | Absent from the audited production build | Absent from the audited published build | `IN DEVELOPMENT`; coordinated backend, web, and itch.io release required |
| Holding Towers and Clan Treasury | Absent | Absent | `IMPLEMENTED — PENDING MERGE AND AUTHORIZED DEPLOYMENT`; not live on either published channel |
| Pending 5×5 Core world | Deployed behind the UTC activation boundary | Not yet republished for this reset | `DEPLOYED — SCHEDULED ACTIVATION` on web |
| Dynamic automatic map expansion | Deployed behind the UTC activation boundary | Not yet republished for this reset | `DEPLOYED — SCHEDULED ACTIVATION` on web |
| Exact-nine Main City map restriction and five-map red trim | Present in the repository implementation | No verified published-channel deployment | `IMPLEMENTED BUT NOT LIVE`; coordinated backend, web, and itch.io release required |

The Release Channel Matrix must be updated whenever either published channel changes.

## FM-4. Status Definitions

| Status | Meaning |
|---|---|
| `LIVE — WEB` | Verified in the primary `playcrownlands.com` production build, but not verified in the current itch.io build. |
| `LIVE — ITCH.IO` | Verified in the published itch.io build, but not verified in current web production. This should be unusual and investigated. |
| `LIVE — ALL PUBLISHED CHANNELS` | Verified in both current web production and the current published itch.io build. |
| `IMPLEMENTED BUT NOT LIVE` | Implementation exists and may be review-ready or merged in a non-production state, but deployment has not been verified. |
| `IN DEVELOPMENT` | Active design, coding, integration, migration, or testing work remains. |
| `PLANNED` | Direction is accepted for future work, but implementation and/or detailed rules are incomplete. |
| `PROPOSED` | An idea under consideration; it is not an authoritative Crownlands rule. |
| `NEEDS VERIFICATION` | Available evidence is insufficient, stale, contradictory, or requires current repository/backend or production inspection. |

Status describes implementation and deployment state. It does not replace the distinction between confirmed design intent and current behavior.

## FM-5. Release Compatibility Policy

1. Web production is the primary LIVE channel.
2. itch.io may temporarily lag during release work, but the intended normal state is parity with the latest verified production-compatible web build.
3. The itch.io client must not be described as containing a feature until that feature is verified in the published itch.io artifact.
4. Before updating itch.io, validate artifact integrity, relative/subpath asset loading, authentication, backend contract compatibility, service-worker behavior where applicable, and representative gameplay flows.
5. A release must record build ID, channel, deployment time, artifact hash when applicable, validation result, and any known channel differences.
6. If the web and itch.io clients use the same backend while their source fingerprints differ, compatibility must be tested rather than assumed.
7. The target maximum duration for ordinary web/itch.io release lag is **NEEDS VERIFICATION**.

## FM-6. Terminology Glossary

| Term | Meaning |
|---|---|
| Crownlands | The shared real-time medieval strategy game and its connected realm. |
| Region / map | A connected, handcrafted world area containing cities, routes, and configured objectives. |
| City | A capturable holding that produces resources and contributes to progression. |
| Regular city | A normal player- or neutral-owned city, excluding Camps, Strongholds, the Crown Citadel, and Holding Towers. |
| Main City | The player’s primary city and home destination for system-specific returns and progression access. |
| Camp | A timed neutral reward objective: Gold, Warband/Troop, Relic, or Deed. |
| Stronghold | One of four major regional objectives that grants a specialized realm bonus. |
| Crown Citadel | The central prestige objective with a Reign Ledger and scheduled Citadel Legion pressure. |
| Holding Tower | A clan-owned military objective with shared, personally attributed garrisons and no passive bonus. The implementation is pending merge and authorized deployment and is not currently LIVE. |
| Clan Treasury | The generation-scoped clan-owned Gold balance used for Holding Tower services. The implementation is pending merge and authorized deployment and is not currently LIVE. |
| Rally | A coordinated clan attack formed under the rules for its target type. |
| Reinforcement | Troops sent to support a valid friendly destination without transferring ownership. |
| Raw production | Base production used for scaling before temporary items, Gear, skills, objectives, or similar bonuses unless a rule explicitly says otherwise. Exact calculation scope must be configuration-backed. |
| Common Gear | Persistent officer equipment currently available at Common rarity. |
| Bag item / consumable | A normal consumable item held in the player’s Bag. These do not persist across seasons. |
| King Power | The ranking measure for individual kingdoms and aggregate clan strength. The `origin/main` implementation uses version 11; exact production runtime parity remains **NEEDS VERIFICATION**. |
| Season | A competitive period intended to end in a controlled reset and persistence process. Current cadence is not yet confirmed. |
| Reset | A controlled transition that clears normal world progression while preserving only explicitly allowlisted data. |

## FM-7. Conflict and Superseded-Decision Rules

1. Do not silently select one of two conflicting sources.
2. Record the conflict, affected section, evidence, and required resolution.
3. Do not mark a conflict resolved until the applicable implementation is inspected or a design decision is explicitly confirmed.
4. Later dates alone do not prove that one design decision superseded another. Supersession must be explicit or directly evidenced by an approved replacement.
5. Deployment never supersedes intended design automatically. A deployed defect remains a defect, not a new rule.
6. Implementation status and design intent must be edited independently.
7. The conflict register in Appendix B is part of this specification.

---

# Part II — System Specification

## 1. Game Vision & Design Principles

### Confirmed design

- Crownlands is a real-time, online-first medieval strategy game centered on building armies, capturing and developing cities, contesting objectives, joining clans, and expanding across a connected persistent realm.
- The strategic value of cities, armies, geography, timing, information, and clan coordination must remain central.
- Progression systems such as skills, items, Gear, and objectives should create meaningful choices without making the core city-and-army game irrelevant.
- Shared gameplay is server-authoritative. Client presentation must not determine authoritative outcomes.
- The game should remain understandable during time-sensitive decisions. Medieval atmosphere must not make text, actions, reports, timers, or state unreadable.
- The game experience is designed for landscape mobile play and PC.

**Status:** `LIVE — ALL PUBLISHED CHANNELS`

### Boundaries

- Crownlands is not defined by the superseded single-island, five-island, portal, or disconnected-world concepts.
- Public roadmap concepts remain non-authoritative until promoted to confirmed design.

### Open information

- Formal target audience, session-length goals, retention goals, accessibility standard, and product success metrics: **NEEDS VERIFICATION**.

## 2. Current World & Map Structure

### Current production

- Web production and the published itch.io client contain the same 20 connected regions. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Regions connect through defined north, south, east, and west edge routes. Portals are not part of the current map model. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Map artwork is a visual background; cities and objective markers are placed from gameplay data. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Region capacity is configured per region rather than treated as one universal capacity value. **Status:** `LIVE — ALL PUBLISHED CHANNELS` and documented as actively balanced.

### Current region names

Confirmed named regions include:

- Crownlands Heart
- North Frontier
- West Marches
- East Reach
- Southfields
- Bandit Wastes
- Ironfall Hills
- Redbanner Fields
- Ashenfen March
- Relic Vale
- Graywood Hollow
- Greenrook Vale
- Lowroad Vale
- Stonebrook Farms
- Goldmere Plains

The web world also contains Regions 16, 17, 19, 21, and 22. These are temporary identifiers.

**Confirmed design rule:** Every Crownlands region should ultimately have a medieval-authentic name consistent with the established world. Final names for Regions 16, 17, 19, 21, and 22 are **NEEDS VERIFICATION** and must not be invented in implementation work.

### Core world and automatic New Lands

- A 5×5 Core layout containing 25 maps, approximately 1,480 cities, 17 configured objectives, 40 reciprocal internal connections, and 20 gated outward edges is deployed behind the scheduled activation boundary. The Core is never a new-player spawn pool. **Status:** `DEPLOYED — SCHEDULED ACTIVATION`.
- The first expansion layer contains exactly 24 maps: five maps along each cardinal side of the Core plus the four corner maps. Together with the 25-map Core, this forms a complete 7×7 footprint.
- The authoritative clockwise Layer 1 map order is Northgate March, Frostmere, Highwatch Vale, Ravenstone, Eastwall Reach, Kingsroad March, Redwych, Ashford Vale, Emberfield, Sunward Ford, Goldbarrow, Southwatch, Dunmere, Blackthorn Reach, Westervale, Stoneford, Greyfen, Oakshield, Briar March, Wolfpine, Alderwatch, Moorhaven, Crownsward, and Ironwood Vale.
- The current monthly realm must expose the complete 24-map first layer. Completing a partially activated first layer is a create-only, idempotent rollout: existing islands and cities are verified in place; player-owned city documents are never overwritten; missing neutral cities are seeded at Level 1; all 24 maps are verified before the expansion-state activation is committed with a version precondition.
- Later player-growth layers allocate positions in clockwise order. Every layer begins at its north-center cardinal position, never at a corner, so its first map has a direct south road into the immediately inner layer. Capacity expansion activates the next two positions together, and a later layer cannot begin until the preceding layer's allocation order is complete.
- Every player-facing Core and New Lands map label uses a unique medieval-authentic place name. Numbered `New Lands` labels are internal planning identifiers only and must not appear as map names in the game.
- Each generated New Lands map begins with 40 neutral NPC cities, and every newly seeded or returned-to-neutral regular NPC city starts at exactly Level 1. When the currently admitting map reaches 20 remaining neutral NPC cities, the server activates the next two maps in clockwise allocation order for new-player placement. The threshold transition must be transactional, idempotent, and safe under concurrent claims.
- The Core is non-spawnable. New and returning accounts without current-generation progression spawn only in the currently admitting New Lands maps. **Status:** `DEPLOYED — SCHEDULED ACTIVATION`.
- Future outward player regions are materialized deterministically from validated New Lands templates, retain cardinal-only connections, receive unique medieval-authentic names, and are added to connected clients through the authoritative expansion-state subscription without requiring a frontend redeploy. The supported release envelope is 4,095 New Lands maps, or 81,900 threshold-managed starting placements. **Status:** `DEPLOYED — SCHEDULED ACTIVATION`.
- Reset activation fails closed: all 25 Core maps and the first New Lands map must be seeded and verified for the scheduled generation before the public realm pointer changes. The previous generation remains intact and inaccessible for pointer-based rollback. **Status:** `DEPLOYED — SCHEDULED ACTIVATION`.
- Production migration is scheduled for September 2, 2026 at 00:00 UTC and has not occurred at the time of this specification update.

### Needs verification

- Exact 20-region production topology, city capacities, total city count, reserved positions, and connection graph: **NEEDS VERIFICATION** against current production data.
- Exact rollback behavior remains **NEEDS VERIFICATION** before promotion from development design. The confirmed capacity trigger activates two additional maps when the current admitting map has 20 neutral NPC cities remaining; generation follows the complete 24-map first ring and then north-origin, clockwise allocation in later layers.

## 3. Cities & Progression

### Cities

- A player begins with one Main City. **Status:** `LIVE — ALL PUBLISHED CHANNELS` for the starting-city flow.
- Cities produce Gold and troops over time, contribute progression value, and can be captured and developed. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- City levels contribute victory points used by progression and production systems. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Captured regular cities lose one level and never fall below Level 1. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Neutral regular NPC cities are always Level 1. A repair may set a current neutral regular city back to Level 1, but it must never alter a player-owned city or an archived realm.
- Neutral captures are limited to 30 per player-local day, and neutral capture is blocked after the player owns 30 cities. Expansion beyond that ownership threshold must come from players. **Status:** `LIVE — ALL PUBLISHED CHANNELS` based on current audited rules.
- Anti-Handoff Policy v2 applies only when Player A captures a regular neutral city, still owns it at resolution, and Player B successfully takes ownership no later than 20 minutes after A's server-recorded neutral capture. The claim must carry a unique server-generated event ID. The battle-resolution timestamp, not launch time or a client timestamp, determines qualification.
- Qualifying handoffs are counted as the directed pair `A → B` across all maps in a rolling 24-hour window. Events 1-3 are allowed; event 4 is allowed and warns both players; events 5-6 are allowed with the updated count; event 7 is allowed with a final warning to both players; an eighth distinct qualifying transfer is canceled while seven events remain in the window. Expiry naturally frees a slot, and blocked or failed attempts never extend the window.
- Failed attacks, non-capturing battles, duplicate use of the same neutral-claim event for the same direction, Main Cities, Camps, Strongholds, Holding Towers, the Crown Citadel, other objectives, scouts, reinforcements, recalls, friendly transfers, and captures resolved after the 20-minute window do not count. Established-city combat, older-city captures, unrelated combat, and the reverse player direction remain available.
- Launch performs a server-authoritative precheck using the projected arrival time, and arrival repeats the check atomically with the ownership transfer and counter record. A march that becomes disallowed in transit resolves no combat or casualties, safely returns its troops, refunds an applicable march consumable, preserves or restores an otherwise incorrectly deactivated Peace Shield, and creates a persistent explanatory report. Regular-city attacks from Holding Towers use the same server helper.
- A regular city's neutral lineage records the immutable neutral-claim event ID, server capture time, claimant, current and previous owner, ownership-change time, and policy version. Player-to-player ownership changes preserve that lineage through its 20-minute eligibility window; a new claim ID is created only after legitimate neutralization and reclamation. Directed operational counters expire after their rolling window, while bounded minimal audit records remain available for support.
- The independent same-installation/shared-device restriction retains its existing 30-day behavior and is not weakened by Policy v2 or its legacy cleanup. **Status:** `IMPLEMENTED`; live status additionally requires a matching merged build, production cleanup receipt, coordinated backend/client deployment, and controlled-account verification.
- A city remains owned, productive, and defensible across the connected realm regardless of the region currently displayed. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- A regular city may become the player's Main City in any eligible Core or New Lands map, subject to the existing ownership, reinforcement, and cooldown rules. The only map-level exclusions are Stoneward, Greybanner Hold, Lionwatch, Swiftgate, Crown Citadel, Aurum Keep, Oakwatch, Ironwatch, and Roseguard. This placement rule is independent from new-player spawning: all 25 Core maps remain excluded from the new-player spawn pool. **Status:** `IMPLEMENTED BUT NOT LIVE`.
- The server must enforce Main City map eligibility from the authoritative city document path. Stored city metadata and a client-supplied region cannot override the city path. Direct selection, ordinary gameplay participation, canonical fallback, and repair/recovery must all reject or exclude a Main City in one of the nine restricted maps. Recovery relocates the Main City to an eligible owned regular city when one exists; otherwise it clears invalid Main City flags and projections before returning the normal starting-city claim requirement. No production repair is implied or authorized by this rule. **Status:** `IMPLEMENTED BUT NOT LIVE`.
- City Info must omit the entire Move/Change Main City action for every city in the nine restricted maps rather than presenting a disabled control. Other city gameplay and information remain unchanged. In the map switcher, Greybanner Hold, Crown Citadel, Swiftgate, Ironwatch, and Aurum Keep alone receive the red trim; active-map and home-map states remain independently visible. **Status:** `IMPLEMENTED BUT NOT LIVE`.
- Map-switcher tiles containing a Clan Holding Tower use a green outer trim, and tiles containing a reward Camp use a light-gold inner trim. A tile containing both keeps both trims visible. Compact `Tower` and `Camp` badges plus the map legend provide non-color-only identification while trim weight remains visible across the supported zoom range.

### Hero and skill progression

- Hero XP awards Hero Levels, and each Hero Level awards one skill point. Earlier levels in a skill cost one point; the final five levels of every skill cost two points per level. Removing a live skill level is free and refunds the exact weighted point cost of that level, while Reset Skills is a free clear-all shortcut that changes no Gold and consumes no stored legacy reset credit. Existing legacy credit data remains stored and harmless. **Status:** base Hero progression, the weighted point ledger, free live refunds, and free Reset Skills are `LIVE — ALL PUBLISHED CHANNELS` in build `fdf326a...`.
- The current skill groups are Attack, Defense, and Utility. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Current skills include Swordmastery, March Orders, Field Medics, Shieldwall Discipline, Stoneworks, Tax Stewardship, Royal Granaries, and Guild Charters. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Four private skill presets unlock at Hero Levels 25, 50, 75, and 100. The Skills screen always opens on Current Build. Selecting an unlocked preset opens an isolated, all-zero draft for an empty slot or the stored allocation for a saved slot; draft names and point changes remain local until Save, and Apply remains the only preset action that changes the live build for 1,000,000 Gold. **Status:** preset unlocks, isolated drafts, free saving, paid application, compact `− | cost | +` controls, replay-safe signed adjustments, and live refunds are `LIVE — ALL PUBLISHED CHANNELS` in build `fdf326a...`.
- Applied preset tabs use the established red treatment. The viewed tab uses Crownlands gold with dark readable text; a viewed applied preset remains red with a gold outline, inactive tabs remain tan, locked tabs remain distinct, and skill headings, descriptions, costs, and controls use explicit high-contrast colors. The repeated final-tier explanatory banner and card text are omitted because the segmented control exposes each next-level cost directly. **Status:** `LIVE — ALL PUBLISHED CHANNELS` in build `fdf326a...`.

### Confirmed Hero level-up Gold rewards

The following Hero-progression Gold reward curve is confirmed design. The 27-hour endgame ceiling is **IN DEVELOPMENT** until the implementation pull request is merged and the authoritative backend, web client, and itch.io client are deployed and verified together:

- For the new Hero level `L`, the minimum Gold floor is `500 + 250L + 40 × L^1.25`.
- Upgrade relief uses the authoritative Gold cost of upgrading a reference regular city at Level `max(1, L - 1)`. Its allowed share is 75% through Level 50, interpolates linearly from 75% to 40% across Levels 51-100, and remains 40% from Level 101 onward.
- Production relief uses the raw base Gold per hour of a reference regular city at Level `L`. Its allowance is six production hours through Level 50, interpolates linearly from six to 16 hours across Levels 51-100, and is 27 hours from Level 101 onward.
- The Gold reward is `floor(max(minimumGoldFloor, min(upgradeRelief, productionRelief)))` and is credited once by the authoritative Hero level-up transaction.
- The 27-hour ceiling leaves every Gold reward through Hero Level 116 unchanged because upgrade relief remains the binding limit. Level 117 is the first reduced reward. With the confirmed current city-production curve, the anchors are 1,762,483,914 Gold at Level 120, 2,577,700,098 at Level 125, and 17,249,182,092 at Level 150. Cumulative Gold from Levels 2-150 is 228,530,487,042, a 23.59% reduction from the current 36-hour curve.
- These are standardized reference calculations. They do not inspect the player's cities, balance, skills, Gear, objectives, production bonuses, timed items, or other Gold sources. Previously claimed rewards and existing balances are not recalculated.

### Confirmed Hero level-up troop rewards

The following Hero-progression reward curve is confirmed design and is `LIVE — ALL PUBLISHED CHANNELS`, beginning with verified cross-channel baseline build `a561374b...`:

- For the new Hero level `L`, reference victory points are `floor(6 + 4L + 2 × L^1.35)` and reference troop production is `floor(referenceVictoryPoints × 10.3)` troops per hour.
- The troop reward is `floor(max(50, referenceTroopsPerHour × rewardHours))`.
- Reward hours are `4 + 0.40L` through Level 50, `24 + 0.60(L - 50)` from Levels 51 through 100, and `min(108, 54 + 0.40(L - 100))` from Level 101 onward. The 108-hour maximum first binds at Level 235.
- This is standardized reference production, not the player's actual raw city or kingdom production. The calculation does not inspect owned cities, the receiving city, buildings, city count, skills, Gear, objectives, production bonuses, timed items, or casualty recovery. Every player reaching the same Hero level receives the same calculated base reward.
- The resulting troops continue to be credited once to the player's canonical Main City through the authoritative Hero reward transaction. Main City selection and fallback behavior are unchanged by this balance update.

### Confirmed city-upgrade Hero XP

The following city-progression reward model is confirmed design. The original model-v2 baseline at 1% is `LIVE — ALL PUBLISHED CHANNELS` beginning with verified cross-channel build `a561374b...`; this release changes only future eligible city upgrades to the 0.5% award below, without altering stored Hero XP or any other XP source:

- City-upgrade XP model version 2 is the confirmed model. Upgrading a regular owned city from Level `L` to Level `L + 1` offers `max(1, floor(HeroXpRequired(L) × 0.005))` Hero XP. This is exactly 50% of the previous fixed rate before the existing floor and minimum-one rounding are applied. The source city level is the only balance input; Gold cost, discounts, skills, Gear, objectives, items, production, and the receiving Hero level do not change the raw award.
- A bulk upgrade evaluates every crossed city level independently and sums those fixed awards.
- Each player has a seasonal high-watermark for each region-and-city identity. On the first encounter with this feature, the current pre-upgrade city level becomes the baseline and grants no retroactive XP. Only newly developed levels above the stored high-watermark are eligible. Capture, loss, relinquishment, recapture, or rebuilding does not reset the high-watermark. The high-watermark is generation-scoped and server-protected.
- Every eligible city-upgrade XP award is uncapped at every Hero level. Model version 2 does not read or write daily city-XP allowance state. Existing model-version-1 allowance data remains harmless stored data and is not migrated or deleted.
- XP from rebuilding levels at or below the high-watermark is discarded, not banked. Rebuild suppression is applied silently and does not block, reduce, or cancel an otherwise valid city upgrade.
- City-upgrade controls, accessibility text, confirmations, toasts, and logs do not display XP estimates, awards, or suppression. The authoritative response retains its XP receipt for progression, replay safety, compatibility, and validation.
- City XP uses the normal Hero-level reward path. Every crossed Hero level continues to grant its skill point, Gold, and approved standardized Main City troop reward exactly once; the city-XP feature does not independently alter those rewards.
- Upgrade affordability is resolved using the player's Gold before city XP and Hero-level rewards are applied. Gold awarded by a Hero level-up cannot fund more city levels within the same request.
- The authoritative response records raw XP, awarded XP, rebuild suppression, eligible and ineligible levels, UTC day key, and model version. Compatibility fields such as `capSuppressedXp`, daily-cap activity, allowance, usage, remainder, and cap-reference Hero level remain present with zero, false, or null values. Upgrade requests are replay-safe under retry and concurrency.

### Confirmed instant city-upgrade feedback

- The City List represents every regular city and Stronghold the signed-in player owns throughout the current server world, reset generation, and realm shard, independent of the region currently displayed. The roster is obtained through one bounded owner-scoped cross-region read rather than one persistent listener per region. The city document's island path supplies canonical region identity; stale stored region metadata cannot override it.
- A canonical current-realm island path is sufficient to recognize an opaque generated Core city ID even when that map's lazy-loaded definition has not entered the client cache. Large portfolios spanning unloaded maps must not be filtered down to the active map; the UI paginates the complete verified roster.
- A timed-out, denied, invalid, duplicate, or count-mismatched roster read must not be reported as complete. The City List may retain verified or previously saved rows while clearly reporting that the full roster is unavailable and offering a retry; a later verified complete read replaces the cache and removes cities no longer owned.
- Every accepted map, City Info, or City List upgrade action immediately reserves its projected Gold and displays its projected city level without changing persisted authoritative state. The active-map city, castle presentation, map label, selected-city controls, City Info, and City List must agree on the projected or confirmed level.
- Additional `+1` and `+5` actions remain available while earlier requests are processing and use projected Gold and projected levels for cost and affordability. `+5` is exact and all-or-nothing. `MAX` reserves every level affordable with projected Gold, while the server remains authoritative for its final result.
- Each accepted input reserves its projected levels and Gold immediately. Adjacent undispatched exact `+1` and `+5` inputs for the same region-and-city key compact into one request-ID-backed exact batch of no more than 25 levels. The active request is immutable, overflow remains in global input order, and `MAX` is always a standalone authoritative request. City batches dispatch without the shared economy coalescing delay or a routine city-XP preview request.
- If the server rejects an action, dependent queued actions for that city are cleared, authoritative Gold and city data are refreshed, and the projection rolls back. Unrelated actions are revalidated against the refreshed state.
- After each confirmation, the owned-city cache and active-map city receive the authoritative update before any remaining projection is reapplied. Gameplay calculations continue to use confirmed server state.
- During one open City List session, each surviving row keeps its ordinal position, page, scroll, focus, and sort position through projection, authoritative settlement, rejection recovery, and automatic roster or economy synchronization. Newly discovered cities append in deterministic current-sort order, while cities no longer owned disappear without changing the relative order of surviving rows. Clicking either sort control, including reapplying the current sort, creates a fresh ordering; closing and reopening the City List also applies the selected sort to the latest roster. Only affected visible rows and Gold are patched during queued upgrades, with heavy presentation work limited to one update per animation frame before any required active-map redraw. The nonblocking state reports projected levels syncing without disabling affordable upgrade controls.
- Confirmed city-upgrade feedback is emitted once per settled server batch. A presentation, sound, toast, log, or animation failure cannot reject an authoritative settlement, freeze the queue, or prevent later actions from draining.
- City List upgrades are map-independent. Region-and-city is the canonical identity for owned-city caching, pending actions, incoming-attack blockers, authoritative requests, and reconciliation. The city document's island path is authoritative when stored region metadata disagrees, and an off-map upgrade never requires a map switch.
- Only the selected-city map Level action uses the dedicated simple arrow-up glyph and Crownlands gold treatment. Its accessible `Level up` label and Gold cost remain visible. City Info and City List controls retain the `+1`, `+5`, and `MAX` labels.

#### City-upgrade XP compatibility rollout

- During the temporary cross-channel compatibility window, the server accepts an otherwise valid legacy city-upgrade request that omits the new request ID. The city upgrade, Gold spend, invested-Gold accounting, production collection, and city-upgrade progression event remain authoritative and atomic.
- A legacy request awards zero city-upgrade Hero XP and therefore cannot trigger a Hero level, skill point, level-up Gold reward, or level-up troop reward.
- Every successful legacy request advances the seasonal per-player, per-region, per-city high-watermark through the highest city level completed by that request. Changing to an updated client cannot reclaim XP for those levels later. Legacy retries, duplicate calls, rebuilding, or client switching therefore cannot duplicate Hero XP.
- Requests carrying a valid request ID remain on the complete updated path: replay receipt, city XP, silent rebuild suppression, high-watermark, and normal Hero-level rewards all retain the confirmed behavior above. The preview endpoint and suppression acknowledgement fields remain accepted for older clients but are not required by the current server. A current client silently retries if an older compatible backend still returns the former suppression-warning precondition.
- The server economy setting `cityUpgradeXp.legacyRequestsEnabled` controls the compatibility window and defaults to an explicit configured value. Once set to `false`, a request without an ID is rejected before any transaction writes with reason `city-upgrade-client-update-required` and a player-facing instruction to update Crownlands.
- Required rollout order is: (1) deploy the compatibility-capable backend; (2) publish the updated client to every supported web and itch.io channel; (3) verify adoption and successful request-ID-backed upgrades on every channel; (4) disable legacy requests through the server setting; and (5) remove the temporary legacy path in a later cleanup release. Functions or clients must not be released independently in the opposite order.

**Confirmed season rule:** Hero level, Hero XP, unspent skill points, acquired skill upgrades, and saved skill presets reset each season. Hero progression is normal seasonal world progression and is not part of permanent Gear progression.

### Verified `origin/main` initialization

The server implementation inspected during the August 24 audit at commit `27105ae...` initializes a fresh/reset player with:

- 100 Gold (`TEST_STARTING_GOLD`)
- 200 troops in the starting city (`PLAYER_STARTING_TROOPS`)
- one Level 1 Main City with defense `1`, invested Gold `0`, and current production timestamps
- Hero Level 1, XP `0`, and skill points `0`
- empty skill upgrades and default presets
- an empty normal Bag, no active item effects or purchase cooldowns, and default Common Gear state
- no battle or scout reports
- a default march percentage of 50%

These are **verified implementation facts**, not an independent balance-design confirmation. The exact deployed backend/runtime values remain **NEEDS VERIFICATION**. The prior 500 Gold/50 troops observation is not present in the inspected current initialization path.

### Needs verification

- Whether production Cloud Functions execute the inspected 100 Gold/200 troop initialization path: **NEEDS VERIFICATION** through a controlled runtime claim or authenticated deployment record.
- Whether 100 Gold and 200 troops should be promoted from current implementation values to explicitly confirmed long-term balance rules: **NEEDS VERIFICATION** by design decision.
- Current Hero XP curve, per-battle XP caps, inactivity release rules, city level maximum, and every city-upgrade cost/time value: **NEEDS VERIFICATION** against current configuration.

## 4. Economy & Resources

### Confirmed current rules

- Gold and troops are the primary normal world resources. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- City production continues across the owned kingdom and must be resolved authoritatively. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Troop production is based on city progression value plus applicable production bonuses. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Gold production follows its configured production curve plus applicable skills, items, Gear, and objective effects. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Gold Camp, Troop/Warband Camp, world-pickup, Daily Mission, and Achievement production-scaled rewards use raw production rather than already-boosted production. **Status:** `LIVE — ALL PUBLISHED CHANNELS` for the August 22 and later clients.
- Raw production must exclude temporary bonuses and other multipliers unless a specific rule explicitly includes them.

### Verified `origin/main` production implementation

At commit `27105ae...`, regular-city production is server-authoritative and mirrored client-side for presentation:

- Gold production units at city level `L` are `floor(20 × 1.115^(L - 1) + 0.000001)`.
- Base Gold per hour through Level 100 is `production units × 15`.
- Above Level 100, the Level 100 base is multiplied by `1.08^(L - 100)` and floored.
- Level 1 therefore produces 300 base Gold per hour.
- City progression value for troop production is `floor(6 + 4L + 2 × L^1.35)`.
- Base troops per hour are `city progression value × 10`.
- Level 1 therefore produces 120 base troops per hour.
- Strongholds and the Crown Citadel produce zero base Gold and zero base troops themselves.

### Confirmed next-reset city balance

The following balance is confirmed for the next coordinated client and Functions release. It is **IN DEVELOPMENT** until the implementation pull request is merged and is not LIVE until deployment to each named release channel is verified:

- Base troops per hour become `floor(city progression value × 10.3)`, a 3% increase before bonuses. Level 1 becomes 123 troops per hour, Level 100 becomes 14,502, and Level 150 becomes 24,081.
- For regular-city Gold production, `U(L) = floor(19 × 1.1155^(min(L, 100) - 1) + 0.000001)` and base Gold per hour is `floor(U(L) × 15 × 1.079^max(0, L - 100))`.
- The confirmed Gold anchors are 285 per hour at Level 1, 3,915 at Level 25, 60,360 at Level 50, 928,095 at Level 75, 14,266,995 at Level 100, 638,858,596 at Level 150, and 28,607,307,045 at Level 200.
- The existing upgrade target-hour curve is unchanged. Absolute upgrade prices and other raw-production-scaled Gold amounts follow the lower curve, while the intended one-city production-hour cost of an upgrade stays unchanged.
- Regular-city base walls use staged, monotonic growth with anchors of 200 at Level 1, 600 at Level 2, 1,456,669 at Level 50, 3,000,000 at Level 100, and 6,200,000 at Level 150.
- Levels 1-25 use `round(200 + 400 × (level - 1)^1.8550607303011009)`. The Level 1-to-2 increase is exactly 3×, and no adjacent level through Level 25 may exceed 3×.
- Levels 26-50 use a shape-preserving cubic bridge from the Level 25 curve to the Level 50 anchor. Levels 51-100 interpolate evenly to the Level 100 anchor.
- Levels 101-150 add wall power according to the relative Gold upgrade cost raised to exponent `0.22881653173769995`, normalized at Level 100. This re-anchors the Gold-linked segment to the exact 6,200,000 Level 150 wall after the Gold-curve change without changing the post-Level-150 troop-production rule.
- Above Level 150, base wall power transitions to a base troop-production replacement ratio. That ratio begins at the Level 150 anchor, reaches 240 production hours at Level 200, and remains at 240 hours thereafter so the wall continues increasing with troop production without a fixed level cap.
- Stoneworks remains the only skill that strengthens the wall. Soldier defense, wall repair, objective support, reward-camp behavior, and the two-stage siege model do not change.
- The Level 150 maximum-activity siege benchmark must remain within 59-62 million maximum-Swordmastery attackers and 2.34-2.59 maximum-activity troop-production days for the existing apex portfolio.

Permanent/untimed and temporary production additions are calculated separately against base production:

- Gold per hour = `base × (1 + (Tax Stewardship + Gear + objective Gold bonus) / 100) + base × Royal Tax Decree / 100`.
- Troops per hour = `base × (1 + (Royal Granaries + Gear + objective troop bonus) / 100) + base × War Drums / 100`.
- Royal Tax Decree is configured at 50%.
- War Drums is configured at 30%. The server code has a 5% fallback, but the active executable economy configuration at the inspected commit overrides it with 30%.

These formulas are verified repository implementation. Exact deployed backend parity remains **NEEDS VERIFICATION**.

### Web Shop scaling

- Paid consumable pricing scales from raw regular-city Gold production. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- The confirmed pricing model uses the following production-hour multipliers: Royal Tax Decree `0.18`, Swift March Order `1.0`, Recall Horn `1.25`, War Drums `1.5`, Veil of Silence `2.0`, and Royal Peace Shield `3.5`.
- The city-count premium is `1 + min(cityCount / 500, 0.35)`.
- The minimum calculated price is 50 Gold.
- Common Gear Box pricing remains separate at 1 billion Gold.
- The server calculates raw price as `raw regular-city base Gold per hour × item multiplier × city-count premium`.
- The premium uses floored non-negative city count: `1 + min(floor(cityCount) / 500, 0.35)`.
- Rounding uses `step = 10^max(1, floor(log10(raw price)) - 1)`, rounds to the nearest step, and enforces the 50-Gold minimum.
- The server recalculates pricing in the purchase transaction and rejects a stale client quote. These are verified `origin/main` facts; exact production runtime parity remains **NEEDS VERIFICATION**.

### Needs verification

- Resource caps, offline-production behavior, collection timing, upgrade costs, repair costs, gift limits, and economic sinks not listed above: **NEEDS VERIFICATION** against current configuration.
- Formal inflation targets and season-level economy budgets: **NEEDS VERIFICATION**.

## 5. Armies, Movement & Combat

### Movement

- The travel section of attack and troop movement dialogs shows only **Travel bonus** and **Travel time**. The bonus comes from the authoritative speed multiplier, with the established skill/objective multiplication and additive Gear contribution; a selected valid Swift March Order uses its actual time reduction. No bonus displays as 0%. Routing, troop bands, minimum durations, and attack eligibility remain unchanged. Blocking errors stay beside the action controls. Active march countdowns retain their accepted arrival timestamp. Release verification is recorded in `docs/COORDINATED_TRAVEL_SCOUT_DEED_CHAT_RELEASE.md`.
- Armies move in real time along valid routes for attacks, scouting, transfers, support, regrouping, and rallies. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Cross-region movement must use configured region connections. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Connected travel must work regardless of how many map definitions are currently cached. The current Core/New Lands network uses the lowest total terrain-route distance across its active reciprocal roads; new Layer 2/3 maps join through their authoritative configuration. Troop bands and existing speed modifiers still determine duration. There is no fixed 20-map journey limit. The cross-map routing audit records implementation and release evidence in `docs/WORLD_TRAVEL_ROUTING_AUDIT.md`.
- Normal troop-march duration has no maximum cap. The authoritative route distance continues through every traversed map, and the existing distance, order-kind, troop-band, speed-skill, Gear, Stronghold, and minimum-duration rules calculate the full travel time even when it exceeds 30 minutes. The server rebuilds the route and duration from trusted endpoints and modifiers; client-provided geometry, distance, ETA, or duration cannot shorten an authoritative march.
- The attacking army’s launch-time attack value is locked when dispatched. Defender troops, reinforcements, ownership, wall repair, and applicable live defensive state may change until arrival. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.

### Combat

- Combat uses a two-stage siege: attack power damages one physical wall, then remaining attack power fights the garrison. Capture requires remaining attack power to exceed garrison defense. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Each attacking troop has `1.25` base attack power. Maximum Swordmastery raises it by 60% to `2.0`. **Status:** `LIVE — ALL PUBLISHED CHANNELS` based on current audited rules.
- Each defending troop has `1.30` base defense power before Shieldwall and other valid support. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Shieldwall Discipline adds 2% per level up to 60%. City level does not increase per-soldier defense. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- The currently published regular-city wall curve is `200 + 28,858 × (level - 1)`. Stoneworks is the wall-strength skill multiplier. **Status:** `LIVE — ALL PUBLISHED CHANNELS` based on current audited rules. The confirmed staged replacement is specified in Section 4 and remains **IN DEVELOPMENT** until merged and deployed.
- Full-breach repair time is `round(15 + 0.3 × city level)` minutes. Wall damage below 5% does not persist. **Status:** `LIVE — ALL PUBLISHED CHANNELS` based on current audited rules.
- Failed attacks and lost defenses award reduced XP according to current configuration. Exact current award calculation is **NEEDS VERIFICATION**.
- Field Medics returns a configured share of losses to the Main City. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.

### Scouting and reports

- Completed scout reports are delivered independently through the account's live report subscription, including across map changes and reopening Reports. Client arrival settlement permits two concurrent scout resolutions to reduce contention on shared player economy documents. A slow or failed target does not hold the completed reports of other targets. Intended scout travel, costs, cooldowns, permissions, ten-minute intelligence, and idempotent launch/arrival receipts remain unchanged. The one-minute backend arrival scheduler remains the offline fallback.
- A normal scout sends one troop and produces a ten-minute intelligence snapshot. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- A newer successful scout replaces the earlier snapshot for that target and restarts the timer. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Attack and defense reports remain available for 24 hours; successful scout entries expire with their ten-minute intelligence. **Status:** `LIVE — ALL PUBLISHED CHANNELS` based on current audited rules.
- Forecasts must explain wall and garrison stages and distinguish launch-time attack state from live arrival-time defense state. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.

### Needs verification

- Complete loss formulas, tie behavior, protected-raid rules, reinforcement limits, march-speed formula, route calculation, cancellation behavior, and every combat modifier order: **NEEDS VERIFICATION** against current client/server configuration.

## 6. Camps & World Objectives

### Camps

- Four Camp categories are live: Gold, Warband/Troop, Relic, and Deed. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- A neutral Camp starts with 20,000 defenders, has no wall, and gives each defender `1.00` defense with no personal skill or objective bonus. **Status:** `LIVE — ALL PUBLISHED CHANNELS` based on current audited rules.
- Camps are timed contestable objectives. A ruler must defeat defenders and hold the Camp through its public resolution timer to receive the applicable reward. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Gold and troop production-based Camp rewards use raw production. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Relic Camp payouts can include the configured Common Gear Box chance. Current audited value is 1%. **Status:** `LIVE — ALL PUBLISHED CHANNELS`; backend value should be verified before balance changes.

### Verified `origin/main` reward implementation

- A Gold Camp hold uses a 10-minute timer. The first four UTC-day rewards use: 20,000 minimum/0.5 production hour; 40,000/1 hour; 60,000/1.5 hours; and 80,000/2 hours. Later daily claims pay zero.
- A Warband/Troop Camp hold uses a 15-minute timer. The first four UTC-day rewards use: 10,000 minimum/0.5 production hour; 20,000/1 hour; 30,000/1.5 hours; and 40,000/2 hours. Later daily claims pay zero.
- Each production-scaled Gold or troop Camp payout is `max(minimum reward, floor(raw kingdom production per hour × reward hours))`.
- A Relic Camp uses a 30-minute hold and permits five item rewards per player per UTC day. Its item weights are War Drums 35, Veil of Silence 25, Swift March Order 18, Royal Tax Decree 12, Recall Horn 8, and Royal Peace Shield 2, plus a separate 1% Common Gear Box chance.
- A Deed Camp uses a 60-minute hold and permits one reward per player per UTC day. It grants one eligible neutral regular non-center city at that city’s existing level with zero troops.
- Deed city selection has equal probability per eligible city across the complete active realm/server, discovered from the authoritative world configuration and current expansion state inside the payout transaction. It does not choose a map first or cap the per-map candidate list. The legacy `center` (former Crownlands Heart) exclusion remains; that map is absent from the current Core/New Lands topology. Every current active map can contribute eligible regular cities, including ordinary cities in the Crown Citadel map. Main Cities, objectives, occupied cities, noncanonical targets, other realms/generations, and inactive/future maps are excluded.
- An earned Deed reward with no eligible city reserves that day's reward in a durable receipt. The garrison returns and the Camp resets normally; the original holder receives the city automatically when the pool permits. The reservation counts against the original earning day's one-reward limit. A later holder cannot cancel or receive it. Transactional selection and receipts prevent duplicate awards and ownership overwrites; an explanatory report identifies the reservation and another report identifies the recovered city.
- A ruler's first world pickup appears after two minutes. Each successful collection starts a two-minute respawn, while rejected or failed collections preserve the active pickup and its existing deadline. Pickups favor terrain-safe positions toward the center of the active map, expire after 20 minutes, and grant 30 minutes of raw, non-boosted Gold or troop production with a minimum of 125. The per-player UTC-day caps are 60 total, 30 Gold, and 30 troop pickups, so collecting one type does not reduce the other type below its independent 30-pickup allowance; at most one pickup is active per player. Failed placement attempts retry after five seconds. Camps, Relics, Deeds, Daily Missions, Achievements, advertisements, and Shop rewards are unchanged by this pickup balance rule. **Status:** the balance change is confirmed for this release and becomes live only after coordinated backend/client deployment verification.

These are verified repository facts for commit `27105ae...`; exact deployed backend parity remains **NEEDS VERIFICATION**.

### Needs verification

- Camp respawn cadence, eligible rally behavior, contention edge cases, and production runtime parity for the verified values above: **NEEDS VERIFICATION**.

## 7. Strongholds & Crown Citadel

### Strongholds

- Four regional Stronghold types are live: Gold, Training, Movement, and Defense. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- A newly seeded neutral Stronghold starts with exactly 50,000,000 defensive troops. A newly seeded neutral Crown Citadel starts with exactly 100,000,000 defensive troops. These values apply only to a pristine neutral spawn: layout reconciliation and data repair must never overwrite a player-controlled or previously conquered objective's maintained troop state.
- Strongholds provide specialized realm bonuses and serve as clan rally targets. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Stronghold ownership and relevant support must be represented in combat, scouting, and reports without double-counting. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Restored Stronghold information contrast is `LIVE — ALL PUBLISHED CHANNELS`.

### Verified `origin/main` objective bonuses

- Direct control grants 8% for the objective’s specialization: Gold, troop training, march speed, or city defense.
- Clan-shared Stronghold benefit is half of the direct value: 4%.
- Direct Crown Citadel control grants 10% each to base Gold production, base troop production, march speed, city defense, and upgrade-cost reduction.
- Clan-shared Crown Citadel benefit is half of the direct value: 5%.
- Clan-aware calculation prevents an ordinary Stronghold holder from receiving its own full benefit plus its own shared half a second time.
- The Citadel controller receives the 10% Citadel benefit plus half of personally held non-Citadel Strongholds. For example, holding the Citadel and a Gold Stronghold yields 14% Gold production benefit.
- Another Gold Stronghold holder in the Citadel controller’s clan receives 8% from the held Gold Stronghold plus 5% shared Citadel benefit, for 13%.

The objective logic and explicit validator coverage are verified in `origin/main`; exact production runtime parity remains **NEEDS VERIFICATION**.

### Crown Citadel

- The Crown Citadel is the central prestige objective. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Citadel control is recorded in a Reign Ledger. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- The Citadel Legion selects up to 20 eligible regular non-main cities in the Citadel region at 9:45 AM and 6:15 PM America/New_York time and attacks at 10:00 AM and 6:30 PM with 100,000 NPC troops per target. **Status:** `LIVE — ALL PUBLISHED CHANNELS` based on current audited rules.
- Citadel Legion attacks ignore walls without damaging them. If the defenders are defeated, the city loses five levels; Level 5-or-lower cities return to neutral at Level 1 with 10 troops. Peace Shields do not block the event, and defenders receive no XP. **Status:** `LIVE — ALL PUBLISHED CHANNELS` based on current audited rules.
- Restored Citadel information contrast is `LIVE — ALL PUBLISHED CHANNELS`. The separate Inner Castle entry from Profile is tracked in Section 16.

### Needs verification

- Capture safeguards, reset behavior, Legion target exclusions, scheduling failure recovery, complete Reign Ledger retention rules, and production runtime parity for the verified bonuses: **NEEDS VERIFICATION**.

## 8. Holding Towers

### Deployment status

Holding Towers and Clan Treasury are `IMPLEMENTED — PENDING MERGE AND AUTHORIZED DEPLOYMENT`. The current synchronized implementation is reconciled with the current world, economy, clan, Rally, scouting, reset, security, and release contracts, but it is not live on either published channel. Historical [PR #159](https://github.com/explocion200/CrownLands/pull/159) at commit `e1abf11b46ab66d0586faeab06da083363fd565c` remains archived, unmerged, and not live; it must not be merged into current `main`.

Holding Towers are hard-gated to the dynamically resolved current Core world, current reset generation, and current shared realm shard. Current-world maintenance may reconcile only the 25 permanent Core maps and current Tower records; it must not scan or mutate archived or inactive worlds. No merge by itself authorizes production seeding, a world reset, a world switch, or deployment.

### Confirmed design specification

- Four Holding Towers are confirmed:
  - Ravenwatch — northwest
  - Highguard — northeast
  - Blackthorn — southwest
  - Stoneward — southeast
The current Core mappings are fixed:

| Tower | Stable ID | Region | Grid | Coordinate |
|---|---|---|---:|---:|
| Ravenwatch Tower | `core-v2-holding-tower-1` | `core-v2-north-west-holding-tower-m1-m1` | `(-1,-1)` | `(736,552)` |
| Highguard Tower | `core-v2-holding-tower-2` | `core-v2-north-east-holding-tower-p1-m1` | `(1,-1)` | `(734,555)` |
| Blackthorn Tower | `core-v2-holding-tower-3` | `core-v2-south-west-holding-tower-m1-p1` | `(-1,1)` | `(724,543)` |
| Stoneward Tower | `core-v2-holding-tower-4` | `core-v2-south-east-holding-tower-p1-p1` | `(1,1)` | `(736,555)` |

- Holding Towers are clan-owned military objectives and grant no passive realm bonus.
- A clan may control all four Towers.
- Neutral Towers begin at Wall Level 1 with full integrity and 10,000,000 NPC defenders.
- Tower conquest is rally-only and requires five unique eligible clan members, each contributing at least one troop.
- A new clan member has a 24-hour Tower participation probation.
- Each contributor’s troops remain personally attributed inside the shared clan garrison.
- Surviving attackers remain in the Tower after capture.
- All valid defenders fight together.
- A Tower may launch solo attacks, rallies, and scouting against normal valid targets. Tower conquest itself remains rally-only.
- When a member leaves or is removed from the clan, that member’s surviving Tower troops return to the member’s Main City.
- Clan disbanding neutralizes and resets controlled Towers.

### Tower walls and construction

- Tower wall levels have no maximum.
- A Tower wall upgrade costs five times the equivalent regular-city wall upgrade cost.
- Each wall level takes ten minutes to construct.
- A Tower may queue up to ten wall levels.
- Capture reduces the Tower wall by five levels, never below Level 1, and sets wall integrity to zero.
- A wall must be fully repaired before another upgrade begins.
- Repair cost equals five times the equivalent regular-city wall cost multiplied by the damaged percentage.
- Repairs are manually initiated and paid from the Clan Treasury.
- Repairs use the unmodified regular-city wall repair rate. Speed items and modifiers do not apply.
- No player item or modifier accelerates Tower wall construction.
- Repair and upgrade cannot be started while the Tower is under attack.
- An existing repair continues through an attack.
- Construction pauses during an attack.
- Queued construction is lost without refund when the Tower is captured.

### Tower Veil

- Tower Veil is a Tower-specific Clan Treasury service, not a normal Bag item.
- Duration is ten minutes.
- Limit is three uses per Tower per UTC day.
- Cost is one times the equivalent regular-city wall cost at the Tower’s current wall level.

### Tower scouting and presentation

- There is no separate `Scout From Tower` action and no manual Tower-origin selector.
- The normal target-driven Scout action automatically selects the closest eligible origin from either the player's personally owned Cities or a clan Holding Tower where that player has personally stationed troops and remains Tower-eligible.
- Tower screens use the established Crownlands burgundy manuscript headers, parchment and ivory surfaces, tan information boxes, dark readable ink, and existing action-button treatments. Desktop and 844×390 landscape layouts must remain readable.

### Implementation verification before deployment

- The implementation includes deterministic unit/static coverage, Firestore Rules emulator coverage, Treasury concurrency coverage, current-world Camp/Tower reconciliation checks, and the existing complete multiplayer emulator gate. **Status:** `IMPLEMENTED — PENDING MERGE AND AUTHORIZED DEPLOYMENT`.
- Authenticated production smoke testing, production runtime parity, notification delivery, and rollback rehearsal remain required before the feature may be described as live.
- Deployment must target only the current Core world and current generation. Archived and inactive worlds remain untouched.

## 9. Clans, Rallies & Clan Treasury

### Clans

- Players may create or join clans, hold clan roles, coordinate through Clan Chat, send clan gifts, complete weekly clan goals, reinforce allies, and participate in rallies. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Current operative roles include Leader, Officer, and Member. Exact permission tables are **NEEDS VERIFICATION** against current backend rules.
- Clan ID, clan name, clan tag, clan heraldry, member roster, and each member’s current role—including Leader, Officer, and Member—persist across seasons.
- Every current-season clan root, roster member, benefit, gift, quest, Rally, Treasury, and related seasonal record carries the active realm-shard identity. Clan membership and clanmate/allied map relationships are derived from that authoritative roster; missing shard metadata must be repaired without changing membership, roles, heraldry, resources, or player-controlled world state.
- Clan Treasury balance and ledger, seasonal statistics, weekly-goal progress, rallies, reinforcements, donations/gifts activity, and ownership of Holding Towers, Strongholds, the Crown Citadel, or other world objectives reset each season.

The current reset path preserves clan identity, roster, membership, roles, name, tag, and heraldry while rebuilding generation-scoped clan state. The rollover is transactional and fails without partial season changes when a preserved clan record is incomplete or inconsistent. Clan Treasury/ledger, seasonal statistics, goals, rallies, reinforcements, gifts activity, benefits, leaderboards, and objective ownership are reset for the new generation. Emulator coverage includes concurrent member claims, replay safety, invalid rosters, missing records, disbanded clans, removed members, and the 30-member limit. **Status:** `IMPLEMENTED — PENDING SCHEDULED RESET VERIFICATION`.

### Clan Heraldry

- Legacy v1 clan heraldry remains compatible in both clients.
- Clan Heraldry v2, its approved catalog, landscape scrolling fix, and live-editor correction are `LIVE — ALL PUBLISHED CHANNELS`.
- Existing v1 clans must not be visually changed merely because v2 exists; migration occurs when the authorized clan leader deliberately saves v2 heraldry. This is a confirmed design compatibility rule.

### Rallies

- The confirmed ordinary Rally design supports 2–20 unique clan members, with one army from one city per participant. A clan may have no more than five active Rallies. There is no formation expiry or automatic launch timer.
- Any active clan member may join. Only Clan Leaders and Officers may create a Rally. Only the Rally creator or the Clan Leader may manually launch or cancel a forming Rally; only the creator may recall the launched combined army.
- If the creator of a launched Rally leaves the clan, is removed from it, or changes clans, the server automatically recalls the complete combined Rally army. This automatic safety recall preserves the committed combined force for participant settlement, consumes no Recall Horn, and records `rally_creator_clan_departure` as the reason. A non-creator leaving the clan does not recall another creator's launched Rally.
- A launch is atomic and must be blocked with a clear explanation unless every participant is still an eligible clan member, every contribution has arrived and is Ready, the creator still owns the assembly city, the objective is still eligible and hostile, and at least two participants remain. An invalid non-creator contribution is removed and returned; an invalid creator cancels the Rally.
- Ordinary Rallies may target only Strongholds and the Crown Citadel. Reward Camps and ordinary cities are not Rally targets. The four Holding Towers are Rally targets under their separate Tower rules once this implementation is authorized and deployed.
- A launched Rally travels at its slowest participant's march speed, locked at launch. Each participant keeps that ruler's own attack skills, Common Gear, applicable bonuses, casualty recovery, and troop ownership. Combat resolves all participant packages together against live arrival-time defense.
- Attacker losses are allocated proportionally to troops contributed, with deterministic whole-troop rounding. A defeated Rally has no surviving attackers.
- On victory, the Rally creator becomes the personal controller of a Stronghold or Crown Citadel and the clan receives its shared benefit. The creator's survivors hold the objective; allied survivors remain there as individually attributable reinforcements their owners may recall. Holding Towers remain clan-owned and all eligible survivors are stationed as attributed clan garrison troops rather than creating a personal owner.
- Every participant receives the same Rally battle outcome snapshot with a clearly labeled breakdown of each participant's committed troops, losses, survivors, and contribution.
- If a Rally return's original city is still owned by the participant, the army returns there. If it is neutral or clan-owned, the army returns to the participant's Main City. If an enemy owns it, the returning army attacks that city.
- Ordinary objective Rallies are not restricted by ordinary-city attack protection, neutral-city caps, or anti-farming gates. Committing Rally troops does not remove a Royal Peace Shield.
- The ordinary Rally lifecycle correction above is `LIVE — ALL PUBLISHED CHANNELS`. PR #171 merged as `1e5cdad...`, PR #180 merged the stale Rally-ownership correction as `1a0efbcb...`, and descendant build `a561374b...` established the first verified cross-channel baseline. Current web and itch.io build `fdf326a...` retains the correction. The corrected beginner guide remains live on the canonical game host and itch artifact but not on the separately published primary-domain public site.
- The five-member Holding Tower conquest rule documented in Section 8 is target-specific and `IMPLEMENTED — PENDING MERGE AND AUTHORIZED DEPLOYMENT`; its five-member minimum does not replace the ordinary Rally minimum globally.

### Clan Treasury

- Clan Treasury is `IMPLEMENTED — PENDING MERGE AND AUTHORIZED DEPLOYMENT` as part of Holding Towers.
- Treasury funds are donated personal Gold and cannot be withdrawn.
- All members may donate; only Leaders and Officers may spend.
- Treasury balance resets each season and when the clan disbands.
- The UI and ledger record seasonal total donated and total spent values.
- A member’s daily donation cap is 12 hours of raw base Gold production. That raw Gold/hour value is atomically snapshotted on the first successful donation of each UTC day and remains fixed until the next UTC day.

### Needs verification

- Maximum clan size, invitation rules, role-change cooldowns, gift values and limits, weekly-goal configuration, inactivity handling, clan-name rules, disband recovery, and moderation controls: **NEEDS VERIFICATION**.

## 10. Items, Shop & Monetization

### Current items

Current strategic consumables include:

- War Drums
- Royal Peace Shield
- Royal Tax Decree
- Veil of Silence
- Swift March Order
- Recall Horn

Common Gear Boxes are Shop/Bag objects connected to Gear progression. Unopened Common Gear Boxes are persistent Gear-system assets and are not normal consumable Bag items for season persistence.

**Core item status:** `LIVE — ALL PUBLISHED CHANNELS`.

### Item behavior

- Items support attack, protection, production, concealment, movement, or recall according to their server-authoritative rules.
- Normal consumable Bag items do not persist across seasons.
- Identical Bag items are grouped by quantity. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- The Bag uses All, Boosts, War, Defense, and Utility categories with an eight-item, four-by-two visible layout and supported paging/navigation. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- The Shop uses scalable pricing described in Section 4. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.

### Monetization

- Optional rewarded-ad pathways exist. **Status:** `LIVE — ALL PUBLISHED CHANNELS` for the foundation; exact availability may depend on channel configuration.
- Rewarded ads must not bypass server authority or grant a reward more than once for one validated completion.
- Shop rewarded-ad layout and carousel-stability fixes are `LIVE — ALL PUBLISHED CHANNELS`.
- Formal monetization principles, paid-product policy, premium currency policy, ad-frequency limits, regional compliance, and player-protection rules: **NEEDS VERIFICATION**.

### Needs verification

- Exact duration, limits, stacking, cancellation, target eligibility, and interaction priority for every consumable.
- Exact deployed reset behavior for unopened Common Gear Boxes. The confirmed design requires persistence, while the current `origin/main` reset implementation resets them to zero.

## 11. Gear & Persistent Progression

### Current Common Gear

- Common Gear is the live persistent equipment foundation. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Gear is organized around War Captain, Master of Coin, Cavalry Master, and Defensive Commander roles.
- Each role has eight equipment slots, for 32 Common Gear definitions in the current foundation.
- Common Gear progresses from Level 1 through Level 5.
- A Common Gear Box reveals exactly three server-rolled Level 1 Common pieces.
- Each upgrade combines two matching items at the target's current level into one newly identified next-level item. Both input identities are consumed, inventory count falls by exactly one, and an equipped target transfers its slot to the result. Upgrade request IDs are replay-safe. The direct Gold charge is 0.5, 1, 2, or 4 hours of current raw regular-city Gold production for Levels 1→2 through 4→5. A complete Level 5 path therefore represents 16 Level 1 copies and 16 cumulative raw-production hours.
- Common Gear bonuses by level are 0.25%, 0.50%, 0.80%, 1.15%, and 1.50%.
- Current Box sources include weekly daily-login milestones, completion of all three Daily Missions, the configured Relic Camp bonus chance, and one 1-billion-Gold purchase per UTC day.
- Gear inventory, Box opening, purchasing, equipping, and upgrading are server-authoritative and must not be writable through ordinary profile saves.
- Equipped bonuses apply additively to their applicable base systems.
- Common Gear bonuses stack with skills and may raise an effective result above the skill-only cap where the implemented rule allows. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Gear Effects appear in battle reports. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.

### Confirmed season persistence

The following Common Gear data persists across seasons/resets:

- Owned Common Gear
- Equipped Common Gear
- Common Gear levels
- Common Gear upgrades
- Associated Common Gear progression that belongs to the Gear system
- Unopened Common Gear Boxes

The reset initializer now applies an explicit Common Gear persistence allowlist covering unopened Boxes, instances, equipped slots, levels/upgrades, and new-item markers. Normal Bag consumables, timed item effects, and purchase cooldowns still reset. Emulator coverage verifies the preserved Gear can be viewed, equipped, unequipped, upgraded, and opened after the new-generation starting-city claim. **Status:** `IMPLEMENTED — PENDING SCHEDULED RESET VERIFICATION`.

### Planned progression

- Higher Gear rarities and deeper progression are `PLANNED` after the Common foundation is stable.
- Exact rarity names, power curves, sources, duplicate requirements, and protection against unchecked power growth are **NEEDS VERIFICATION**.

### Needs verification

- Complete Common Gear definition table, upgrade material quantities, Gold costs, bonus values, rounding, slot restrictions, duplicate handling, and reset field allowlist.
- Exact deployed production reset behavior; repository inspection alone does not prove which server code is deployed.

## 12. Daily Missions & Achievements

### Daily Login

- Daily Login follows the current UTC calendar month rather than a fixed 30-day loop. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Each month distributes a documented total budget of 111 hours of Gold production, 111 hours of troop production, and six rotating items.
- Missed days pause progress, at most two earned rewards wait for collection, and unclaimed rewards expire at month rollover.
- Current reward tables and production snapshots must be verified before balance changes.

### Daily Missions

- Three missions are assigned at 00:00 UTC. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Missions are server-locked, capacity-scaled, and based on validated gameplay events.
- One unfinished mission may be rerolled each day.
- Rewards are claimed manually and remain visibly completed until reset.
- Production-scaled rewards use raw production.

The verified `origin/main` reward values are 0.5 production hour for Easy, 1 hour for Medium, and 2 hours for Hard. Camp-capture and Clan Gift special missions always use 0.5 hour. Production rewards are locked when missions are generated from the then-current raw production snapshot. A non-special Hard mission has a 20% item-substitution chance subject to the configured price constraint. Claiming all three daily missions grants one Common Gear Box.

### Achievements

- Crownlands currently has 40 seasonal Achievements. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Achievement presentation supports scrolling and prioritizes claimable information in the corrected interface.
- Production-scaled Achievement rewards use raw production.
- The earlier proposed count of 50 is superseded.

**Confirmed season rule:** Achievement progress, completed state, claimed state, unclaimed rewards, and completion history reset each season. No Achievement completion record persists as permanent progression or prestige history.

The verified `origin/main` production-reward hours are 0.5 for Easy, 1 for Medium, 2 for Hard, 3 for Very Hard, and 6 for Prestige. Achievement production rewards are locked when the completion event is processed using the stored global-stat base rates, not when the monthly achievement set is generated. The achievement cycle identifier combines the reset generation and UTC year-month, and unclaimed rewards expire at monthly rollover.

### Needs verification

- Complete mission pool, scaling ranges, reroll exclusions, all 40 Achievement definitions, category behavior, and production runtime parity for the verified reward and reset logic.

## 13. Leaderboards & Rankings

### Current state

- Crownlands provides a Top 100 Kingdoms leaderboard based on King Power. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Crownlands provides a Top Clans leaderboard based on combined clan strength. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- Public ruler and clan identity are part of ranking presentation.

### Confirmed season history policy

- Active Kingdom and Clan leaderboard entries reset each season.
- At season finalization, the final Kingdom Top 100 and final Clan leaderboard must be locked and preserved as read-only historical records.
- Historical leaderboard records do not contribute power, resources, eligibility, or progression in later seasons.
- Final-season locking and archival are `PLANNED`; they are not currently implemented or LIVE.

### Verified `origin/main` implementation

- King Power uses implementation version 11.
- Every controlled troop contributes 2 power. The count includes city and Camp garrisons, marching troops, stationed reinforcements, and committed rally troops, with implementation safeguards against double-counting.
- Replacement power is `floor(objective-supported sustainable base troop production per hour × 12)`.
- Defensive power is `floor(max(0, total defense - garrison troop count) × 0.25)`.
- Total King Power is army power plus replacement power plus defensive power. Territory, city-count, Gold-production, and separate Stronghold score fields contribute zero in the current formula.
- Personal skills, Common Gear, and timed items are excluded from infrastructure power. Objective production and defense benefits are included.
- Kingdom entries are generation-scoped under the current reset generation, filtered to the current generation/world, sorted by King Power descending, and limited to 100.
- Clan entries are generation-scoped and sorted by total King Power descending, limited to 100.
- Player entries are queried from the current realm-storage board with reset, world, and realm-shard authorization constraints, sorted by authoritative King Power descending, and limited to 100. Client-local unpublished estimates must not be inserted into or rerank the saved global results.
- No explicit secondary tie-break, final leaderboard lock, final-rank rewards, historical archive, or automatic season rollover was found.

These are verified repository facts for commit `27105ae...`; exact deployed backend data and runtime parity remain **NEEDS VERIFICATION**.

### Needs verification

- Production runtime parity for King Power version 11 and live leaderboard contents.
- Update frequency, tie-breaking, eligibility, cheater removal, inactive-player treatment, caching, season-finalization trigger, archive fields and retention, final-rank rewards, and privacy controls.

## 14. Chat, Social & Announcements

### Chat

- Global Chat and Clan Chat are server-authoritative live systems. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- The send cooldown remains three seconds. Global messages have a rolling 24-hour visible lifetime measured from authoritative server creation timestamps. Initial queries, live updates, open-client expiry timers, pagination, reconnects, and cached views exclude expired messages; a five-minute backend cleanup removes expired Global messages independently of database TTL deletion.
- Clan messages have no automatic age-based expiry and remain until explicitly deleted through the existing authorized deletion/moderation flow. Shared message TTL is disabled, and the coordinated release migration removes legacy Clan expiry fields while preserving message contents and access controls. The same migration removes Global messages already older than 24 hours. These confirmed rules replace the previous shared seven-day policy; deployment evidence belongs in the coordinated release record.
- Clan Chat visibility follows clan membership and authorization.
- Chat must not allow client-side impersonation or unauthorized clan-channel access.

### Social identity

- Player flags, profiles, clan identity, public leaderboard identity, and clan heraldry form the current social identity layer.
- Player name, complete player flag design, account creation date, and notification preferences persist across seasons.
- Clan ID, name, tag, heraldry, member roster, and member roles persist across seasons.
- Authentication and active-session data may carry forward as technical account state, but they are not seasonal progression or player customization.
- Current reset source preserves the confirmed player identity fields and transactionally carries clan identity, membership, roster, and roles into the new generation while resetting clan-season activity.
- Player Flag save reliability after the reported production issue is **NEEDS VERIFICATION** through a current production smoke test.

### Announcements and moderation

- Profanity filtering, spam controls beyond current rate limits, message reporting, moderator workflows, sanctions, announcement authoring, scheduled announcements, and audit retention are **NEEDS VERIFICATION**.
- Earlier discussion deferred several moderation features. Deferred discussion is not a confirmed rejection or permanent rule.

## 15. Seasons, Resets & Persistence

### Confirmed design policy

The persistence allowlist is explicit. The following are intended to persist across seasons/resets:

1. Player name
2. Complete player flag design
3. Account creation date
4. Notification preferences
5. Clan ID, clan name, clan tag, and clan heraldry
6. Clan member roster and each member’s current Leader, Officer, or Member role
7. Owned Common Gear
8. Equipped Common Gear
9. Common Gear levels
10. Common Gear upgrades
11. Associated Common Gear progression that belongs to the Gear system
12. Unopened Common Gear Boxes
13. Read-only final-season Kingdom Top 100 and Clan leaderboard archives

Authentication and active-session data may carry forward as technical account state. They are not part of the player-facing persistence allowlist and confer no seasonal progression.

Normal consumable Bag items do not persist.

Hero level, Hero XP, unspent skill points, acquired skill upgrades, and saved skill presets reset each season.

Achievement progress, completed/claimed state, unclaimed rewards, and completion history reset each season.

Active Kingdom and Clan leaderboards reset each season. Their locked final-season archives persist as read-only history and do not count as active progression.

Clan Treasury balance and ledger, seasonal statistics, weekly-goal progress, rallies, reinforcements, donations/gifts activity, and world-objective ownership reset each season.

Normal world progression resets unless another system is explicitly added to the persistence allowlist.

The earlier broad statement that “items persist” is superseded by this allowlist.

### Confirmed monthly realm topology

- Every player in an active monthly generation belongs to one shared realm and may interact with every other player in that generation. A 50-player population split is not permitted.
- The implementation may retain `shard_0001` as an internal canonical storage partition so existing generation-scoped paths, rules, and indexes remain isolated. It does not represent a separate player realm, and no `shard_0002` may be opened when player 51 joins.
- New and returning players without current-generation world progression claim one server-authoritative starting city on an active, admitting New Lands map before gameplay subscriptions open. The 25-map Core is excluded from starting placement.
- Starting placement selects among the least-populated admitting New Lands maps with random tie breaking and remains replay-safe. Each New Lands map contains 40 neutral regular cities; when one reaches 20 neutral cities, it closes to new-player admission and the next two cardinally connected maps are prepared, verified, and activated together in clockwise order.
- Scheduled work, leaderboards, clans, activity, combat, armies, reports, presence, and world reads execute once against the shared current-generation partition. Archived generations remain inaccessible and inactive but intact for rollback and historical retention.
- Monthly generation and world identifiers remain `realm-YYYY-MM` and `main-realm-YYYY-MM`. Realm generation isolation remains mandatory even though population sharding is removed.

**Status:** The shared-realm and Core-expansion foundation is deployed. Repository activation controls are armed for September 2, 2026 at 00:00 UTC; production must continue serving the legacy realm until that boundary. The scheduler and first eligible client handshake must seed and verify all 25 Core maps plus the first New Lands map before the current-realm pointer may change.

### Implementation state

- Season/reset persistence policy is confirmed design.
- One shared monthly realm and removal of the 50-player split are implemented. The temporary five-island starter placement remains the legacy fallback only and is not used after the scheduled Core-expansion activation.
- The approved reset target is the 25-map Core, a complete 24-map first ring containing five maps on each cardinal side plus four corner maps, and later New Lands layers that begin at the north-center cardinal entrance and allocate clockwise. A layer may never begin on a corner because inter-map roads connect only north, east, south, and west. Every player-facing map label uses a unique medieval-authentic place name. Each New Lands map starts with 40 neutral NPC cities; at 20 remaining neutral cities on the current admitting map, the next two maps activate for incoming players. Deterministic Layer 3+ generation, authoritative routing, live client discovery, reset-readiness gating, and retry-safe activation are merged and deployed in held production build `8d80b6a...`; activation remains scheduled and fail-closed.
- Production reset enforcement for the explicit player/clan/Common Gear allowlist is `IMPLEMENTED — PENDING SCHEDULED RESET VERIFICATION`.
- The current executable reset path and reset emulator preserve flags, clans, and Common Gear while resetting world and seasonal progression. Exact post-boundary production behavior remains to be verified after activation.
- The production reset has not been verified as executed under this policy.

### Verified current reset behavior

The reset path uses explicit Common Gear and clan persistence helpers around `createFreshResetPlayerProfile`, while the fresh profile replaces seasonal and world progression.

| Data/system | Confirmed intended policy | Inspected `origin/main` behavior | Result |
|---|---|---|---|
| Player name | Persist | Preserved | Matches design in source |
| Complete player flag design | Persist | Preserved and normalized | Matches design in source |
| Account creation date | Persist | `createdAt` is carried forward | Matches design in source |
| Notification preferences | Persist | Carried forward when present | Matches design in source |
| Authentication and active-session state | May carry forward as technical state | Selected authentication fallbacks and active-session state are carried forward | Technical carry-forward; not progression |
| Clan ID/name/tag/heraldry, roster, membership, and roles | Persist | Transactionally migrated to the new generation; invalid/incomplete records fail without partial reset writes | Matches design in source and emulator coverage |
| Clan Treasury/ledger, seasonal statistics, goals, rallies, reinforcements, donations/gifts activity, and objective ownership | Reset | Rebuilt or cleared for the new generation | Matches the reset direction in source; the generation-scoped Treasury implementation is pending merge and authorized deployment |
| Owned Common Gear | Persist | Preserved through the explicit Gear reset helper | Matches design in source and emulator coverage |
| Equipped Common Gear | Persist | Preserved with normalized slot state | Matches design in source and emulator coverage |
| Common Gear levels/upgrades/progression | Persist | Instance and upgrade state is preserved | Matches design in source and emulator coverage |
| Unopened Common Gear Boxes | Persist | Box count is preserved | Matches design in source and emulator coverage |
| Normal Bag consumables | Reset | Counts reset to zero; effects and purchase cooldowns reset | Matches design in source |
| Hero progression and skill presets | Reset | Hero returns to Level 1/XP 0/skill points 0; skill upgrades and presets return to defaults | Matches design in source |
| Achievement progress, state, rewards, and history | Reset | Achievement cycles are reset-generation/month scoped; no permanent completion archive was found | Matches design in source |
| Active Kingdom and Clan leaderboards | Reset | Entries are reset-generation scoped | Matches the active-reset portion of the design |
| Final-season leaderboard archives | Persist read-only | No final lock or historical archive implementation was found | `PLANNED` |
| Normal world progression | Reset | Gold, cities, reports, Camps, armies, and related generation state are rebuilt/reset | Matches the default-reset rule unless a field is later allowlisted |

The initializer also carries forward selected authentication display/email/photo fallbacks and active-session state. These are technical implementation facts, not additions to player-facing seasonal progression.

The reset emulator now verifies preserved player identity, clan identity/roster/roles, and Common Gear together with reset reports, normal consumables, Hero progression, skills, resources, cities, and other seasonal world state.

### Verified generation/versioning behavior

- Current release ID: `crownlands-2026-09-monthly-sharded-realms-v1`.
- Current reset generation: `fresh-2026-07-26-server-reset`.
- Current world ID: `main-fresh-2026-07-26-server-reset`.
- Current API contract hash: `86fc7b17ba028d02ee0ef6131f291f6673d5fdef4178a3463e04cf220bc35dbd`.
- Client/server admission checks gate release ID, reset generation, and world ID; the client also checks the API contract through realm information.
- The armed configuration advances to `realm-2026-09` / `main-realm-2026-09` at September 2, 2026 00:00 UTC. `activateMonthlyRealm` runs at 00:00 UTC daily, while authenticated realm initialization also reconciles the pointer. Both paths use the same fail-closed Core readiness gate.
- Achievement cycles are monthly within a reset generation, using `{resetGeneration}_{YYYY-MM}`.

The held Core-expansion Functions, rules, indexes, and web client were deployed from build `8d80b6a...` before the activation controls were armed. Exact post-reset production execution remains **NEEDS VERIFICATION** until the scheduled boundary passes.

### Operational gate

- Production has a daily Firestore backup schedule with 35-day retention. Backup `3fb979ab-34ff-4c63-ab8a-abe49e8fd7bd`, snapshot time August 31, 2026 at 22:10:07 UTC, was verified `READY` and expires October 5, 2026.
- The previous realm generation remains intact and inaccessible after the pointer switch. Pointer rollback is the first recovery action; full database restore remains available from the verified managed backup if pointer rollback is insufficient.

### Needs verification

- Season length, start/end time, automatic versus manual reset, player notice period, leaderboard finalization trigger, tie handling, archive fields/retention, rewards, legacy records, rollback, and exact production reset procedure.
- Authenticated production evidence for the deployed reset implementation and any administrative migration code or data process outside the repository.

## 16. UI/UX Standards

### Confirmed standards

- The game must remain readable and operable in landscape mobile layouts and on PC.
- Critical actions, timers, troop counts, resource values, reports, warnings, and state changes must have sufficient contrast and must not depend on decorative texture alone.
- Medieval presentation should use parchment, wood, leather, rope, wax, stone, and worn metal without sacrificing clarity.
- Modal content must remain reachable on supported short landscape screens.
- Touch and pointer targets must not overlap or retarget to unrelated controls.
- Map switching must not open Shop or Bag unintentionally. The current fix is `LIVE — ALL PUBLISHED CHANNELS`.
- Movement HUD, Reports, Chat, and modal layers must stack predictably.
- Reduced-motion and performance-sensitive behavior must be respected where animation exists.

### Confirmed interaction performance requirements

- Pending action feedback must appear promptly without changing server authority, eligibility, costs, cooldowns, or intended march duration. Presentation failures must not prevent a request from completing or leave a request lock stuck.
- Pinch zoom applies its camera transform in the same coalesced animation frame. Lifting one finger continues the gesture as a drag; cancellation must not become a city or action tap.
- Chat updates preserve unchanged message rows, focus, and reading position. Hidden previews avoid presentation work; expiry, moderation, channel access, unread indicators, and reconnect behavior remain authoritative. A queued close event cannot collapse newly reopened chat.
- Shop countdowns update their text without replacing the item controls. Initial loading overlaps independent saved-state reads while retaining the skill-migration-before-profile dependency. Map readiness requires verified map art and city data, but does not wait for background presence delivery.
- On returning to the foreground, fresh authoritative economy is presented without waiting for unrelated presence and roster refreshes. Existing synchronization, retries, and stale-account/region guards remain in force.
- With no explicit animation preference, sustained frame pressure may reduce decorative effects and sustained recovery may restore them. Explicit Full, Reduced, and Off settings and the system reduced-motion preference take precedence.
- Performance evidence must distinguish controlled browser/emulator results from production measurements. Local diagnostics retain only a bounded set of operation names, durations, and outcomes, without request payloads, identities, or results.

Implementation and measurement detail: [Responsive gameplay performance review](./RESPONSIVE_GAMEPLAY_PERFORMANCE.md). Release-channel verification is recorded in the release handoff; these requirements alone do not establish deployment.

- Route previews must preserve useful in-flight results for unchanged selections, reflect acknowledged speed-modifier changes, and avoid unnecessary write locks. Actual launch remains authoritative for current eligibility, resources, route, modifiers, and duration.
- An interrupted scout or army response must retain its original request ID across retries and reloads. Reconnect recovers accepted orders independently by reading canonical receipts; it must never automatically send an unconfirmed action. Completed orders refresh their results without creating another march or charge.
- Account and realm changes invalidate outstanding results. Failed foreground report or city reads must trigger the existing recovery retries, while successful unchanged snapshots count as synchronized. Presence delivery must not prevent prompt confirmation recovery.

Implementation and controlled evidence: [Server response and connection reliability](./SERVER_CONNECTION_RELIABILITY.md). Physical phone checks were excluded from this update by the user; deployment status must still be verified separately.

### Current presentation status

- Broad medieval UI theme and readability corrections: `LIVE — ALL PUBLISHED CHANNELS`.
- Inner Castle Profile entry, current Stronghold/Citadel contrast, scalable Shop presentation, reworked Bag, Clan Heraldry v2, and latest map-touch guard: `LIVE — ALL PUBLISHED CHANNELS`.
- UI polish remains ongoing: `IN DEVELOPMENT`.

### Needs verification

- Formal contrast target, keyboard-navigation requirements, screen-reader scope, localization, minimum supported resolution, text-scaling behavior, and accessibility acceptance criteria.

## 17. Mobile Landscape & PC Requirements

### Confirmed requirements

- The game is landscape-oriented on mobile. Portrait gameplay is not a supported target requirement.
- A landscape-orientation prompt may block or redirect unsupported portrait play.
- PC/browser play is supported.
- PWA installation and launcher support are live where the browser/platform supports them.
- Public informational pages may remain portrait-responsive; the landscape-only rule applies to the game experience.

**Status:** `LIVE — ALL PUBLISHED CHANNELS` for the landscape/PC/PWA foundation.

### Superseded direction

- Earlier portrait Gear QA does not establish portrait gameplay support and is superseded by the landscape game requirement.

### Needs verification

- Supported browser/version matrix, minimum device performance, minimum viewport, tablet behavior, notch/safe-area requirements, input methods, memory budget, real-device regression suite, and offline/PWA limitations.

## 18. Art & Medieval Visual Direction

### Authority

The [Crownlands Art Bible](./CROWNLANDS_ART_BIBLE.md) is the detailed visual authority and is incorporated by reference. If this section and the Art Bible conflict, record the conflict and obtain an explicit design decision before changing either source.

### Confirmed direction

- Grounded 14th–15th century frontier-kingdom character.
- Rough stone, timber framing, limewash, thatch, worn iron, leather, rope, parchment, wax, and hammered metal.
- Earthy ochre, rust, charcoal, moss, faded blue, and burgundy palettes.
- Natural light, readable silhouettes, functional fortification, and lived-in construction.
- Avoid neon, glossy game-show surfaces, generic high-fantasy excess, interchangeable Gothic decoration, and unreadable texture.
- Regional and objective art should communicate gameplay role at practical map sizes.
- Region names and world language should be medieval-authentic and consistent with Crownlands.

**Status:** Established direction, with the current migrated visual foundation `LIVE — ALL PUBLISHED CHANNELS` and continuing polish `IN DEVELOPMENT`.

### Needs verification

- Final art production pipeline, asset licensing register, source-file ownership, generation provenance, animation style guide, audio art direction, and approval criteria for new regional art.

## 19. Backend, Performance & Scalability

### Current verified foundation

- Crownlands is online-first and uses Firebase Authentication, Firestore, and callable Functions for shared gameplay authority. **Status:** `LIVE — ALL PUBLISHED CHANNELS`.
- The audited release contract exposes 102 callable operations and the API contract hash recorded in FM-2. These are implementation snapshots, not permanent design requirements.
- Authoritative mutations must be validated on the server.
- Multi-step economic and batch operations should be atomic or idempotent so retrying cannot duplicate charges, rewards, or launches.
- The current world is connected across 20 web regions; scaling work must preserve route parity, state integrity, and acceptable crowded-map performance.

### Scalability direction

- Pending Core and dynamic region expansion are `IN DEVELOPMENT`.
- World expansion must mature together with connection rules, player placement, capacity controls, backend performance, and rollback safeguards.

### Needs verification

- Service-level objectives, concurrent-player targets, per-region capacity targets, query budgets, latency budgets, callable quotas, indexing strategy, observability, alerting, cost budgets, rate limits, degradation behavior, incident response, backup success monitoring, and demonstrated restore time.

## 20. Security / Anti-Exploit Requirements

### Confirmed requirements

- The server, not the client, determines authoritative resources, ownership, movement, combat, rewards, Gear, clan access, and protected actions.
- Authentication identity must be bound to every protected operation.
- A client must not be able to alter Gear inventory, Box outcomes, equipment, upgrades, resource balances, or clan permissions through ordinary profile saves.
- Economic transactions, batch scouts, regroup actions, donations, purchases, claims, and rewarded-ad grants must resist replay, retry duplication, partial charging, and race conditions.
- One active browser session per account is part of the audited current behavior. **Status:** `LIVE — ALL PUBLISHED CHANNELS`; exact enforcement should be verified before modification.
- Release/backend parity must be checked for security-sensitive changes such as player flags and server rules.
- Sensitive anti-exploit details should be documented for developers without exposing actionable abuse instructions in player-facing material.

### Needs verification

- Formal threat model, App Check production status, device attestation, bot/automation controls, abuse rate limits, administrator permissions, audit-log retention, secret management, dependency scanning, vulnerability response, account recovery, sanctions, and data-deletion workflow.

## 21. Testing & QA Standards

### Existing foundation

- The current `origin/main` repository contains static and emulator-backed validators for the audited economy, scalable Shop, Camps, pickups, Daily Missions, Achievements, Common Gear, objective bonuses, King Power, leaderboards, and reset-gate behavior, in addition to broader combat, city, clan, rally, chat, security, release-artifact, and UI coverage. This is verified repository evidence, not player-facing LIVE status.
- Production artifacts are validated for file inventory, size, asset integrity, release metadata, and channel-specific path behavior.
- Balance-affecting changes must run the season-balance audit and relevant configuration-backed tests.
- Visual changes must be checked at supported desktop and landscape-mobile viewports.
- Server-authoritative changes require emulator or equivalent integration coverage, not client-only validation.

The August 24 implementation verification did not execute tests or builds because the task was strictly read-only and repository scripts could generate artifacts. Test presence and assertions were inspected; passing CI/runtime status remains **NEEDS VERIFICATION**.

### Confirmed risk-based release validation policy

- Local `prepare-pr` and GitHub Actions must use one deterministic classifier over the complete `origin/main...HEAD` branch difference. Classification of only the latest commit is prohibited.
- **Fast** is limited to non-operational documentation, wording in explicitly listed static public pages, CSS, crawl metadata, and non-map visual assets. It requires syntax/lint, applicable focused validators, production-client build and artifact validation, and focused desktop plus landscape-mobile browser smoke.
- **Standard** is limited to explicitly allowlisted isolated frontend behavior that cannot affect multiplayer authority, stored gameplay state, realm selection, economy, combat, progression, resets, or deployment contracts. It requires the complete static gate, production-client build and artifact validation, and focused desktop plus landscape-mobile browser smoke.
- **Full** requires the complete static gate and every automatically discovered multiplayer emulator gate. It is mandatory for Functions, Firestore rules/indexes, Firebase clients/config, authoritative or generation-scoped calls, login or realm admission, reset logic, gameplay logic, economy, combat, maps/routes, clans, progression, scheduled jobs, release/deployment contracts, package or validation infrastructure, production-data-affecting work, unknown paths, and any ambiguous change.
- The highest-risk file determines the branch tier. Documentation, CSS, or other lower-risk files cannot disguise or downgrade a critical change, including a critical rename.
- `validation:full` is an upgrade-only local/PR override. Manual selection and labels must never downgrade a Full classifier result.
- The required GitHub checks remain `Static validation`, `Multiplayer emulator validation`, and `Validate`. When Fast or Standard safely skips emulators, the multiplayer check must succeed with an explicit not-required explanation.
- Pushes to `main`, manual workflow runs, and the scheduled nightly validation always run Full.

### Verified test gap

`tools/validate-king-power.js` hardcodes three troops per city progression point in its local calculation, while executable economy configuration uses ten. The validator can therefore disagree with live King Power replacement-power calculation and must be corrected with the implementation work. Reset emulator coverage also codifies clan reset and does not cover the confirmed Common Gear/clan persistence policy.

### Release acceptance

Before a status becomes LIVE:

1. Inspect current source and affected tests.
2. Run the proportionate static and integration suites.
3. Build and validate the production artifact.
4. Deploy only when authorized.
5. Verify the release manifest/build ID.
6. Smoke-test affected production behavior.
7. Update the Release Channel Matrix.

### Needs verification

- Acceptable flaky-test policy, production smoke ownership, supported real-device matrix, accessibility QA, load-test thresholds, rollback drills, backup restore drills, and defect severity/release-blocking policy.

## 22. Git, PR & Deployment Workflow

### Required workflow

1. Work defines and confirms intended behavior in this specification.
2. A Codex implementation prompt must instruct Codex to inspect the current repository before modifying anything.
3. Implementation occurs on an appropriately scoped branch.
4. Relevant automated and manual tests must pass.
5. The change is reviewed against this specification.
6. Commits and PRs record implementation evidence.
7. Merge does not imply deployment.
8. Deployment occurs only with explicit authorization.
9. Production build and smoke evidence determine LIVE status.
10. itch.io is updated to a verified production-compatible artifact as a separate channel action.
11. This specification and its deployment ledger are updated after verified results.

### Safety rules

- Preserve unrelated user changes and dirty worktrees.
- Do not reset, overwrite, or deploy without authorization.
- Do not infer Firebase schema, functions, files, APIs, or hosting architecture from an old prompt.
- A Codex completion report must be compared against intended design, tests, deployment evidence, remaining work, regressions, and specification impact.

### Current workflow issues

- The historical August 24 audit used a local working branch behind GitHub `main`; that audit inspected the exact remote Git object without mutating the user's worktree. The August 25 Rally release audit used an isolated, current worktree.
- The rebuilt local `dist`, canonical game production, and public itch.io iframe match build `fdf326a...`. The public itch upload is `#19037216`; the locally retained 279-file ZIP has SHA-256 `973137A3CC90023AF9340AFFC2D8B40FBA7A93B8DCE97F9FD0F9D1E9892A2C2D`.
- Exact deployment ownership of the primary-domain public pages and the target parity interval between web and itch.io are **NEEDS VERIFICATION**.

## 23. Current Development Status

Status verified through August 31, 2026.

| System | Status | Notes |
|---|---|---|
| Core city/economy/army/combat game | `LIVE — ALL PUBLISHED CHANNELS` | Web and the public itch.io iframe are exact client build `fdf326a...`. |
| 20-region connected world | `LIVE — ALL PUBLISHED CHANNELS` | Five regions retain placeholder numeric names. |
| Camps, Strongholds, Crown Citadel | `LIVE — ALL PUBLISHED CHANNELS` | Current contrast fixes are present on both channels. |
| Clans and ordinary Rally foundation | `LIVE — ALL PUBLISHED CHANNELS` | Web and itch.io now share the corrected lifecycle. |
| Ordinary Rally lifecycle correction | `LIVE — ALL PUBLISHED CHANNELS` | 2–20 participants, deterministic settlement and safe returns, plus automatic complete-army recall when the creator leaves, is removed, or changes clans. Holding Tower Rally rules remain separate and are implemented but not live. |
| Global and Clan Chat | `LIVE — ALL PUBLISHED CHANNELS` | Moderation expansion is unresolved. |
| Daily Login, Daily Missions, 40 Achievements | `LIVE — ALL PUBLISHED CHANNELS` | Reward calculations are verified in source; complete definitions and production runtime parity remain open. |
| Common Gear foundation and upgrades | `LIVE — ALL PUBLISHED CHANNELS` | Future rarities are planned. |
| Scalable Shop pricing | `LIVE — ALL PUBLISHED CHANNELS` | Present in both current channel builds. |
| Reworked/stacked Item Bag | `LIVE — ALL PUBLISHED CHANNELS` | Present in both current channel builds. |
| Clan Heraldry v2 | `LIVE — ALL PUBLISHED CHANNELS` | v1 compatibility remains; v2 presentation is available on both channels. |
| Hero reward curve, city XP model v2, and instant city upgrades | `LIVE — ALL PUBLISHED CHANNELS` | Published channels now use descendant build `fdf326a...`; authenticated production mutation smoke remains pending. |
| Hero level-up Gold 27-hour endgame ceiling | `IN DEVELOPMENT` | Levels 2-116 remain unchanged; Level 117 is the first reduced reward. Coordinated backend, web, and itch.io deployment is required before this balance is live. |
| Unified skill controls, free live refunds, free Reset Skills, and Skills readability update | `LIVE — ALL PUBLISHED CHANNELS` | Web and the public itch.io iframe now use exact client build `fdf326a...`; authenticated mutation smoke remains pending. |
| Session heartbeat timeout and lifecycle recovery | `LIVE — ALL PUBLISHED CHANNELS` | Web and itch.io bound an individual heartbeat response at 15 seconds and ignore late responses from stopped lifecycle generations. Static, all 33 emulator files, the 120-session realm admission case, and direct public asset checks passed; authenticated interrupted-connection recovery remains manual QA. |
| Holding Towers and Clan Treasury | `IMPLEMENTED — PENDING MERGE AND AUTHORIZED DEPLOYMENT` | Current-Core-only implementation covers the four Towers, attributed garrisons, target-specific Rallies, scouting, walls, repairs, Veil, Treasury, reset/departure handling, security, and current-map reconciliation. It is not live. |
| Pending 5×5 Core | `DEPLOYED — SCHEDULED ACTIVATION` | Held production build `8d80b6a...` contains the complete fail-closed Core seed/readiness path; repository activation is scheduled for September 2 at 00:00 UTC. |
| Production reset/persistence enforcement | `IMPLEMENTED — PENDING SCHEDULED RESET VERIFICATION` | Explicit identity, clan, and Common Gear persistence is covered by emulator tests; a READY managed backup and pointer rollback path are verified. |
| Dynamic map expansion | `DEPLOYED — SCHEDULED ACTIVATION` | Held production build includes deterministic Layer 3+ growth and live client discovery; post-boundary production verification remains. |
| Seasons | `PLANNED` | Cadence and reward policy unresolved. |
| More Gear rarities | `PLANNED` | Detailed rules unresolved. |
| Clan Wars / regional control / more world events | `PROPOSED` or roadmap-level `PLANNED` only | No authoritative detailed rules. |

## 24. Known Issues / Technical Debt

### Verified current issues

- The historical August 24 audit branch was behind GitHub `main`; the August 25 Rally release audit used an isolated branch containing current `origin/main`.
- The locally rebuilt `dist`, web production, and the public itch.io iframe represent exact build `fdf326a...`. The current itch artifact is upload `#19037216`; previous locally retained ZIPs remain historical artifacts.
- Deployment provenance, the generated release manifest, and the post-deploy inventory verify all 109 Node.js 22 Functions were refreshed from clean build `291e5657...` with shared Firebase source hash `322ab24b...`. `adjustSkillLevels` is active and the obsolete skill-state trigger is absent. Authenticated `getRealmInfo`, skill, and city mutations were not performed.
- The primary-domain `how-to-play.html` still documents superseded three-ruler Rally behavior even though corrected source is merged and published on the canonical game host. The public-site deployment owner and refresh path remain **NEEDS VERIFICATION**; no manual Netlify deployment was authorized in this audit.
- The legacy direct `https://playcrownlands.com/play/` route serves the game shell while root game assets on that host return 404. Normal public Play actions point to the working canonical `https://game.playcrownlands.com/play/` route.
- Web roadmap copy contains an internal 20-versus-15-region contradiction.
- The descriptive release ID remains dated August 2 despite newer builds.
- The itch.io Butler `html5` channel and latest-build API remain labeled `2026-08-30-city-list-off-map-ownership-3390c83c`, while the verified public iframe is web upload `#19037216` at build `fdf326a...`. This is release-metadata debt, not a playable-build mismatch.
- Five web regions use placeholder numeric names.
- Starting-resource documentation conflicts with the current source. `origin/main` initializes 100 Gold and 200 troops; deployed runtime parity remains unverified.
- Production Player Flag saving needs a current smoke test.
- Holding Towers/Clan Treasury are implemented on a synchronized feature branch but remain pending merge, authorized deployment, and authenticated production verification. Historical PR #159 remains archived and must not be merged.
- The latest verified managed Firestore backup is `READY`, and pointer rollback is implemented by retaining the previous realm generation. A full production restore has not been rehearsed during this release window.
- Authenticated browser smoke testing remains manual because the local in-app browser-control runtime was unavailable during the reset-arming audit.
- The King Power validator uses a hardcoded troop-production factor of 3 while executable economy configuration uses 10.
- The Codex implementation audit reported War Drums at 5%, but executable economy configuration sets 30%; 5% is only a fallback. The specification records 30% as the current repository fact.
- No automatic season-generation advance, final leaderboard lock/rewards, or historical leaderboard archive was found. Final-season leaderboard archival is now confirmed design with status `PLANNED`.

### Technical debt requiring current-source confirmation

- Main runtime concentration in large client files and accumulated style overrides.
- Potential baseline issues involving line endings and specific validators.
- Transient emulator timing/port failures reported during development.
- Duplicated or competing readability/contrast overrides.

These source-level items are **NEEDS VERIFICATION** against current `main` before remediation is planned.

## 25. Planned Features / Roadmap

### Confirmed active direction

- Complete review and validation of the clean synchronized Holding Tower implementation, then perform an explicitly authorized rollout with current-Core-only production verification. Current status: `IMPLEMENTED — PENDING MERGE AND AUTHORIZED DEPLOYMENT`.
- Prepare the pending 5×5 Core and safe reset path. Current status: `IN DEVELOPMENT`.
- Develop scalable outward map expansion. Current status: `IN DEVELOPMENT`.
- Define and deliver Seasons using the persistence policy in Section 15. Current status: `PLANNED`.
- Implement final-season locking and read-only archives for the Kingdom Top 100 and final Clan leaderboard. Current status: `PLANNED`.
- Expand Gear beyond the Common foundation after the base system is stable. Current status: `PLANNED`.
- Replace placeholder region identifiers with confirmed medieval-authentic names. Naming decision: `NEEDS VERIFICATION`.
- Maintain itch.io compatibility and restore channel parity after web releases. This is a release-policy requirement, not a gameplay feature.

### Roadmap concepts not yet authoritative

- Broader Clan Wars
- Regional-control scoring
- Additional scheduled or reactive world events
- Additional animation and sound systems
- Deeper objective history

These remain `PROPOSED` or roadmap-level `PLANNED` directions. Their detailed mechanics are not authoritative.

### Needs verification

- Priority order, milestones, owners, target dates, dependencies, release trains, and go/no-go gates.

## 26. Open Design Decisions

### Highest-priority unresolved design decisions

1. Final medieval-authentic names for Regions 16, 17, 19, 21, and 22.
2. Season length, reset schedule, notice period, end-of-season resolution, and rewards.
3. Leaderboard tie-breaking, eligibility, season rewards, finalization trigger, archive fields, and archive retention.
4. Formal monetization principles, rewarded-ad frequency/limits, and whether premium products or currency are permitted.
5. Chat moderation, player reporting, announcements, sanctions, and administrator policy.
6. Design rules for higher Gear rarities and protection against unchecked power growth.
7. Final triggers and player-facing behavior for dynamic world expansion.
8. Whether roadmap concepts such as Clan Wars and regional control should become committed features.

### Highest-priority verification decisions

1. Confirm through production runtime/deployment evidence whether the deployed new-player path uses the repository-verified 100 Gold and 200 troops.
2. The maximum intended web/itch.io release lag and channel-parity service level.
3. Current production Player Flag save behavior.
4. Exact deployed Functions parity for King Power version 11, production/reward configuration, and reset logic.
5. Backup completion and proven restore readiness before a production reset.

---

# Appendix A — Consolidated Status Register

| Status | Major systems/features |
|---|---|
| `LIVE — ALL PUBLISHED CHANNELS` | 20-region world, core game, cities, economy, movement, combat, scouting, Camps, Strongholds, Citadel, clans, corrected ordinary Rally lifecycle, Global/Clan Chat, Daily Login, Daily Missions, 40 Achievements, Common Gear, Profile Inner Castle, Stronghold/Citadel contrast, scalable Shop, reworked/stacked Bag, Clan Heraldry v2, current Shop/map guards, Hero reward curve, city XP model v2, optimistic city upgrades, and the gold arrow Level action |
| `LIVE — ALL PUBLISHED CHANNELS` | Build `fdf326a...`: unified `− | cost | +` skill controls, free live refunds, free Reset Skills, signed optimistic adjustments, and updated Skills tab/card readability. The separately hosted primary-domain public pages remain outside this client statement. |
| `LIVE — ITCH.IO` | No feature is known to be uniquely newer on itch.io |
| `IMPLEMENTED BUT NOT LIVE` | Uniform two-minute pickup cadence and center-biased pickup placement |
| `IMPLEMENTED BUT NOT LIVE` | Armed 5×5 Core reset, clan/Common Gear persistence enforcement, deterministic dynamic map expansion pending the September 2 UTC boundary and post-reset verification, and Holding Towers/Clan Treasury pending merge and authorized deployment |
| `IN DEVELOPMENT` | Continuing UI/performance/onboarding work |
| `PLANNED` | Seasons, final-season Kingdom/Clan leaderboard archives, higher Gear rarities |
| `PROPOSED` | Detailed Clan Wars, regional-control scoring, unconfirmed world-event concepts, unconfirmed expanded sound/animation mechanics |
| `NEEDS VERIFICATION` | Exact production runtime parity for repository-verified starting resources/formulas/reset behavior, ranking policy, monetization policy, moderation, SLOs, security posture, device matrix, and channel parity target |

# Appendix B — Conflict and Superseded-Decision Register

| Topic | Earlier or conflicting source | Current ruling |
|---|---|---|
| Primary production authority | Web and itch.io could both be described broadly as published | Web is primary LIVE authority; itch.io is separately tracked and may lag |
| World size | Earlier itch artifact contained 15 regions while web contained 20 | Both published game clients contain the same 20-region world. Build `a561374b...` established the verified cross-channel baseline, and current build `fdf326a...` retains it on web and itch.io. |
| Starting resources | 100 Gold/200 troops versus 500 Gold/50 troops | Current `origin/main` initializes 100 Gold/200 troops. Deployed backend/runtime parity and long-term design confirmation remain **NEEDS VERIFICATION**. |
| World structure | Single island, five islands, portals, disconnected or 100-city-map concepts | Superseded by connected regions and edge-route model |
| Achievement count | Earlier proposal of 50 | Superseded; current confirmed count is 40 |
| Season item persistence | Earlier broad statement that items persist | Superseded by explicit player identity, clan, and Common Gear allowlist; normal consumables do not persist |
| Bag stacking | Earlier limited-stacking discussion versus all-identical-item request | Both published clients group identical Bag items by quantity |
| Rally size | 2–20-player ordinary Rally versus five-member-minimum Tower conquest Rally | Both apply to different target types; Tower rule is implemented pending merge and authorized deployment and is not live |
| Mobile portrait | Earlier portrait Gear QA | Does not establish portrait game support; landscape is authoritative |
| Item pricing | Older fixed prices versus scalable pricing | Scalable formula is confirmed and `LIVE — ALL PUBLISHED CHANNELS` |
| Clan heraldry | v1 compatibility versus v2 presentation | v1 remains unchanged until deliberate v2 save; v2 is `LIVE — ALL PUBLISHED CHANNELS` |
| Ordinary Rally lifecycle deployment | Older published behavior could limit ordinary Rallies to three participants and lacked the creator-departure safety recall | Corrected 2–20-player lifecycle and creator-departure recall are `LIVE — ALL PUBLISHED CHANNELS`, beginning with verified cross-channel baseline build `a561374b...`. |
| Merge versus deployment | Completion reports sometimes implied live status | Merge never proves deployment; release evidence controls LIVE status |
| Common Gear reset persistence | Earlier reset initializer created an empty Gear state | Superseded by the explicit Common Gear persistence helper and reset-emulator coverage; production verification is scheduled with the reset |
| Clan reset persistence | Earlier reset path omitted clan identity and generation rollover | Superseded by transactional clan identity/roster/role migration with failure-safe and concurrency emulator coverage |
| War Drums production bonus | Codex audit summary said 5%; executable config says 30% while server fallback is 5% | Repository fact is 30% at `27105ae...`; exact production runtime parity remains **NEEDS VERIFICATION** |
| King Power replacement-power validator | Validator hardcodes three troops per progression point; executable config uses ten | Executable implementation uses ten; validator is stale technical debt |
| City-upgrade XP warnings | Earlier model required a preview and confirmation before rebuilt-level suppression | Superseded by silent suppression and direct replay-safe submission; XP progression remains authoritative but city-upgrade XP messaging is hidden |
| Season leaderboard history | Current rankings are generation-scoped and no final lock/archive exists | Active rankings reset; final Kingdom Top 100 and Clan leaderboard must persist as read-only archives. Implementation is `PLANNED`. |

# Appendix C — Evidence Register

| Source | Purpose | Audit note |
|---|---|---|
| [Canonical game release manifest](https://game.playcrownlands.com/release-manifest.js) | Deployed game build identity | Verified current build `fdf326a...`, contract `86fc7b17...`, server fingerprint `d69fb16e...`, client fingerprint `2a20d122...`, and 109 callables |
| [Live world](https://playcrownlands.com/world) | Current player-facing web world | Verified 20 regions; five placeholder names |
| [Game rules](https://playcrownlands.com/game-rules) | Current player-facing rules | Used for live rules baseline |
| [Roadmap](https://playcrownlands.com/roadmap) | Public direction and status | Planning evidence only; contains stale 15-region copy |
| [Updates](https://playcrownlands.com/updates) | Public release narrative | Used with release manifests, not alone |
| [itch.io](https://crownlands.itch.io/crownlands) | Secondary published channel | Public HTML5 iframe upload `#19037216`, exact source build `fdf326a...`, published August 31, 2026 at 00:15 UTC |
| [itch.io latest-build API](https://api.itch.io/wharf/latest?target=crownlands/crownlands&channel_name=html5) | Legacy Butler channel-version evidence | Still returns `2026-08-30-city-list-off-map-ownership-3390c83c`; it does not identify the current web-uploaded public iframe and must not be used alone as playable-build evidence |
| [GitHub commit `289a9d82f167...`](https://github.com/explocion200/CrownLands/commit/289a9d82f16739fac8d73376a5c4c85e08aeadc5) | Historical itch.io artifact source point | Superseded by exact current build `fdf326a...`; retained as the earlier subpath-fix baseline |
| [GitHub commit `27105ae76fbb...`](https://github.com/explocion200/CrownLands/commit/27105ae76fbb329559151030ebbac652a9ee8119) | August 24 broad implementation audit source point | Historical audit baseline; no longer current web/main |
| August 24 read-only implementation verification | Exact `origin/main` source audit of initialization, economy, King Power, objectives, Shop, rewards, reset persistence, rankings, and version gates | No checkout, code/config/data change, test run, build, commit, push, merge, deployment, or production mutation; deployed Functions parity remains unverified |
| [GitHub PR #171](https://github.com/explocion200/CrownLands/pull/171) | Ordinary Rally lifecycle correction | Merged August 25, 2026 as `1e5cdad...`; records 2–20-player lifecycle, deterministic settlement, safe returns, and creator-departure recall |
| [Rally merge release-gate run](https://github.com/explocion200/CrownLands/actions/runs/32844321201) | Static and multiplayer Rally validation | Passed all three jobs, including the full multiplayer emulator gate |
| [GitHub commit `1e5cdad50ba5...`](https://github.com/explocion200/CrownLands/commit/1e5cdad50ba52878b504243cd9edf4ac8ec4a894) | Exact Rally deployment baseline | Functions, Firestore rules/indexes, and Netlify web artifact deployed and smoke-tested August 25, 2026 |
| [Netlify Rally deploy metadata](https://api.netlify.com/api/v1/deploys/6a8d830f79ae0d9195aa50b1) | Exact Rally web publication evidence | Ready production deploy of `1e5cdad...`, published at 11:57:35 UTC |
| [GitHub PR #180](https://github.com/explocion200/CrownLands/pull/180) | Rally ownership-sync stability and player-guide correction | Merged August 25, 2026 as `1a0efbcb...`; clears stale Rally ownership during identity sync and aligns both guides with the shipped Rally rules |
| [Rally stability release-gate run](https://github.com/explocion200/CrownLands/actions/runs/32868326745) | Post-merge validation of PR #180 | Static, all 26 multiplayer emulator files, and final validation passed |
| [GitHub commit `054aac0aadfc...`](https://github.com/explocion200/CrownLands/commit/054aac0aadfc353c762fb444102fd62af76153af) | Audited application and Functions source point | Descends from both Rally merges and is the exact source used for the verified Functions refresh |
| [GitHub PR #181](https://github.com/explocion200/CrownLands/pull/181) | Verified deployment-ledger update | Merged August 25, 2026 as docs-only descendant `09328e60...`; its PR and post-merge release gates passed |
| [Current-main release-gate run](https://github.com/explocion200/CrownLands/actions/runs/32875771534) | Current descendant-build validation | Static, all 26 multiplayer emulator files, and final validation jobs passed for exact build `09328e60...` |
| [PR #199](https://github.com/explocion200/CrownLands/pull/199) | City XP model v2, optimistic city upgrades, and gold arrow Level action | Merged August 27, 2026 as `a561374b...`; Static validation, all 33 multiplayer emulator files, and Validate passed |
| [PR #201](https://github.com/explocion200/CrownLands/pull/201) | Unified skill controls, live refunds, free Reset Skills, and Skills readability | Merged August 27, 2026 as `291e5657...`; Static validation, all 33 multiplayer emulator files, and Validate passed |
| [PR #220](https://github.com/explocion200/CrownLands/pull/220) | Session heartbeat timeout and lifecycle-safe late-response recovery | Merged August 30, 2026 as `fdf326a...`; Static validation, all 33 multiplayer emulator files, Validate, and the 120-session realm-admission case passed |
| [Post-merge `main` release-gate run](https://github.com/explocion200/CrownLands/actions/runs/33343482121) | Exact merged heartbeat-build validation | Static validation, all 33 multiplayer emulator files, and Validate passed for build `fdf326a...` |
| [Current canonical game Netlify deploy](https://api.netlify.com/api/v1/deploys/6a94c517ebd65700085b9ad3) | Current game production evidence | Ready production deploy of exact build `fdf326a...`, published August 31, 2026 at 00:05:05 UTC; canonical manifest, index, service worker, heartbeat generation counter, and stale-response guard passed direct HTTP checks on both canonical hostnames |
| [Primary-domain beginner guide](https://playcrownlands.com/how-to-play.html) | Separately published player-facing documentation | Live response still contains the superseded three-ruler, Reward Camp, shield-removal, inbound-launch, and leader-speed rules; refresh ownership and deployment remain **NEEDS VERIFICATION** |
| August 27 post-deploy Firebase Functions listing | Current backend deployment metadata | Authorized full refresh from clean build `291e5657...`; 109 active Node.js 22 Functions share source hash `322ab24b...`, with source generations spanning 16:08:33–16:15:57 UTC. `adjustSkillLevels` is active, the obsolete skill-state trigger is absent, and the 29-callable access audit and production rules parity check passed; authenticated `getRealmInfo`, skill, and city mutations were not performed. |
| [GitHub PR #159](https://github.com/explocion200/CrownLands/pull/159) | Historical Holding Towers/Clan Treasury implementation and design evidence | Archived, unmerged, not live, and not a merge candidate; the current synchronized implementation supersedes it while preserving the confirmed Section 8 design |
| `README.md` | Historical mechanics and implementation documentation | Detailed but stale on world/build state |
| `docs/CROWNLANDS_ART_BIBLE.md` | Visual direction | Incorporated by reference |
| `docs/CROWNLANDS_VISUAL_MIGRATION.md` | Visual migration history | Historical implementation evidence |
| Local `dist`, `Crownlands-current-build/crownlands-html5-fdf326a9462f.zip`, and public itch.io upload `#19037216` | itch.io artifact inspection | Production validator passed 279 files and 57 itch-relative index resources; the public iframe's index, manifest, service worker, heartbeat generation counter, and stale-response guard matched build `fdf326a...`; ZIP SHA-256 `973137A3CC90023AF9340AFFC2D8B40FBA7A93B8DCE97F9FD0F9D1E9892A2C2D` |
| Crownlands Work conversations and Codex completion reports | Design and implementation history | Decisions used only when confirmed; reports do not prove deployment |

# Appendix D — Change Log

## v1.35 — September 5, 2026

- Confirmed durable scout/army confirmation recovery without automatic resubmission on reconnect, stale-session isolation, and retrying failed foreground reads.
- Recorded read-only route previews, retained in-flight preview results, and request-phase diagnostics without changing gameplay balance or authority.
- Added controlled browser/emulator evidence and the explicit physical-phone testing exclusion. Production release verification remains a separate release step.

## v1.34 — September 4, 2026

- Replaced the legacy fresh-neutral 24-hour/two-event/seven-day pair block with Anti-Handoff Policy v2: a 20-minute neutral lineage window and seven successful directed handoffs per rolling 24 hours.
- Required warnings to both players at counts 4 and 7, arrival-time authority, atomic launch/arrival enforcement, replay-safe claim IDs, safe troop/item/shield cancellation behavior, Holding Tower origin coverage, bounded counter cleanup, and an auditable fail-closed legacy cleanup.
- Preserved the independent 30-day same-installation protection and all player progress.

## v1.33 — September 4, 2026

- Confirmed the complete 24-map Layer 1 first ring as the current monthly-realm target and required a create-only, version-checked rollout that verifies all maps before activation and never overwrites player cities.
- Removed the 30-minute troop-travel maximum while preserving the existing formula, bonuses, minimums, server-generated routes, and server-authoritative arrival validation.
- Reduced future city-upgrade Hero XP from 1% to 0.5% of the matching Hero XP requirement under the existing floor/minimum rule without changing stored player XP.
- Reduced regular Gold and troop world pickups from one raw-production hour to 30 minutes, reduced their minimums from 250 to 125, and increased independent per-type UTC-day caps from 25 to 30 with an aggregate cap of 60.

## v1.32 — September 4, 2026

- Replaced the proposed blanket Core Main City exclusion with the exact confirmed nine-map restriction: Stoneward, Greybanner Hold, Lionwatch, Swiftgate, Crown Citadel, Aurum Keep, Oakwatch, Ironwatch, and Roseguard.
- Kept every other Core and New Lands map eligible under existing Main City rules while preserving the separate rule that all 25 Core maps remain new-player spawn-ineligible.
- Required authoritative-path server enforcement, safe canonical repair/recovery, complete omission of the restricted-map City Info action, and red map-switcher trim only on Greybanner Hold, Crown Citadel, Swiftgate, Ironwatch, and Aurum Keep.
- Classified the implementation as `IMPLEMENTED BUT NOT LIVE`; no production repair, deployment, or published-channel verification occurred as part of this decision.

## v1.31 — September 2, 2026

- Confirmed one fail-closed risk classifier shared by local `prepare-pr` and GitHub Actions over the complete branch difference from `origin/main`.
- Defined Fast, Standard, and Full validation requirements, with critical, mixed, unknown, reset, backend, release-contract, and production-data-affecting work always selecting Full.
- Preserved the three required GitHub check names, added upgrade-only Full overrides and explicit safe emulator-skip evidence, and required a nightly Full validation run.

## v1.30 — September 1, 2026

- Armed the one shared `realm-2026-09` Core-expansion reset for September 2, 2026 at 00:00 UTC while keeping the legacy world active before the boundary.
- Recorded successful held deployment of build `8d80b6a...`, mirrored client/server release identity, and fail-closed seeding of all 25 Core maps plus the first New Lands map before pointer publication.
- Reconciled stale reset-audit text with the current explicit Common Gear persistence helper and transactional clan rollover implementation and emulator coverage.
- Verified the daily managed Firestore backup schedule, 35-day retention, and READY August 31 snapshot; retained the previous generation for pointer rollback.

## v1.29 — September 1, 2026

- Implemented deterministic New Lands generation beyond the two prepared outer layers, preserving north-center layer starts, clockwise allocation, cardinal-only roads, and unique medieval-authentic map names.
- Required each threshold transition to prepare and verify the next two maps before exposing them, with queued concurrent triggers, bounded idempotency receipts, scheduled retry, and live client catalog refresh.
- Added a fail-closed reset-readiness gate that seeds and verifies the 25-map Core plus the first New Lands map before publishing the scheduled realm pointer.
- Removed the shared assignment counter bottleneck so simultaneous players enter the one canonical shared realm without contending on a global sequence document.
- Defined the supported automatic-expansion envelope as 4,095 New Lands maps and 81,900 threshold-managed starting placements; this is an implementation safety bound, not a 50-player realm split.

## v1.28 — August 31, 2026

- Confirmed that every player in a monthly generation belongs to one shared interactive realm; the previous 50-player split and automatic creation of additional player shards are superseded.
- Retained `shard_0001` only as the canonical internal generation partition so query, rule, and archived-generation isolation remain intact.
- Limited server-authoritative starting placement to `region_11` through `region_15`, whose current layouts provide 363 neutral regular cities, and required explicit exhaustion instead of creating another realm.
- Classified the shared-realm implementation as `IN DEVELOPMENT` pending full release validation, merge, coordinated deployment, and post-reset verification.

## v1.27 — August 30, 2026

- Recorded PR #220 and merged build `fdf326a...` as the session-heartbeat recovery baseline, retaining the 15-second response bound and invalidating stopped lifecycle generations before late responses can mutate state or clear replacement in-flight locks.
- Recorded Netlify deploy `6a94c517ebd65700085b9ad3`, published August 31 at 00:05:05 UTC, and public itch.io iframe upload `#19037216`, published at 00:15 UTC, as exact cross-channel build `fdf326a...`.
- Verified the canonical and itch.io public manifests, indexes, service workers, heartbeat generation counters, and stale-response guards; the local itch.io artifact passed 279-file validation and 57 relative-resource checks with ZIP SHA-256 `973137A3CC90023AF9340AFFC2D8B40FBA7A93B8DCE97F9FD0F9D1E9892A2C2D`.
- Promoted bounded heartbeat response handling, lifecycle-safe recovery, and the unified Skills controls to `LIVE — ALL PUBLISHED CHANNELS`.
- Recorded the stale legacy Butler `html5` latest-build metadata as release-metadata debt and retained authenticated login, interrupted-connection recovery, and second-tab replacement as manual QA because no approved production QA account was used.

## v1.26 — August 30, 2026

- Confirmed that the City List must represent the complete owner-scoped roster across the current world, generation, and realm shard, independent of the displayed map, with canonical region identity taken from each city document's island path.
- Required roster failures or reconciliation mismatches to remain explicitly incomplete and retryable instead of silently replacing the cache as complete.
- Extended City List position stability from pending queues to the full open-modal session, with deterministic append-only discovery, relative-order-preserving removals, explicit-sort resets, and fresh ordering on reopen.
- Classified the City List reliability correction as `IN DEVELOPMENT` pending validation, merge, and coordinated publication; no deployment status changed.

## v1.25 — August 30, 2026

- Confirmed a 27-hour raw-production ceiling for Hero level-up Gold from Level 101 onward while retaining the existing Gold floor and upgrade-relief limits.
- Recorded Level 117 as the first reduced payout under the current city-production curve, 17,249,182,092 Gold at Level 150, and 228,530,487,042 cumulative Gold through Level 150.
- Documented the complete standardized Gold reward formula and corrected the Hero troop-reward production scalar to the confirmed 10.3 value.
- Required the season audit to floor the authoritative reference upgrade cost and apply the ten-Gold minimum before calculating its reward share.

## v1.24 — August 29, 2026

- Confirmed adjacent undispatched `+1` and `+5` city inputs compact into exact same-city batches of up to 25 levels while preserving global input order, immediate projections, immutable active request IDs, and standalone authoritative `MAX` requests.
- Limited projected City List and map presentation to affected cities and one animation-frame update, with one confirmation sequence per settled batch.
- Required queue lifecycle cleanup and recovery to remain independent from presentation failures, and required unrelated city actions to wait for authoritative synchronization rather than cascade after an offline rejection.
- Classified the queue-stability correction as `IN DEVELOPMENT` pending validation, merge, and coordinated web and itch.io publication.

## v1.23 — August 28, 2026

- Confirmed a uniform two-minute pickup cadence for the first pickup and every successful post-collection respawn.
- Preserved Gold/troop alternation, the one-active-pickup limit, 20-minute expiration, and five-second failed-placement retry.
- Confirmed rejected or failed claims preserve the active pickup and its existing deadline, while legacy pending waits longer than two minutes normalize to the new maximum when synchronized.
- Classified the cadence as `IN DEVELOPMENT` pending validation, merge, and coordinated backend, web, and itch.io deployment.

## v1.22 — August 28, 2026

- Confirmed regular-city base Gold production at 285 per hour at Level 1, 11.55% unit growth through Level 100, and 7.9% Gold growth per level afterward.
- Preserved the upgrade target-hour curve, so Gold production and nominal upgrade costs change together without changing the intended one-city production-hour pacing.
- Re-anchored the Gold-cost-linked wall exponent to `0.22881653173769995`, preserving the exact 6,200,000 Level 150 wall and the existing post-Level-150 troop-production continuation.
- Classified the curve as `IN DEVELOPMENT` pending validation, merge, and coordinated backend, web, and itch.io deployment.

## v1.21 — August 27, 2026

- Confirmed direct replay-safe city-upgrade submission with synchronous projected level and Gold, targeted City List row patching, and a subtle nonblocking syncing state.
- Confirmed map-independent City List upgrades keyed by region and city, with the city document's island path authoritative over stale stored region metadata.
- Removed all player-facing city-upgrade XP estimates, warnings, logs, and toast text while retaining authoritative XP awards, seasonal high-watermarks, silent rebuild suppression, and compatibility receipts.
- Retained the preview callable and acknowledgement fields for older clients, plus a silent current-client retry against an older warning-enforcing backend. Classified the refinement as `IN DEVELOPMENT` pending merge and coordinated backend, web, and itch.io deployment.

## v1.20 — August 27, 2026

- Confirmed a 3% regular-city troop-production increase to `floor(city progression value × 10.3)` for the next reset.
- Confirmed the staged regular-city wall curve through Level 150, including its exact anchors, early 3× ceiling, Gold-cost-linked Level 101-150 gains, and unlimited post-150 production-ratio continuation.
- Preserved the current published linear wall rule as LIVE deployment history and classified the replacement as IN DEVELOPMENT pending merge and coordinated deployment.
- Preserved the existing Level 150 apex siege and replacement-time guardrails.

## v1.19 — August 27, 2026

- Recorded PR #201 web production at build `291e5657...`, Netlify deploy `6a90631243ff84feec4291b2`, and 109 active Functions sharing source hash `322ab24b...`.
- Verified `adjustSkillLevels` is active, the obsolete skill-state trigger is absent, Firestore rules and indexes are current, and the live manifest and core assets match the deployed build.
- Promoted unified skill controls, free live refunds, free Reset Skills, signed optimistic adjustments, and the Skills readability update to `LIVE — WEB`.
- Recorded itch.io HTML5 build `#1920417` at `a561374b...` as one client build behind web while retaining compatibility with the current backend.

## v1.18 — August 27, 2026

- Recorded exact web, Firebase, and itch.io deployment parity at build `a561374b...`, including Netlify deploy `6a9036cdeae2b200087f6a99`, 109 active Functions, and itch.io HTML5 build `#1920417`.
- Verified the published itch.io artifact as an exact 279-file byte match, confirmed all 57 relative resource paths, loaded the public embed without console or asset errors, and recorded the local archive hash.
- Promoted the 20-region client, corrected ordinary Rally lifecycle, current Shop/Bag/Heraldry presentation, Hero reward curve, city XP model v2, optimistic city upgrades, and gold arrow Level action to `LIVE — ALL PUBLISHED CHANNELS`.
- Retained legacy city-upgrade requests because authenticated request-ID-backed adoption and production city mutation remain manual verification steps.
- Confirmed free, exact weighted live-skill refunds and a free Reset Skills clear-all action that neither changes Gold nor consumes stored legacy credits.
- Confirmed replay-safe signed skill adjustments, ordered optimistic projections, net-zero coalescing, authoritative rollback, and active-preset clearing for every live adjustment.
- Standardized Current Build and preset drafts on compact `− | cost | +` controls, removed repeated final-tier explanatory text, and fixed applied, viewed, inactive, locked, and combined tab colors in the final palette layer.

## v1.17 — August 27, 2026

- Confirmed city-upgrade XP model version 2 at 1% of the matching Hero XP requirement with no daily allowance at any Hero level.
- Retained seasonal high-watermarks, zero-XP legacy requests, replay receipts, normal Hero rewards, and neutral cap receipt fields while ending daily allowance reads and writes.
- Confirmed ordered optimistic city-upgrade actions with immediate projected Gold and levels, exact `+5`, projected `MAX`, dispatch-time XP previews, same-city rollback, stable pending rows, and authoritative cache reconciliation.
- Confirmed a dedicated gold arrow-up treatment only for the selected-city map Level action while City Info and City List retain `+1`, `+5`, and `MAX`.

## v1.16 — August 26, 2026

- Confirmed Current Build as the default live skill editor and unlocked presets as isolated named drafts with weighted `+`/`−` controls.
- Required explicit free preset saving to preserve the live build, Gold, and active identity; only the existing paid Apply action may activate or switch a preset.
- Confirmed zero-point initialization for empty drafts, default preset-name support, dirty-exit Save/Discard/Cancel choices, and an Active · Apply changes state for saved edits to the active preset.

## v1.15 — August 25, 2026

- Confirmed one-point skill costs before each skill's final five levels and two-point costs for every final-tier level.
- Added one replay-safe Reset Skills migration credit for existing rulers while preventing fresh profiles from receiving a migration credit.
- Required client, server, preset, and queued-spend accounting to use the same weighted skill-point ledger.
- Confirmed a three-minute first pickup, one-minute post-collection respawns, preserved state after rejected claims, and center-biased terrain-safe placement.

## v1.14 — August 25, 2026

- Corrected Common Gear upgrades to consume both same-level input identities, create one next-level identity, transfer equipment state, and settle retries idempotently.

## v1.13 — August 25, 2026

- Confirmed the temporary request-ID-free city-upgrade compatibility window for coordinated backend, web, and itch.io rollout.
- Required legacy upgrades to award zero Hero XP while advancing the seasonal city high-watermark through every completed level.
- Added the server-controlled legacy shutdown setting, stable update-required rejection, and phased deployment order.

## v1.12 — August 25, 2026

- Confirmed the stronger post-Level-50 Hero troop-reward curve, including the 108-hour maximum that first binds at Level 235.
- Confirmed that Hero level-up troops use standardized reference production at the new Hero level and never use the player's actual city or kingdom production.
- Retained authoritative one-time credit to the canonical Main City and classified the balance update as `IN DEVELOPMENT` pending merge, deployment, and channel verification.

## v1.11 — August 25, 2026

- Confirmed fixed Hero XP for each regular-city level upgraded, based on 5% of the matching Hero XP requirement.
- Confirmed seasonal per-player, per-region, per-city high-watermarks with no retroactive or rebuild farming awards.
- Confirmed uncapped city-upgrade XP below Hero Level 50, a linear one-to-two level-equivalent daily allowance through Level 100, and a two-equivalent allowance thereafter.
- Confirmed UTC cap freezing, exact successive-level calculations, discarded excess XP, pre-upgrade suppression warnings, normal Hero-level rewards, and Gold-affordability ordering.
- Required the authoritative upgrade to reject unacknowledged or increased XP suppression caused by preview-to-commit state changes.
- Classified the feature as `IN DEVELOPMENT` pending merge, deployment, and channel verification.

## v1.10 — August 25, 2026

- Distinguished the primary-domain public pages from the separately published canonical game application at `game.playcrownlands.com`.
- Recorded canonical game build `09328e60...`, Netlify deploy `6a8dcb383450a500086cedcd`, and successful post-merge release gate `32875771534` while retaining exact Functions source provenance at `054aac0...`.
- Corrected the earlier smoke conclusion: the beginner-guide source and canonical game-host copy contain the current Rally rules, but the primary-domain copy still exposes superseded behavior and requires a separate deployment path.
- Recorded the broken legacy direct `playcrownlands.com/play/` asset route while confirming that public Play actions use the working canonical game host.
- Kept authenticated `getRealmInfo`, primary public-site deployment ownership, and itch.io Rally parity as **NEEDS VERIFICATION**.

## v1.9 — August 25, 2026

- Updated the primary web snapshot to exact build `054aac0...`, Netlify deploy `6a8dbe456280b500084541ab`, current release-gate run `32870265000`, and manifest fingerprints `d90184eb...` server and `9bdafbd3...` client.
- Recorded PR #180's stale Rally-ownership identity-sync correction and matching guide fixes, merged as `1a0efbcb...`, plus its green release gate.
- Recorded the authorized refresh of all 102 Node.js 22 Functions from clean build `054aac0...`, shared Firebase source hash `0fc34326...`, source-generation interval, 29-callable access audit, and production rules parity check. Firestore rules and indexes were unchanged and were not redeployed.
- Preserved the authenticated `getRealmInfo` runtime response as **NEEDS VERIFICATION** because no pre-existing safe signed-in player session was available.
- Left itch.io unchanged and unverified for the corrected Rally lifecycle.

## v1.8 — August 25, 2026

- Updated the primary web snapshot to current build `998ebbd...` and recorded its deployment time, Netlify deploy ID, contract, source fingerprints, callable count, current repository commit, and smoke evidence.
- Added the exact `1e5cdad...` Rally release baseline, PR #171, green release-gate run, Functions/Firestore deployment evidence, Netlify publication, and current descendant-build evidence.
- Recorded automatic complete-army Rally recall when the creator leaves, is removed, or changes clans; confirmed that it consumes no Recall Horn, records a specific reason, and does not recall another creator's Rally for a non-creator departure.
- Reclassified the ordinary Rally lifecycle correction from `IN DEVELOPMENT` to `LIVE — WEB` without changing the all-channel status of the older Rally foundation.
- Preserved the five-member Holding Tower minimum as a separate target-specific, not-live rule.
- Recorded that itch.io was not republished and that the exact embedded build ID of the latest Functions deployment still requires authenticated runtime verification.

## v1.7 — August 24, 2026

- Confirmed persistence for clan ID, name, tag, heraldry, member roster, and each member’s Leader/Officer/Member role.
- Confirmed seasonal reset of Clan Treasury balance/ledger, seasonal statistics, weekly-goal progress, rallies, reinforcements, donations/gifts activity, and world-objective ownership.
- Expanded the documented implementation conflict to include clan presentation, roster, and roles.
- Removed clan-role persistence from unresolved season decisions.

## v1.6 — August 24, 2026

- Replaced the vague player-customization persistence entry with an exact allowlist.
- Confirmed persistence for player name, complete player flag design, account creation date, and notification preferences.
- Classified authentication and active-session carry-forward as technical account state rather than seasonal progression.
- Recorded that the inspected current reset implementation matches the confirmed player-identity persistence set.
- Removed player-identity field scope from Open Design Decisions.

## v1.5 — August 24, 2026

- Confirmed that active Kingdom and Clan leaderboards reset each season.
- Confirmed that the final Kingdom Top 100 and final Clan leaderboard are locked and preserved as read-only historical records.
- Added final-season leaderboard archives to the persistence allowlist without treating them as active progression.
- Recorded final leaderboard locking and archival as `PLANNED` because no current implementation was found.
- Removed the foundational leaderboard-history question from Open Design Decisions while retaining finalization, tie, field, retention, eligibility, and reward details as unresolved.

## v1.4 — August 24, 2026

- Confirmed that Achievement progress, completed/claimed state, unclaimed rewards, and completion history fully reset each season.
- Confirmed that no Achievement completion ledger persists as permanent progression or prestige history.
- Recorded that the inspected generation/month-scoped implementation matches the full-reset design.
- Removed Achievement persistence from Open Design Decisions.

## v1.3 — August 24, 2026

- Confirmed that Hero level, Hero XP, unspent skill points, acquired skill upgrades, and saved skill presets reset each season.
- Distinguished seasonal Hero progression from permanent Common Gear progression.
- Recorded that the inspected current reset implementation matches this Hero-reset rule.
- Removed Hero progression persistence from Open Design Decisions.

## v1.2 — August 24, 2026

- Confirmed that unopened Common Gear Boxes persist across seasons/resets as part of permanent Gear progression.
- Added unopened Common Gear Boxes to the explicit season-persistence allowlist.
- Reclassified the current reset-to-zero behavior for unopened Gear Boxes as an implementation conflict.
- Removed unopened Gear Box persistence from Open Design Decisions and retained production enforcement as `IN DEVELOPMENT`.

## v1.1 — August 24, 2026

- Recorded the read-only implementation verification against exact `origin/main` commit `27105ae76fbb...`.
- Verified repository initialization at 100 Gold, 200 troops, and one Level 1 Main City while retaining production-runtime verification as an open gate.
- Added exact repository formulas for Gold production, troop production, city-level scaling, objective bonuses, scalable Shop pricing, Camps, pickups, Daily Missions, Achievements, and King Power.
- Recorded current leaderboard generation/versioning behavior and missing season-finalization systems.
- Documented that current reset code preserves flags/names and resets normal Bag consumables but conflicts with confirmed Common Gear and clan persistence policy.
- Recorded that unopened Gear Boxes currently reset while their intended persistence remains unresolved.
- Corrected the audit’s War Drums value: executable configuration is 30%, while 5% is only a fallback.
- Added the stale King Power validator and reset-emulator expectations to technical debt.
- Preserved all LIVE statuses because repository inspection alone did not verify a new deployment.

## v1.0 — August 24, 2026

- Initial authoritative Crownlands development specification created.
- Established web production as primary LIVE authority.
- Added separate itch.io release-channel tracking.
- Established explicit implementation/deployment status model.
- Recorded confirmed season-persistence design policy.
- Preserved unresolved starting-resource conflict for technical verification.

---

# Ongoing Change-Management Procedure

When a Crownlands design decision is explicitly confirmed:

1. Identify every affected section and appendix entry.
2. Check for conflicts with confirmed rules.
3. Update intended behavior independently from implementation and deployment status.
4. Preserve useful superseded history.
5. Never mark the change LIVE without verified channel deployment.
6. Update the Release Channel Matrix if channel behavior changed.
7. Add a dated Change Log entry.

When a Codex completion report is returned:

1. Compare completed work with this specification.
2. Identify what matches, remains incomplete, or diverges.
3. Review tests, regressions, security, performance, and channel compatibility.
4. Keep implementation status separate from LIVE deployment status.
5. Recommend the next scoped Codex prompt.
6. Update this document only when design, verified implementation status, or verified deployment status changed.
