// Pokémon Emerald Battle Factory rules used by the Companion prediction engine.
// Battle Tower streak is retained as an advanced internal setting. It defaults to 0
// because the normal Companion workflow does not use the Battle Tower.

export const FACTORY_RULES = {
  teamSize: 3,
  draftSize: 6,
  noGlobalSeenSpeciesBan: true,
  ordinaryOpponentBlockedSlots: 6,
  ordinaryOpponentBlockSource: 'first battle: six draft species; later battles: current-player-team + immediately-previous-opponent-team',
  nolandIgnoresPlayerSpeciesForGeneration: true,
  itemClause: true,
  speciesClause: true,
  defaultBattleTowerStreak: 0,
  nolandEveryBattles: 21,
  nolandSilverIV: 15,
  nolandGoldIV: 31,
  nolandLevel50LateLegendaryMaxSet: 4,
  nolandLevel50LateLegendarySpecies: ['Articuno', 'Zapdos', 'Moltres', 'Raikou', 'Entei', 'Suicune'],
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

export function getFactoryIVForRound(round = 1) {
  const r = Math.max(1, Math.min(7, Number(round) || 1));
  return [0, 3, 6, 9, 12, 15, 21, 31][r];
}

export function getOpponentFactoryIV({ battle = 1, battleTowerStreak = FACTORY_RULES.defaultBattleTowerStreak, round = null, noland = false } = {}) {
  const b = Math.max(1, Number(battle) || 1);
  if (noland) return getNolandFactoryIV({ gold: isNolandGoldBattle(b) });
  const explicitRound = round == null ? null : Math.max(1, Math.min(7, Number(round) || 1));
  const derivedRound = Math.min(7, Math.ceil(b / 7));
  const streak = Math.max(0, Number(battleTowerStreak) || 0);
  const challengeNum = Math.floor(streak / 7);
  const baseTier = Math.min(7, challengeNum + 1);
  const tier = explicitRound || (b % 7 === 0 ? Math.min(7, baseTier + 1) : baseTier);
  return getFactoryIVForRound(explicitRound || (b % 7 === 0 ? Math.min(7, baseTier + 1) : baseTier));
}

export function getFactoryRoundForBattle(battle = 1) {
  return Math.max(1, Math.min(7, Math.ceil(Math.max(1, Number(battle) || 1) / 7)));
}

export function getNextFactoryRound(battle = 1) {
  return Math.min(7, getFactoryRoundForBattle(Math.max(1, Number(battle) || 1) + 1));
}

export function getNextRoundIV({ battle = 1, noland = false, battleTowerStreak = FACTORY_RULES.defaultBattleTowerStreak } = {}) {
  const nextRound = getNextFactoryRound(battle);
  return noland ? getNolandFactoryIV({ gold: isNolandGoldBattle(battle) }) : getFactoryIVForRound(nextRound);
}

export function getNolandFactoryIV({ gold = false } = {}) {
  return gold ? FACTORY_RULES.nolandGoldIV : FACTORY_RULES.nolandSilverIV;
}

export function isNolandBattle(battle = 1) {
  const b = Math.max(1, Number(battle) || 1);
  return b % FACTORY_RULES.nolandEveryBattles === 0;
}

export function isNolandGoldBattle(battle = 1) {
  const b = Math.max(1, Number(battle) || 1);
  return isNolandBattle(b) && b >= 42;
}

export function getFactoryIVSource({ battle = 1, isElevated = false, noland = false, battleTowerStreak = FACTORY_RULES.defaultBattleTowerStreak } = {}) {
  const b = Math.max(1, Number(battle) || 1);
  if (noland) return isNolandGoldBattle(b) ? 'NOLAND GOLD' : 'NOLAND SILVER';
  if (isElevated) return 'ELEVATED RENTAL';
  return `REGULAR OPPONENT • TOWER STREAK ${Math.max(0, Number(battleTowerStreak) || 0)}`;
}

export function getSwapElevation(swaps = 0) {
  const n = Math.max(0, Number(swaps) || 0);
  return FACTORY_RULES.swapElevation.find((row) => n >= row.min && n <= row.max)?.elevated ?? 0;
}

export function getBlockedSpecies({ currentTeam = [], previousOpponent = [], draft = [], battle = 1, noland = false } = {}) {
  if (noland) return [];
  const source = Number(battle) <= 1 ? draft : [...currentTeam, ...previousOpponent];
  return [...new Set(source.map((p) => typeof p === 'string' ? p : (p?.species || p?.name)).filter(Boolean))];
}

export function getNextRoundPreview({ currentTeam = [], previousOpponent = [], battle = 1, noland = false } = {}) {
  const nextBattle = Math.max(1, Number(battle) || 1) + 1;
  const blockedSpecies = getBlockedSpecies({ currentTeam, previousOpponent, battle: nextBattle, noland });
  return {
    nextBattle,
    nextRound: getNextFactoryRound(battle),
    nextRoundIV: getNextRoundIV({ battle, noland }),
    blockedSpecies,
    blockedCount: blockedSpecies.length,
    noland: Boolean(noland),
  };
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
  battleTowerStreak = FACTORY_RULES.defaultBattleTowerStreak,
} = {}) {
  return {
    level,
    round: Number(round) || 1,
    battle: Number(battle) || 1,
    swaps: Math.max(0, Number(swaps) || 0),
    battleTowerStreak: Math.max(0, Number(battleTowerStreak) || 0),
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
