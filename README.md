# Battle Factory Companion

An offline Pokémon Emerald Battle Factory companion for phone use.

## Current version

**v0.4.0 — verified Factory pool logic + run progression groundwork**

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
- Full damage-roll display and minimum-damage KO estimate
- Comparison against every loaded defender set
- Scientist notes and style/type groundwork

## Factory rules currently verified in the engine

The opening draft's elevation is based on the persistent rental/swap count: 0–14 = no upgraded slots, 15–21 = 1, 22–28 = 2, 29–35 = 3, 36–42 = 4, and 43+ = 5. The initial rental counts toward that persistent count.

The canonical Group 3 dataset used by this app covers the higher Factory sets. Level 50 battles 1–3 use separate low/mid-tier pools that are not yet bundled into the 436-set dataset; the candidate engine therefore reports those battles as unsupported rather than silently using the wrong sets. Level 50 Group 3 begins at Factory round 4. Open Level uses Group 3 from round 1.

For ordinary trainers, the last battle of each seven-battle round uses the following round's opponent pool. Noland is handled separately and will not inherit the ordinary trainer pool rules.

## Complete Factory dataset

The repository contains an automated GitHub Actions importer for the canonical Emerald Factory `allpkmn.csv` dataset used by Battle Factory Buddy. The workflow converts that source into the app's local `data/factoryData.js`, including Factory sets, EVs, natures, items, abilities, styles, round markers, types and Gen III base stats.

The generated dataset is bundled into the app, so the finished app does not need Battle Factory Buddy or another website at runtime.

## Data sources

The project uses Battle Factory Buddy as an important reference for Emerald Factory set data and Factory deduction behavior. The public Battle Factory Buddy repository precomputes legal teams because brute-force generation is prohibitively slow at query time.

Factory round/elevation mechanics have also been cross-checked against established Generation III Battle Factory references. The engine intentionally distinguishes player draft pools, ordinary opponent pools, and Noland rather than treating them as one generic set pool.

## Roadmap

1. Finish bundling the Level 50 low/mid-tier pools.
2. Wire verified pool/elevation logic into the visible draft screen.
3. Add Pokémon names, local sprites and search/autocomplete.
4. Finish the Gen III damage engine: critical hits, stat stages, abilities, items, berries, multi-turn effects and remaining status/weather interactions.
5. Add switch-in analysis and automated 2HKO/3HKO/OHKO summaries across all possible sets.
6. Finish the Factory Buddy-style scientist/remaining-pool deduction system offline.
7. Add battle-state tracking and full battle theory-crafting tools.
8. Package the app for reliable offline phone use.

## Running locally

This is an Expo app. Install dependencies, then run `npm start` and open it with Expo Go or an emulator.
