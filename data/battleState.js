import { buildBattleState, getBlockedSpecies } from './factoryRules';

// A Factory round contains seven battles. Battle 7/14/21/28/... is the
// round-ending battle (Noland is handled separately by the UI/rules layer).
export function getFactoryRound(battle = 1) {
  return Math.max(1, Math.ceil((Number(battle) || 1) / 7));
}

export function getBattleMilestone(battle = 1) {
  const n = Number(battle) || 1;
  return n > 0 && n % 7 === 0;
}

function speciesName(pokemon) {
  return String(typeof pokemon === 'string' ? pokemon : (pokemon?.species || pokemon?.name) || '').trim().toLowerCase();
}

// The Factory only permits one post-battle swap. With unique species on the
// player's team, a one-swap transition changes exactly one species.
export function detectSwapCount(previousTeam = [], nextTeam = []) {
  const previous = previousTeam.map(speciesName).filter(Boolean);
  const next = nextTeam.map(speciesName).filter(Boolean);
  if (previous.length !== 3 || next.length !== 3) return { valid: false, count: 0, reason: 'Both teams must contain exactly three Pokémon.' };

  const removed = previous.filter((name) => !next.includes(name));
  const added = next.filter((name) => !previous.includes(name));
  const count = Math.max(removed.length, added.length);

  if (count > 1) return { valid: false, count, reason: 'The Battle Factory permits only one swap after a battle.' };
  return { valid: true, count, reason: count === 1 ? 'One Pokémon was swapped.' : 'Team was kept.' };
}

export function createInitialBattleState(options = {}) {
  const state = buildBattleState(options);
  return { ...state, round: getFactoryRound(state.battle) };
}

export function advanceAfterBattle(
  state,
  { nextCurrentTeam = [], defeatedOpponent = [], didSwap = null } = {},
) {
  const detected = didSwap === null
    ? detectSwapCount(state.currentTeam || [], nextCurrentTeam)
    : { valid: true, count: didSwap ? 1 : 0, reason: didSwap ? 'One Pokémon was swapped.' : 'Team was kept.' };

  if (!detected.valid) {
    return { ...state, progressionError: detected.reason, swapAttempt: detected };
  }

  const nextBattle = Math.max(1, Number(state.battle) || 1) + 1;
  const nextSwaps = Math.max(0, Number(state.swaps) || 0) + detected.count;
  const next = {
    ...state,
    battle: nextBattle,
    round: getFactoryRound(nextBattle),
    swaps: nextSwaps,
    currentTeam: nextCurrentTeam,
    previousOpponent: defeatedOpponent,
    swapElevation: state.swapElevation,
    progressionError: null,
    swapAttempt: detected,
  };

  return {
    ...next,
    blockedSpecies: getBlockedSpecies({
      currentTeam: next.currentTeam,
      previousOpponent: next.previousOpponent,
      battle: next.battle,
      draft: next.draft,
      noland: next.noland,
    }),
  };
}

export function recordOpponentObservation(state, observation = {}) {
  return {
    ...state,
    revealed: {
      ...(state.revealed || {}),
      ...observation,
      moves: [...new Set([...(state.revealed?.moves || []), ...(observation.moves || [])])],
      items: [...new Set([...(state.revealed?.items || []), ...(observation.items || [])])],
    },
  };
}
