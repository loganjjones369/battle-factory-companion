import { buildBattleState, getBlockedSpecies, getSwapElevation, isNolandBattle } from './factoryRules';
import { makeSwapReplacement } from './setIdentity';

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

function setIdentityKey(pokemon) {
  if (!pokemon) return '';
  const species = speciesName(pokemon);
  const setId = pokemon?.setId ?? pokemon?.factorySetId ?? (pokemon?.moves && pokemon?.item ? pokemon?.id : null);
  return `${species}#${setId ?? ''}`;
}

function uniqueByIdentity(list = []) {
  const seen = new Set();
  return list.filter((pokemon) => {
    const key = setIdentityKey(pokemon);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * The purple History area is deliberately short-term memory:
 * exactly three Pokémon from the previous battle that are not on the new team.
 */
export function buildPreviousBattleMemory(previousTeam = [], defeatedOpponent = [], nextTeam = []) {
  const nextKeys = new Set((nextTeam || []).map(setIdentityKey).filter(Boolean));
  return uniqueByIdentity([...(previousTeam || []), ...(defeatedOpponent || [])])
    .filter((pokemon) => !nextKeys.has(setIdentityKey(pokemon)))
    .slice(0, 3);
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

export const BATTLE_STATUSES = ['healthy', 'brn', 'psn', 'tox', 'par', 'slp', 'frz'];
export const WEATHER_STATES = ['none', 'sun', 'rain', 'sand', 'hail'];

export function normalizeBattleConditions(input = {}) {
  const normalizeStatus = (value) => {
    const key = String(value || 'healthy').trim().toLowerCase();
    if (['burn', 'brn'].includes(key)) return 'brn';
    if (['poison', 'psn'].includes(key)) return 'psn';
    if (['toxic', 'tox'].includes(key)) return 'tox';
    if (['paralysis', 'par'].includes(key)) return 'par';
    if (['sleep', 'slp'].includes(key)) return 'slp';
    if (['freeze', 'frz'].includes(key)) return 'frz';
    return 'healthy';
  };
  const normalizeSide = (side = {}) => ({
    hpPercent: side.hpPercent == null ? 100 : Math.max(0, Math.min(100, Number(side.hpPercent) || 0)),
    status: normalizeStatus(side.status),
    statStages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...(side.statStages || {}) },
    substitute: Boolean(side.substitute),
    reflect: Boolean(side.reflect),
    lightScreen: Boolean(side.lightScreen),
    spikes: Math.max(0, Math.min(3, Number(side.spikes) || 0)),
    stealthRock: Boolean(side.stealthRock),
  });
  return {
    weather: WEATHER_STATES.includes(String(input.weather || 'none').toLowerCase()) ? String(input.weather || 'none').toLowerCase() : 'none',
    weatherTurns: Math.max(0, Number(input.weatherTurns) || 0),
    priority: input.priority == null ? null : String(input.priority),
    team: normalizeSide(input.team),
    opponent: normalizeSide(input.opponent),
  };
}

export function updateBattleConditions(state, patch = {}) {
  return { ...state, battleConditions: normalizeBattleConditions({ ...(state.battleConditions || {}), ...(patch || {}) }) };
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
  const initialHistory = options.previousBattleMemory?.length
    ? options.previousBattleMemory
    : (options.draft || []).filter((pokemon) => !currentTeam.some((teamPokemon) => setIdentityKey(teamPokemon) === setIdentityKey(pokemon))).slice(0, 3);
  return { ...state, currentTeam, previousBattleMemory: initialHistory, round: getFactoryRound(state.battle), swapElevation: getSwapElevation(state.swaps), noland: isNolandBattle(state.battle), knockedOut: normalizeKO(options.knockedOut || state.knockedOut), battleConditions: normalizeBattleConditions(options.battleConditions || state.battleConditions) };
}

export function advanceAfterBattle(state, { nextCurrentTeam = [], defeatedOpponent = [], didSwap = null } = {}) {
  const detected = didSwap === null
    ? detectSwapCount(state.currentTeam || [], nextCurrentTeam)
    : { valid: true, count: didSwap ? 1 : 0, reason: didSwap ? 'One Pokémon was swapped.' : 'Team was kept.' };
  if (!detected.valid) return { ...state, progressionError: detected.reason, swapAttempt: detected };
  const nextBattle = Math.max(1, Number(state.battle) || 1) + 1;
  const nextSwaps = Math.max(0, Number(state.swaps) || 0) + detected.count;
  const normalizedTeam = (nextCurrentTeam || []).map((pokemon, index) => ({ ...pokemon, teamSlot: pokemon?.teamSlot ?? index }));
  const previousBattleMemory = buildPreviousBattleMemory(state.currentTeam || [], defeatedOpponent || [], normalizedTeam);
  const next = {
    ...state,
    battle: nextBattle,
    round: getFactoryRound(nextBattle),
    swaps: nextSwaps,
    currentTeam: normalizedTeam,
    previousOpponent: defeatedOpponent,
    previousBattleMemory,
    swapElevation: getSwapElevation(nextSwaps),
    progressionError: null,
    swapAttempt: detected,
    knockedOut: { team: [], opponent: [] },
    battleConditions: normalizeBattleConditions(),
    noland: isNolandBattle(nextBattle),
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
