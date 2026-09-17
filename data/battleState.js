import { buildBattleState, getBlockedSpecies, getSwapElevation } from './factoryRules';
import { makeSwapReplacement } from './setIdentity';

export function getFactoryRound(battle = 1) {
  return Math.max(1, Math.ceil((Number(battle) || 1) / 7));
}

export function getBattleMilestone(battle = 1) {
  const n = Number(battle) || 1;
  return [28, 35, 42].includes(n);
}

function speciesName(pokemon) {
  return String(typeof pokemon === 'string' ? pokemon : (pokemon?.species || pokemon?.name) || '').trim().toLowerCase();
}

function setIdentityKey(pokemon) {
  if (!pokemon) return '';
  const species = speciesName(pokemon);
  const setId = pokemon?.setId ?? pokemon?.factorySetId ?? (pokemon?.moves && pokemon?.item ? pokemon?.id : null);
  return `${species}#${setId ?? ''}`;
}

export function detectSwapCount(previousTeam = [], nextTeam = []) {
  const previous = previousTeam.map(speciesName).filter(Boolean);
  const next = nextTeam.map(speciesName).filter(Boolean);
  if (previous.length !== 3 || next.length !== 3) return { valid: false, count: 0, reason: 'Both teams must contain exactly three Pokémon.' };
  const removed = previous.filter((name) => !next.includes(name));
  const added = next.filter((name) => !previous.includes(name));
  const count = Math.max(removed.length, added.length);
  if (count > 1) return { valid: false, count, reason: 'The Battle Factory permits only one Pokémon swap after a battle.' };
  return { valid: true, count, reason: count === 1 ? 'One Pokémon was swapped.' : 'Team was kept.' };
}

export function replaceTeamSlot(team = [], outgoing = null, incoming = null) {
  if (!outgoing || !incoming || team.length !== 3) return team;
  const outgoingIndex = team.findIndex((pokemon) => setIdentityKey(pokemon) === setIdentityKey(outgoing));
  if (outgoingIndex < 0) return team;
  const teamSlot = outgoing?.teamSlot ?? outgoingIndex;
  const replacement = makeSwapReplacement(incoming, teamSlot);
  return team.map((pokemon, index) => index === outgoingIndex ? replacement : { ...pokemon, teamSlot: pokemon?.teamSlot ?? index });
}

function normalizeKO(ko = {}) {
  return {
    team: Array.isArray(ko.team) ? ko.team.map(Number).filter(Number.isInteger) : [],
    opponent: Array.isArray(ko.opponent) ? ko.opponent.map(Number).filter(Number.isInteger) : [],
  };
}

export function setKnockedOut(state, side, index, knockedOut = true) {
  if (!['team', 'opponent'].includes(side)) return state;
  const ko = normalizeKO(state.knockedOut);
  const target = ko[side].filter((value) => value !== Number(index));
  if (knockedOut) target.push(Number(index));
  return { ...state, knockedOut: { ...ko, [side]: [...new Set(target)].sort((a, b) => a - b) } };
}

export function clearKnockedOut(state) {
  return { ...state, knockedOut: { team: [], opponent: [] } };
}

export function isKnockedOut(state, side, index) {
  return normalizeKO(state?.knockedOut)[side]?.includes(Number(index)) || false;
}

export function createInitialBattleState(options = {}) {
  const state = buildBattleState(options);
  const currentTeam = (state.currentTeam || []).map((pokemon, index) => ({ ...pokemon, teamSlot: pokemon?.teamSlot ?? index }));
  return { ...state, currentTeam, round: getFactoryRound(state.battle), swapElevation: getSwapElevation(state.swaps), knockedOut: normalizeKO(options.knockedOut || state.knockedOut) };
}

export function advanceAfterBattle(state, { nextCurrentTeam = [], defeatedOpponent = [], didSwap = null } = {}) {
  const detected = didSwap === null
    ? detectSwapCount(state.currentTeam || [], nextCurrentTeam)
    : { valid: true, count: didSwap ? 1 : 0, reason: didSwap ? 'One Pokémon was swapped.' : 'Team was kept.' };
  if (!detected.valid) return { ...state, progressionError: detected.reason, swapAttempt: detected };
  const nextBattle = Math.max(1, Number(state.battle) || 1) + 1;
  const nextSwaps = Math.max(0, Number(state.swaps) || 0) + detected.count;
  const normalizedTeam = (nextCurrentTeam || []).map((pokemon, index) => ({ ...pokemon, teamSlot: pokemon?.teamSlot ?? index }));
  const next = {
    ...state,
    battle: nextBattle,
    round: getFactoryRound(nextBattle),
    swaps: nextSwaps,
    currentTeam: normalizedTeam,
    previousOpponent: defeatedOpponent,
    swapElevation: getSwapElevation(nextSwaps),
    progressionError: null,
    swapAttempt: detected,
    knockedOut: { team: [], opponent: [] },
  };
  return {
    ...next,
    blockedSpecies: getBlockedSpecies({ currentTeam: next.currentTeam, previousOpponent: next.previousOpponent, battle: next.battle, draft: next.draft, noland: next.noland }),
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
