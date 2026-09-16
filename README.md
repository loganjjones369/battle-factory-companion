# Battle Factory Companion

An offline Pokémon Emerald Battle Factory companion for phone use.

## Current version

**v0.3.1 — Factory prediction groundwork**

The app now includes:

- Open Level / Level 50 selection
- Current round and Factory rental-IV handling
- Three draft Pokémon entry slots
- Local Factory set data for the initial cross-checked species pack
- Set-by-set stat and speed display
- Speed matchup summaries
- A Gen III damage calculation engine
- Attacker/defender set selection
- Move selection
- Weather controls for neutral, sun, rain and hail
- Burned-attacker handling
- Full damage-roll display and minimum-damage KO estimate
- Comparison against every loaded defender set
- Scientist notes
- Battle-local opponent species blocking
- Scientist/team candidate filtering groundwork
- A parser for the canonical Battle Factory Buddy set format

## Complete Factory dataset

The repository now contains an automated GitHub Actions importer for the canonical Emerald Factory `allpkmn.csv` dataset used by Battle Factory Buddy. The workflow converts that source into the app's local `data/factoryData.js`, including Factory sets, EVs, natures, items, abilities, styles, round markers, types and Gen III base stats.

The generated dataset is bundled into the app, so the finished app does not need Battle Factory Buddy or another website at runtime.

## Data sources

The project uses Battle Factory Buddy as an important reference for Emerald Factory set data and Factory deduction behavior. Its public repository contains the `InputData/allpkmn.csv` set database and documents the Factory's deduction/swap logic.

Gen III species/base-stat information is cross-checked from the open-source veekun Pokédex data. These sources are used to build local data rather than making the app depend on an online service during play.

## Roadmap

1. Complete and verify the imported Factory dataset and round availability rules.
2. Add Pokémon names, sprites and search/autocomplete.
3. Finish the Gen III damage engine: critical hits, stat stages, abilities, items, berries, multi-turn effects and remaining status/weather interactions.
4. Add switch-in analysis and automated 2HKO/3HKO/OHKO summaries across all possible sets.
5. Recreate the Factory Buddy-style scientist/remaining-pool deduction system offline.
6. Add battle-state tracking and theory-crafting tools.
7. Package the app for reliable offline phone use.

## Running locally

This is an Expo app. Install dependencies, then run `npm start` and open it with Expo Go or an emulator.
