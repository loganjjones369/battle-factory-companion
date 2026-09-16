import { POKEMON, getPokemon } from './factoryData';
import { calculateTeamStyle, calculateTeamType } from './scientistAnalysis';

const norm = (v) => String(v || '').trim().toLowerCase();
const itemKey = (v) => norm(v).replace(/[^a-z0-9]/g, '');

export function getDraftBlockedSpecies(draft = []) {
  return draft.map((x) => typeof x === 'string' ? x : x?.name).filter(Boolean);
}

/** Map an actual battle to the canonical 436-set pool used by this app. */
export function getOpponentRoundBucket(levelMode = 'Open Level', battle = 1) {
  const b = Math.max(1, Number(battle) || 1);
  const lastBattleOfRound = b % 7 === 0;
  const round = Math.ceil(b / 7);
  const effectiveRound = lastBattleOfRound ? round + 1 : round;

  if (levelMode === 'Open Level') {
    return effectiveRound >= 5 ? '6' : String(effectiveRound);
  }

  // Level 50 battles 1-3 use the separate low/mid-tier data that is not part
  // of the 436 Group-3 set database. Group-3 begins at Factory round 4.
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
  const observations = observedList(revealed);
  for (const observation of observations) {
    if (!team.some((set) => setMatchesObservation(set, observation))) return false;
  }
  return true;
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

/**
 * Exact candidate search over the canonical Factory set database.
 *
 * Important performance change: sets are restricted to the actual opponent
 * pool for this battle BEFORE team enumeration. The old engine walked every
 * Group-3 set regardless of battle number, which was both slower on phones
 * and could produce sets from the wrong Factory round.
 */
export function analyzeFactoryCandidates({
  draft = [],
  blockedSpecies = [],
  scientist = {},
  levelMode = 'Open Level',
  round = 1,
  battle = null,
  revealed = {},
  noland = false,
} = {}) {
  const battleNumber = battle == null ? Math.max(1, Number(round) || 1) : Math.max(1, Number(battle) || 1);
  const targetBucket = getOpponentRoundBucket(levelMode, battleNumber);
  const blocked = new Set((noland ? [] : (blockedSpecies.length ? blockedSpecies : getDraftBlockedSpecies(draft))).map(norm));
  const observations = observedList(revealed);
  const observedSpecies = new Set(observations.map((o) => norm(o.species)).filter(Boolean));

  if (!targetBucket) {
    return {
      matchingTeams: 0,
      possibleSpecies: [],
      blockedSpecies: [...blocked],
      roundBucket: null,
      observations,
      exact: true,
      supported: false,
      reason: 'This battle uses a low/mid-tier Level 50 Factory pool that is not included in the 436-set Group-3 dataset yet.',
    };
  }

  // Filter at the set level first. This is the key phone-performance fix.
  const pools = Object.values(POKEMON)
    .map((pokemon) => ({
      ...pokemon,
      sets: pokemon.sets.filter((set) => String(set.round) === String(targetBucket) && !blocked.has(norm(set.species))),
    }))
    .filter((pokemon) => pokemon.sets.length > 0);

  const possibleIds = new Set();
  const possibleBySpecies = {};
  let matchingTeams = 0;

  const mark = (set) => {
    const id = `${set.species}-${set.id}`;
    possibleIds.add(id);
    const key = norm(set.species);
    if (!possibleBySpecies[key]) possibleBySpecies[key] = [];
    if (!possibleBySpecies[key].some((x) => x.id === set.id)) possibleBySpecies[key].push(set);
  };

  // If a specific observed species is known, force it into the species trio.
  const requiredSpecies = [...observedSpecies];
  const candidateSpecies = pools.filter((p) => !requiredSpecies.length || requiredSpecies.includes(norm(p.name)) || !observedSpecies.size);

  for (let i = 0; i < candidateSpecies.length - 2; i += 1) {
    for (let j = i + 1; j < candidateSpecies.length - 1; j += 1) {
      for (let k = j + 1; k < candidateSpecies.length; k += 1) {
        const speciesTeam = [candidateSpecies[i], candidateSpecies[j], candidateSpecies[k]];
        const names = new Set(speciesTeam.map((p) => norm(p.name)));
        if (requiredSpecies.some((name) => !names.has(name))) continue;

        const [aSets, bSets, cSets] = speciesTeam.map((p) => p.sets);
        for (const a of aSets) for (const b of bSets) {
          if (itemKey(a.item) && itemKey(a.item) === itemKey(b.item)) continue;
          for (const c of cSets) {
            if (!legalTeam(a, b, c)) continue;
            const team = [a, b, c];
            if (!teamAllowed(team, blocked)) continue;
            if (!teamMatchesClue(team, scientist)) continue;
            if (!teamMatchesObservations(team, revealed)) continue;
            matchingTeams += 1;
            team.forEach(mark);
          }
        }
      }
    }
  }

  const allSpecies = Object.values(POKEMON).filter((pokemon) => !blocked.has(norm(pokemon.name)));
  const results = allSpecies.map((pokemon) => {
    const poolSets = pokemon.sets.filter((set) => String(set.round) === String(targetBucket));
    const possible = possibleBySpecies[norm(pokemon.name)] || [];
    const eliminated = poolSets.filter((set) => !possibleIds.has(`${set.species}-${set.id}`)).map((set) => {
      const observationsForSpecies = observations.filter((o) => norm(o.species) === norm(pokemon.name));
      if (observationsForSpecies.some((o) => !setMatchesObservation(set, o))) return { set, reason: 'Observed item/move mismatch' };
      if (observations.some((o) => itemKey(o.item) && itemKey(o.item) === itemKey(set.item) && norm(o.species) !== norm(set.species))) {
        return { set, reason: `Item Clause — ${set.item} already observed on a teammate` };
      }
      return { set, reason: 'No legal team matches the current Scientist clue and Factory constraints' };
    });
    return { pokemon, possible, eliminated };
  }).filter((row) => row.possible.length || row.eliminated.length);

  return {
    matchingTeams,
    possibleSpecies: results.filter((r) => r.possible.length),
    blockedSpecies: [...blocked],
    roundBucket: targetBucket,
    observations,
    exact: true,
    supported: true,
    battle: battleNumber,
  };
}

export function getPossibleSets({ species, blockedSpecies = [], occupiedItems = [], revealed = {}, roundBucket } = {}) {
  const pokemon = getPokemon(species);
  if (!pokemon) return { pokemon: null, possible: [], eliminated: [] };
  const blocked = new Set(blockedSpecies.map(norm));
  const occupied = new Set(occupiedItems.map(itemKey));
  const observed = observedList(revealed).find((o) => norm(o.species) === norm(pokemon.name));
  const pool = roundBucket == null ? pokemon.sets : pokemon.sets.filter((set) => String(set.round) === String(roundBucket));
  const possible = pool.filter((set) => !blocked.has(norm(pokemon.name)) && !occupied.has(itemKey(set.item) || '') && (!observed || setMatchesObservation(set, observed)));
  return {
    pokemon,
    possible,
    eliminated: pool.filter((set) => !possible.includes(set)).map((set) => ({ set, reason: blocked.has(norm(pokemon.name)) ? 'Blocked species' : 'Item, move, round, or team-constraint mismatch' })),
  };
}
