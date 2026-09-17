import { POKEMON, getPokemon } from './factoryData';
import { calculateTeamStyle, calculateTeamType } from './scientistAnalysis';

const norm = (v) => String(v || '').trim().toLowerCase();
const itemKey = (v) => norm(v).replace(/[^a-z0-9]/g, '');

export function getDraftBlockedSpecies(draft = []) {
  return draft.map((x) => typeof x === 'string' ? x : (x?.species || x?.name)).filter(Boolean);
}

export function getOpponentRoundBucket(levelMode = 'Open Level', battle = 1) {
  const b = Math.max(1, Number(battle) || 1);
  const lastBattleOfRound = b % 7 === 0;
  const round = Math.ceil(b / 7);
  const effectiveRound = lastBattleOfRound ? round + 1 : round;
  if (levelMode === 'Open Level') return effectiveRound >= 5 ? '6' : String(effectiveRound);
  if (effectiveRound <= 3) return null;
  if (effectiveRound <= 7) return String(effectiveRound - 3);
  return '5';
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
  return observedList(revealed).every((observation) => team.some((set) => setMatchesObservation(set, observation)));
}

function teamMatchesClue(team, scientist) {
  if (scientist.type && norm(calculateTeamType(team)) !== norm(scientist.type)) return false;
  if (scientist.style !== undefined && scientist.style !== null && Number(scientist.style) >= 0) {
    if (calculateTeamStyle(team) !== Number(scientist.style)) return false;
  }
  return true;
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

function setKey(set) {
  return `${norm(set.species)}#${set.id ?? set.sourceId ?? set.setId ?? ''}`;
}

export function analyzeFactoryCandidates({
  draft = [],
  blockedSpecies,
  scientist = {},
  levelMode = 'Open Level',
  round = 1,
  battle = null,
  revealed = {},
  noland = false,
} = {}) {
  const battleNumber = battle == null ? Math.max(1, Number(round) || 1) : Math.max(1, Number(battle) || 1);
  const targetBucket = getOpponentRoundBucket(levelMode, battleNumber);
  const suppliedBlocked = Array.isArray(blockedSpecies);
  const fallbackBlocked = getDraftBlockedSpecies(draft);
  const blocked = new Set((noland ? [] : (suppliedBlocked ? blockedSpecies : fallbackBlocked)).map(norm));
  const observations = observedList(revealed);
  const observedSpecies = new Set(observations.map((o) => norm(o.species)).filter(Boolean));

  if (!targetBucket) {
    return {
      matchingTeams: [],
      rankedSets: [],
      possibleSpecies: [],
      blockedSpecies: [...blocked],
      roundBucket: null,
      observations,
      exact: true,
      supported: false,
      battle: battleNumber,
      reason: 'This battle uses a low/mid-tier Level 50 Factory pool that is not included in the 436-set Group-3 dataset yet.',
    };
  }

  const pools = Object.values(POKEMON)
    .map((pokemon) => ({
      ...pokemon,
      sets: pokemon.sets.filter((set) => String(set.round) === String(targetBucket) && !blocked.has(norm(set.species))),
    }))
    .filter((pokemon) => pokemon.sets.length > 0);

  const matchingTeams = [];
  const setOccurrences = new Map();

  const mark = (set) => {
    const key = setKey(set);
    const current = setOccurrences.get(key);
    if (current) current.count += 1;
    else setOccurrences.set(key, { set, count: 1 });
  };

  for (let i = 0; i < pools.length - 2; i += 1) {
    for (let j = i + 1; j < pools.length - 1; j += 1) {
      for (let k = j + 1; k < pools.length; k += 1) {
        const speciesTeam = [pools[i], pools[j], pools[k]];
        const names = new Set(speciesTeam.map((p) => norm(p.name)));
        if ([...observedSpecies].some((name) => !names.has(name))) continue;

        const [aSets, bSets, cSets] = speciesTeam.map((p) => p.sets);
        for (const a of aSets) {
          for (const b of bSets) {
            if (itemKey(a.item) && itemKey(a.item) === itemKey(b.item)) continue;
            for (const c of cSets) {
              if (!legalTeam(a, b, c)) continue;
              const team = [a, b, c];
              if (!teamAllowed(team, blocked)) continue;
              if (!teamMatchesClue(team, scientist)) continue;
              if (!teamMatchesObservations(team, revealed)) continue;
              matchingTeams.push(team);
              team.forEach(mark);
            }
          }
        }
      }
    }
  }

  const rankedSets = [...setOccurrences.values()]
    .sort((a, b) => b.count - a.count || String(a.set.species).localeCompare(String(b.set.species)))
    .map((entry) => ({
      ...entry,
      frequency: matchingTeams.length ? entry.count / matchingTeams.length : 0,
    }));

  const possibleBySpecies = {};
  rankedSets.forEach((entry) => {
    const key = norm(entry.set.species);
    if (!possibleBySpecies[key]) possibleBySpecies[key] = [];
    possibleBySpecies[key].push(entry.set);
  });

  const possibleSpecies = Object.values(POKEMON)
    .filter((pokemon) => possibleBySpecies[norm(pokemon.name)]?.length)
    .map((pokemon) => ({
      pokemon,
      possible: possibleBySpecies[norm(pokemon.name)],
    }))
    .sort((a, b) => {
      const aBest = rankedSets.find((x) => norm(x.set.species) === norm(a.pokemon.name))?.count || 0;
      const bBest = rankedSets.find((x) => norm(x.set.species) === norm(b.pokemon.name))?.count || 0;
      return bBest - aBest || String(a.pokemon.name).localeCompare(String(b.pokemon.name));
    });

  return {
    matchingTeams,
    rankedSets,
    possibleSpecies,
    blockedSpecies: [...blocked],
    roundBucket: targetBucket,
    observations,
    exact: true,
    supported: true,
    battle: battleNumber,
    rankingNote: 'Ranked by frequency among the surviving legal teams. This is a candidate-frequency ranking, not a guaranteed in-game probability because the original Factory generator uses rejection sampling rather than uniform selection from all legal teams.',
  };
}

export function getPossibleSets({ species, blockedSpecies = [], occupiedItems = [], revealed = {}, roundBucket } = {}) {
  const pokemon = getPokemon(species);
  if (!pokemon) return { pokemon: null, possible: [], eliminated: [] };
  const blocked = new Set(blockedSpecies.map(norm));
  const occupied = new Set(occupiedItems.map(itemKey));
  const observed = observedList(revealed).find((o) => norm(o.species) === norm(pokemon.name));
  const pool = roundBucket == null ? pokemon.sets : pokemon.sets.filter((set) => String(set.round) === String(roundBucket));
  const possible = pool.filter((set) => !blocked.has(norm(pokemon.name)) && !occupied.has(itemKey(set.item)) && (!observed || setMatchesObservation(set, observed)));
  return {
    pokemon,
    possible,
    eliminated: pool.filter((set) => !possible.includes(set)).map((set) => ({
      set,
      reason: blocked.has(norm(pokemon.name)) ? 'Blocked species' : 'Item, move, round, or team-constraint mismatch',
    })),
  };
}
