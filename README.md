# Battle Factory Companion

An offline Pokémon Emerald Battle Factory companion for phone use.

## Current version

**v0.6.0 — Phone-test preparation + Factory Brain candidate engine**

### Pre-test hardening completed

- EAS preview and production build profiles are configured with current cloud build images for Android and iOS.
- The preview profile uses internal distribution so the finished test build can be installed without publishing the app to an app store.

- Bundled Emerald sprites for all 265 Factory species; no runtime web asset fetch is required.
- Battle-condition controls and state propagation are wired through decision analysis.
- Gen III fixed-damage, multi-hit, priority, residual, Substitute, Explosion, and multi-turn handling has been covered by the validation guardrails.
- Sequential observation evidence is replayed against exact Factory sets.
- Next-battle exposure preview is restricted to Factory-legal surviving pools.
- `npm run validate:factory` is the single local Factory validation command.

The app now includes:

- Open Level / Level 50 selection
- Configurable starting battle and swap count for continuing an existing run
- Persistent battle/run-state helpers
- One-swap-per-win progression logic
- Round and milestone celebration helpers
- Battle-local opponent species blocking
- Verified draft elevation thresholds
- Verified battle-to-pool mapping for the canonical 436-set Group 3 dataset
- Set-level candidate filtering before expensive team enumeration
- Exact set-level possibility results rather than invented uniform probabilities
- Open Level / Level 50 Factory set data
- Set-by-set stat and speed display
- Speed matchup summaries
- A Gen III damage calculation engine
- Attacker/defender set selection
- Move selection
- Weather controls for neutral, sun, rain and hail
- Burned-attacker handling
- Full damage-roll display with percentage ranges and 39-roll distribution
- Comparison against every loaded defender set
- Scientist notes and style/type deduction groundwork
- Noland-aware opponent candidate handling with Silver/Gold IV rules
- Factory blocked-species enforcement in draft analysis
- Device persistence for active runs and battle history

## Factory rules currently verified in the engine

The opening draft's elevation is based on the persistent rental/swap count: 0–14 = no upgraded slots, 15–21 = 1, 22–28 = 2, 29–35 = 3, 36–42 = 4, and 43+ = 5. The initial rental counts toward that persistent count.

The canonical Group 3 dataset and the verified early Level 50 pools are bundled into the generated local dataset. Level 50 battles 1–3 use the dedicated `l50-1`, `l50-2`, and `l50-3` pools; Level 50 Group 3 begins at the next Factory tier. Open Level uses Group 3 from round 1. The importer currently records 667 total sets, including 157 early Level 50 sets.

For ordinary trainers, the last battle of each seven-battle round uses the following round's opponent pool. Noland is handled separately: his candidate engine uses the appropriate Factory Head variant rules, does not apply the ordinary player-species block, and records Silver/Gold IVs as 15/31.

## Complete Factory dataset

The repository contains an automated GitHub Actions importer for the canonical Emerald Factory `allpkmn.csv` dataset used by Battle Factory Buddy. The workflow converts that source into the app's local `data/factoryData.js`, including Factory sets, EVs, natures, items, abilities, styles, round markers, types and Gen III base stats.

The generated dataset is bundled into the app, so the finished app does not need Battle Factory Buddy or another website at runtime.

## Data sources

The project uses Battle Factory Buddy as an important reference for Emerald Factory set data and Factory deduction behavior. The public Battle Factory Buddy repository precomputes legal teams because brute-force generation is prohibitively slow at query time.

Factory round/elevation mechanics have also been cross-checked against established Generation III Battle Factory references. The engine intentionally distinguishes player draft pools, ordinary opponent pools, and Noland rather than treating them as one generic set pool.

## Roadmap

1. **Phone build + first real-device test** — connect the Expo/EAS project, produce an internal iOS preview build, install it on the phone, and exercise the complete Open/Level 50 run flow offline.
2. Complete any remaining Emerald move/mechanics gaps discovered during real-device testing.
3. Expand opponent observation tracking: speed tests, damage ranges, ability/item confirmation, and multi-turn evidence.
4. Expand switch-in and revenge analysis to account for current HP, residual damage, status, hazards, screens, priority, and damage-range certainty.
5. Finish the offline Factory Buddy-style deduction layer, including richer scientist clues and remaining-pool/team enumeration.
6. Add a dedicated Noland battle view with his special variant restrictions surfaced directly in the UI.
7. Add a run-summary/history screen so previous battles and eliminated sets can be reviewed without leaving the active run.
8. Package the final app for reliable offline phone use.

## Running locally

This is an Expo app. Install dependencies, then run `npm start` and open it with Expo Go or an emulator.
