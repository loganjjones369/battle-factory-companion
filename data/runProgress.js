import { advanceAfterBattle, createInitialBattleState, getBattleMilestone } from './battleState';
import { recordBattleHistory, getHistoricalObservations } from './battleHistory';
import { getCurrentScientist } from './scientistSession';

let ACTIVE_RUN_CONTEXT = {
  currentTeam: [], previousOpponent: [], battle: 1, swaps: 0, battleHistory: [], historicalObservations: [], knockedOut: { team: [], opponent: [] }, scientist: {}, revealed: {}, noland: false,
};

function syncActiveContext(state = {}) {
  ACTIVE_RUN_CONTEXT = {
    currentTeam: state.currentTeam || [], previousOpponent: state.previousOpponent || [], battle: Number(state.battle) || 1, swaps: Number(state.swaps) || 0,
    battleHistory: state.battleHistory || [], historicalObservations: getHistoricalObservations(state.battleHistory || []), knockedOut: state.knockedOut || { team: [], opponent: [] }, scientist: state.scientist || {}, revealed: state.revealed || {}, noland: Boolean(state.noland),
  };
}

export function getActiveRunContext() { return ACTIVE_RUN_CONTEXT; }

export function updateRunScientist(state, scientist = {}) {
  const next = { ...state, scientist: { ...(state.scientist || {}), ...(scientist || {}) } };
  syncActiveContext(next);
  return next;
}

export function updateRunRevealed(state, revealed = {}) {
  const next = { ...state, revealed: { ...(state.revealed || {}), ...(revealed || {}) } };
  syncActiveContext(next);
  return next;
}

export function createRun(options = {}) {
  const scientist = Object.keys(options.scientist || {}).length ? options.scientist : getCurrentScientist();
  const state = createInitialBattleState({
    level: options.level || '50', battle: options.battle || 1, round: options.round, swaps: options.swaps || 0,
    currentTeam: options.currentTeam || [], previousOpponent: options.previousOpponent || [], draft: options.draft || [],
    draftSlots: options.draftSlots || undefined, scientist, noland: options.noland || false,
    revealed: options.revealed || {}, knockedOut: options.knockedOut || { team: [], opponent: [] },
  });
  state.battleHistory = options.battleHistory || [];
  state.historicalObservations = getHistoricalObservations(state.battleHistory);
  syncActiveContext(state);
  return state;
}

export function completeBattle(state, outcome = {}) {
  if (!outcome.won) return { state, celebration: null };
  const completedBattle = Number(state.battle) || 1;
  const history = recordBattleHistory(state.battleHistory || [], completedBattle, outcome.defeatedOpponent || [], outcome.observations || []);
  const nextState = advanceAfterBattle(state, { nextCurrentTeam: outcome.nextCurrentTeam || state.currentTeam || [], defeatedOpponent: outcome.defeatedOpponent || [], didSwap: outcome.didSwap ?? null });
  if (nextState.progressionError) return { state: nextState, celebration: null };
  nextState.battleHistory = history;
  nextState.historicalObservations = getHistoricalObservations(history);
  nextState.revealed = { ...(nextState.revealed || {}), observations: nextState.historicalObservations };
  nextState.scientist = { ...(state.scientist || {}) };
  syncActiveContext(nextState);
  const milestone = getBattleMilestone(completedBattle);
  return { state: nextState, celebration: { type: milestone ? 'round' : 'battle', completedBattle, nextBattle: nextState.battle, durationMs: milestone ? 1800 : 950, intensity: milestone ? 'major' : 'normal' } };
}

export function getRunSummary(state = {}) {
  return {
    battle: Number(state.battle) || 1, round: Number(state.round) || 1, swaps: Number(state.swaps) || 0, swapElevation: Number(state.swapElevation) || 0,
    currentTeam: state.currentTeam || [], previousOpponent: state.previousOpponent || [], draft: state.draft || [], draftSlots: state.draftSlots || [], scientist: state.scientist || {},
    blockedSpecies: state.blockedSpecies || [], battleHistory: state.battleHistory || [], historicalObservations: state.historicalObservations || [], knockedOut: state.knockedOut || { team: [], opponent: [] }, revealed: state.revealed || {}, noland: Boolean(state.noland),
  };
}