import { POKEMON, getPokemon } from './factoryData';
import { calculateTeamStyle, calculateTeamType, calculateTeamRoundBucket } from './scientistAnalysis';

const norm = (v) => String(v || '').trim().toLowerCase();
const itemKey = (v) => norm(v).replace(/[^a-z0-9]/g, '');

export function getDraftBlockedSpecies(draft = []) {
  return draft.map((x) => typeof x === 'string' ? x : x?.name).filter(Boolean);
}

function roundBucket(levelMode, round) {
  const r = Number(round) || 1;
  if (levelMode === 'Open Level') return r >= 5 ? '6' : String(r);
  if (r >= 8) return '5';
  return String(Math.max(1, r - 3));
}

function observedList(revealed = {}) {
  if (Array.isArray(revealed.observations)) return revealed.observations;
  if (revealed.species) return [{ species: revealed.species, item: revealed.item, moves: revealed.moves || [] }];
  return [];
}

function setMatchesObservation(set, observation) {
  if (!observation?.species || norm(set.species) !== norm(observation.species)) return false;
  if (observation.item && itemKey(set.item) !== itemKey(observation.item)) return false;
  const required = (observation.moves || []).map(norm);
  return required.every((move) => (set.moves || []).some((m) => norm(m) === move));
}

function teamMatchesObservations(team, revealed) {
  const observations = observedList(revealed);
  for (const observation of observations) {
    const matching = team.filter((set) => setMatchesObservation(set, observation));
    if (!matching.length) return false;
  }
  return true;
}

function teamMatchesClue(team, scientist, levelMode, round) {
  if (scientist.type && norm(calculateTeamType(team)) !== norm(scientist.type)) return false;
  if (scientist.style !== undefined && scientist.style !== null && Number(scientist.style) >= 0) {
    if (calculateTeamStyle(team) !== Number(scientist.style)) return false;
  }
  return calculateTeamRoundBucket(team) === roundBucket(levelMode, round);
}

function legalTeam(a, b, c) {
  const species = [a.species, b.species, c.species].map(norm);
  if (new Set(species).size !== 3) return false;
  const items = [a.item, b.item, c.item].map(itemKey).filter(Boolean);
  return new Set(items).size === items.length;
}

function teamAllowed(team, blocked) {
  return team.every((set) => !blocked.has(norm(set.species)));
}

/**
 * Exact candidate search over the 436 canonical sets.
 * It evaluates legal 3-set teams, applies Scientist type/style/round clues,
 * current six-species exclusions, Item Clause and observed set evidence, then
 * returns the actual surviving sets. This is deliberately an exact possibility
 * engine; it does not assign fake probabilities to teams that are not sampled
 * uniformly by the game.
 */
export function analyzeFactoryCandidates({
  draft = [],
  blockedSpecies = [],
  scientist = {},
  levelMode = 'Open Level',
  round = 1,
  revealed = {},
  noland = false,
} = {}) {
  const blocked = new Set((noland ? [] : (blockedSpecies.length ? blockedSpecies : getDraftBlockedSpecies(draft))).map(norm));
  const observations = observedList(revealed);
  const observedSpecies = new Set(observations.map((o) => norm(o.species)).filter(Boolean));
  const pools = Object.values(POKEMON).filter((p) => !blocked.has(norm(p.name)));
  const possibleIds = new Set();
  const possibleBySpecies = {};
  let matchingTeams = 0;

  const mark = (set) => {
    possibleIds.add(`${set.species}-${set.id}`);
    const key = norm(set.species);
    if (!possibleBySpecies[key]) possibleBySpecies[key] = [];
    if (!possibleBySpecies[key].some((x) => x.id === set.id)) possibleBySpecies[key].push(set);
  };

  for (let i = 0; i < pools.length - 2; i += 1) {
    for (let j = i + 1; j < pools.length - 1; j += 1) {
      for (let k = j + 1; k < pools.length; k += 1) {
        const speciesTeam = [pools[i], pools[j], pools[k]];
        const names = new Set(speciesTeam.map((p) => norm(p.name)));
        if (observedSpecies.size && [...observedSpecies].some((name) => !names.has(name))) continue;
        const aSets = pools[i].sets;
        const bSets = pools[j].sets;
        const cSets = pools[k].sets;
        for (const a of aSets) for (const b of bSets) {
          if (itemKey(a.item) && itemKey(a.item) === itemKey(b.item)) continue;
          for (const c of cSets) {
            if (!legalTeam(a, b, c)) continue;
            const team = [a, b, c];
            if (!teamAllowed(team, blocked)) continue;
            if (!teamMatchesClue(team, scientist, levelMode, round)) continue;
            if (!teamMatchesObservations(team, revealed)) continue;
            matchingTeams += 1;
            team.forEach(mark);
          }
        }
      }
    }
  }

  const results = Object.values(POKEMON).filter((pokemon) => !blocked.has(norm(pokemon.name))).map((pokemon) => {
    const possible = possibleBySpecies[norm(pokemon.name)] || [];
    const eliminated = pokemon.sets.filter((set) => !possibleIds.has(`${set.species}-${set.id}`)).map((set) => {
      const observationsForSpecies = observations.filter((o) => norm(o.species) === norm(pokemon.name));
      if (blocked.has(norm(pokemon.name))) return { set, reason: 'Blocked species' };
      if (observationsForSpecies.some((o) => !setMatchesObservation(set, o))) return { set, reason: 'Observed item/move mismatch' };
      if (observations.some((o) => itemKey(o.item) === itemKey(set.item) && norm(o.species) !== norm(set.species))) return { set, reason: `Item Clause — ${set.item} already observed on a teammate` };
      return { set, reason: 'No legal team matches the current Scientist clue and Factory constraints' };
    });
    return { pokemon, possible, eliminated };
  }).filter((row) => row.possible.length || row.eliminated.length);

  return {
    matchingTeams,
    possibleSpecies: results.filter((r) => r.possible.length),
    blockedSpecies: [...blocked],
    roundBucket: roundBucket(levelMode, round),
    observations,
    exact: true,
  };
}

export function getPossibleSets({ species, blockedSpecies = [], occupiedItems = [], revealed = {} } = {}) {
  const pokemon = getPokemon(species);
  if (!pokemon) return { pokemon: null, possible: [], eliminated: [] };
  const blocked = new Set(blockedSpecies.map(norm));
  const occupied = new Set(occupiedItems.map(itemKey));
  const observed = observedList(revealed).find((o) => norm(o.species) === norm(pokemon.name));
  const possible = pokemon.sets.filter((set) => !blocked.has(norm(pokemon.name)) && !occupied.has(itemKey(set.item)) && (!observed || setMatchesObservation(set, observed)));
  return { pokemon, possible, eliminated: pokemon.sets.filter((set) => !possible.includes(set)).map((set) => ({ set, reason: blocked.has(norm(pokemon.name)) ? 'Blocked species' : 'Item, move, or team-constraint mismatch' })) };
}
