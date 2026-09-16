import { POKEMON } from './factoryData';
import { getSwapElevation } from './factoryRules';

const norm = (v) => String(v || '').trim().toLowerCase();

export function getPlayerDraftBaseBucket(levelMode = 'Open Level', battle = 1) {
  const b = Math.max(1, Number(battle) || 1);
  if (levelMode === 'Open Level') return b <= 4 ? String(b) : '6';
  if (b <= 3) return null;
  if (b <= 7) return String(b - 3);
  return '5';
}

export function getPlayerDraftUpgradeBucket(levelMode = 'Open Level', battle = 1) {
  const b = Math.max(1, Number(battle) || 1);
  if (levelMode === 'Open Level') return b < 4 ? String(b + 1) : '6';
  if (b <= 3) return null;
  if (b <= 6) return String(b - 2);
  return '5';
}

export function getDraftElevation(swaps = 0) {
  return Math.min(5, getSwapElevation(swaps));
}

function allSets() {
  return Object.values(POKEMON).flatMap((pokemon) => pokemon.sets);
}

function uniqueSpecies(sets) {
  return [...new Set(sets.map((set) => norm(set.species)))].length;
}

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

// Factory rental IVs by actual round. At a draft, an elevated slot uses the
// next-round rental quality while a normal slot uses the current round quality.
export function getDraftIV(levelMode = 'Open Level', battle = 1, elevated = false) {
  const round = Math.max(1, Math.ceil((Number(battle) || 1) / 7));
  const effectiveRound = elevated ? round + 1 : round;
  const ivByRound = { 1: 3, 2: 6, 3: 9, 4: 12, 5: 15, 6: 21, 7: 31 };
  return ivByRound[Math.min(7, effectiveRound)] || 31;
}

/**
 * Gives one draft position its gameplay identity. The UI can use this object
 * to show the tiny elevation arrow and the calculator can carry the same IV
 * into future damage/speed calculations.
 */
export function getDraftSlotInfo({ levelMode = 'Open Level', battle = 1, swaps = 0, slotIndex = 0, blockedSpecies = [] } = {}) {
  const pool = getDraftSetPools({ levelMode, battle, swaps, blockedSpecies });
  const elevated = Number(slotIndex) >= 0 && Number(slotIndex) < pool.elevation;
  return {
    slotIndex: Number(slotIndex) || 0,
    isElevated: elevated,
    poolBucket: elevated ? pool.upgradeBucket : pool.baseBucket,
    iv: getDraftIV(levelMode, battle, elevated),
    elevationCount: pool.elevation,
    baseBucket: pool.baseBucket,
    upgradeBucket: pool.upgradeBucket,
    supported: pool.supported,
  };
}

export function describeDraftPool({ levelMode = 'Open Level', battle = 1, swaps = 0 } = {}) {
  const pool = getDraftSetPools({ levelMode, battle, swaps });
  if (!pool.supported) return pool.reason;
  if (!pool.elevation) return `All 6 draft slots use the current pool (bucket ${pool.baseBucket}).`;
  return `${pool.elevation} of the 6 draft slots are elevated into the next pool (bucket ${pool.upgradeBucket}); the remaining ${6 - pool.elevation} use bucket ${pool.baseBucket}.`;
}
