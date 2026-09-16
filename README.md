# Battle Factory Companion

An offline Pokémon Emerald Battle Factory companion for phone use.

## Current version

**v0.3.0 — Live matchup calculator**

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

## Data sources

The project uses Battle Factory Buddy as an important reference for Emerald Factory set data and Factory deduction behavior. Its public repository contains the `InputData/allpkmn.csv` set database and documents the Factory's deduction/swap logic.

Other reference sources include EisenCalc for Gen III Battle Frontier damage behavior and community-maintained Emerald Battle Frontier data. These sources are used for cross-checking rather than making the app depend on an online service.

## Roadmap

1. Expand the local data pack to the complete Emerald Factory roster and all relevant round/set variants.
2. Add Pokémon names, sprites and search/autocomplete.
3. Finish the Gen III damage engine: critical hits, stat stages, abilities, items, berries, multi-turn effects and remaining status/weather interactions.
4. Add switch-in analysis and automated 2HKO/3HKO/OHKO summaries across all possible sets.
5. Recreate the Factory Buddy-style scientist/remaining-pool deduction system offline.
6. Add battle-state tracking and theory-crafting tools.
7. Package the app for reliable offline phone use.

## Running locally

This is an Expo app. Install dependencies, then run `npm start` and open it with Expo Go or an emulator.
