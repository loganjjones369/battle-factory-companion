// Pokémon Emerald Battle Factory rules used by the Companion prediction engine.
// Battle Tower streak is intentionally NOT modeled: this app assumes the user
// does not use the Battle Tower and therefore has no Tower-streak input.

export const FACTORY_RULES = {
  teamSize: 3,
  draftSize: 6,
  noGlobalSeenSpeciesBan: true,
  ordinaryOpponentBlockedSlots: 6,
  ordinaryOpponentBlockSource: 'first battle: six draft species; later battles: current-player-team + immediately-previous-opponent-team',
  nolandIgnoresPlayerSpeciesForGeneration: true,
  itemClause: true,
  speciesClause: true,
  rentalIVsByRound: { 1: 3, 2: 6, 3: 9, 4: 12, 5: 15, 6: 21, 7: 31 },
  swapElevation: [
    { min: 0, max: 14, elevated: 0 },
    { min: 15, max: 21, elevated: 1 },
    { min: 22, max: 28, elevated: 2 },
    { min: 29, max: 35, elevated: 3 },
    { min: 36, max: 42, elevated: 4 },
    { min: 43, max: Infinity, elevated: 5 },
  ],
};

export function getSwapElevation(swaps = 0) {
  const n = Math.max(0, Number(swaps) || 0);
  return FACTORY_RULES.swapElevation.find((row) => n >= row.min && n <= row.max)?.elevated ?? 0;
}

export function getBlockedSpecies({ currentTeam = [], previousOpponent = [], draft = [], battle = 1, noland = false } = {}) {
  if (noland) return [];
  const source = Number(battle) <= 1 ? draft : [...currentTeam, ...previousOpponent];
  return [...new Set(source
    .map((p) => typeof p === 'string' ? p : (p?.species || p?.name))
    .filter(Boolean))];
}

export function hasDuplicateSpecies(sets = []) {
  const seen = new Set();
  for (const set of sets) {
    const species = String(set?.species || set?.name || '').toLowerCase();
    if (!species) continue;
    if (seen.has(species)) return true;
    seen.add(species);
  }
  return false;
}

export function hasDuplicateItems(sets = []) {
  const seen = new Set();
  for (const set of sets) {
    const item = String(set?.item || '').toLowerCase();
    if (!item) continue;
    if (seen.has(item)) return true;
    seen.add(item);
  }
  return false;
}

export function isLegalTeam(sets = []) {
  return sets.length === FACTORY_RULES.teamSize && !hasDuplicateSpecies(sets) && !hasDuplicateItems(sets);
}

export function buildBattleState({
  level = '50',
  round = 1,
  battle = 1,
  swaps = 0,
  currentTeam = [],
  previousOpponent = [],
  draft = [],
  draftSlots = [],
  scientist = {},
  noland = false,
  revealed = {},
} = {}) {
  return {
    level,
    round: Number(round) || 1,
    battle: Number(battle) || 1,
    swaps: Math.max(0, Number(swaps) || 0),
    swapElevation: getSwapElevation(swaps),
    currentTeam,
    previousOpponent,
    draft,
    draftSlots,
    scientist,
    noland: Boolean(noland),
    revealed,
    blockedSpecies: getBlockedSpecies({ currentTeam, previousOpponent, draft, battle, noland }),
  };
}
