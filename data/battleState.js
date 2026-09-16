import { buildBattleState, getBlockedSpecies } from './factoryRules';

// Runtime state for one Factory streak. The state deliberately keeps only the
// information that can legitimately affect the next ordinary opponent.
export function createInitialBattleState(options = {}) {
  return buildBattleState(options);
}

export function advanceAfterBattle(state, { nextCurrentTeam = [], defeatedOpponent = [] } = {}) {
  const next = {
    ...state,
    currentTeam: nextCurrentTeam,
    previousOpponent: defeatedOpponent,
  };
  return {
    ...next,
    blockedSpecies: getBlockedSpecies({
      currentTeam: next.currentTeam,
      previousOpponent: next.previousOpponent,
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
