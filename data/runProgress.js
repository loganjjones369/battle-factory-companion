import { advanceAfterBattle, createInitialBattleState, getBattleMilestone } from './battleState';

export function createRun(options = {}) {
  return createInitialBattleState({
    level: options.level || '50',
    battle: options.battle || 1,
    round: options.round,
    swaps: options.swaps || 0,
    currentTeam: options.currentTeam || [],
    previousOpponent: options.previousOpponent || [],
    draft: options.draft || [],
    draftSlots: options.draftSlots || undefined,
    scientist: options.scientist || {},
    noland: options.noland || false,
    revealed: options.revealed || {},
  });
}

export function completeBattle(state, outcome = {}) {
  if (!outcome.won) return { state, celebration: null };

  const completedBattle = Number(state.battle) || 1;
  const nextState = advanceAfterBattle(state, {
    nextCurrentTeam: outcome.nextCurrentTeam || state.currentTeam || [],
    defeatedOpponent: outcome.defeatedOpponent || [],
    didSwap: outcome.didSwap ?? null,
  });

  if (nextState.progressionError) return { state: nextState, celebration: null };

  const milestone = getBattleMilestone(completedBattle);
  return {
    state: nextState,
    celebration: {
      type: milestone ? 'round' : 'battle',
      completedBattle,
      nextBattle: nextState.battle,
      durationMs: milestone ? 1800 : 950,
      intensity: milestone ? 'major' : 'normal',
    },
  };
}

export function getRunSummary(state = {}) {
  return {
    battle: Number(state.battle) || 1,
    round: Number(state.round) || 1,
    swaps: Number(state.swaps) || 0,
    swapElevation: Number(state.swapElevation) || 0,
    currentTeam: state.currentTeam || [],
    previousOpponent: state.previousOpponent || [],
    draft: state.draft || [],
    draftSlots: state.draftSlots || [],
    blockedSpecies: state.blockedSpecies || [],
  };
}
