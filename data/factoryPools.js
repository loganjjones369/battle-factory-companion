import { POKEMON } from './factoryData';
import { getSwapElevation } from './factoryRules';

const norm = (v) => String(v || '').trim().toLowerCase();

/**
 * Maps an actual Factory battle to the set-marker bucket used by the
 * canonical Battle Factory data.
 *
 * The 436-set local dataset represents Group 3 / higher Factory sets. The
 * Level 50 rounds 1-3 use the separate low/mid-tier pools and therefore are
 * reported as unavailable here rather than pretending the 436-set dataset is
 * complete for those rounds.
 */
export function getPlayerDraftBaseBucket(levelMode = 'Open Level', battle = 1) {
  const b = Math.max(1, Number(battle) || 1);
  if (levelMode === 'Open Level') return b <= 4 ? String(b) : '6';
  if (b <= 3) return null;
  if (b <= 7) return String(b - 3);
  return '5';
}

/** The next-round bucket used by an upgraded draft slot. */
export function getPlayerDraftUpgradeBucket(levelMode = 'Open Level', battle = 1) {
  const b = Math.max(1, Number(battle) || 1);
  if (levelMode === 'Open Level') return b < 4 ? String(b + 1) : '6';
  if (b <= 3) return null;
  if (b <= 6) return String(b - 2);
  return '5';
}

/**
 * Returns the number of upgraded Pokémon in the six-Pokémon opening draft.
 * The initial rental counts toward the persistent Factory swap/rental counter.
 */
export function getDraftElevation(swaps = 0) {
  return Math.min(5, getSwapElevation(swaps));
}

function allSets() {
  return Object.values(POKEMON).flatMap((pokemon) => pokemon.sets);
}

function uniqueSpecies(sets) {
  return [...new Set(sets.map((set) => norm(set.species)))].length;
}

/**
 * Returns the legal set pools for each draft slot before the game's random
 * six-Pokémon selection is applied. This is intentionally a pool, not a fake
 * probability model.
 */
export function getDraftSetPools({ levelMode = 'Open Level', battle = 1, swaps = 0, blockedSpecies = [] } = {}) {
  const baseBucket = getPlayerDraftBaseBucket(levelMode, battle);
  const upgradeBucket = getPlayerDraftUpgradeBucket(levelMode, battle);
  const elevation = getDraftElevation(swaps);
  const blocked = new Set(blockedSpecies.map(norm));
  const sets = allSets().filter((set) => !blocked.has(norm(set.species)));

  if (!baseBucket) {
    return {
      supported: false,
      reason: 'Level 50 battles 1-3 use the separate low/mid-tier Factory pool, which is not in the 436-set Group 3 dataset.',
      elevation,
      baseBucket: null,
      upgradeBucket: null,
      regularPool: [],
      upgradedPool: [],
    };
  }

  const regularPool = sets.filter((set) => String(set.round) === baseBucket);
  const upgradedPool = sets.filter((set) => String(set.round) === upgradeBucket);

  return {
    supported: true,
    elevation,
    baseBucket,
    upgradeBucket,
    regularPool,
    upgradedPool,
    regularSpeciesCount: uniqueSpecies(regularPool),
    upgradedSpeciesCount: uniqueSpecies(upgradedPool),
  };
}

/**
 * Human-readable explanation for the setup screen.
 */
export function describeDraftPool({ levelMode = 'Open Level', battle = 1, swaps = 0 } = {}) {
  const pool = getDraftSetPools({ levelMode, battle, swaps });
  if (!pool.supported) return pool.reason;
  if (!pool.elevation) return `All 6 draft slots use the current pool (bucket ${pool.baseBucket}).`;
  return `${pool.elevation} of the 6 draft slots are elevated into the next pool (bucket ${pool.upgradeBucket}); the remaining ${6 - pool.elevation} use bucket ${pool.baseBucket}.`;
}
