import { POKEMON, getPokemon } from './factoryData';
import { calculateTeamStyle, calculateTeamType } from './scientistAnalysis';

const norm = (v) => String(v || '').trim().toLowerCase();
const itemKey = (v) => norm(v).replace(/[^a-z0-9]/g, '');
const ANALYSIS_CACHE = new Map();
const CACHE_LIMIT = 12;

export function getDraftBlockedSpecies(draft = []) { return draft.map((x) => typeof x === 'string' ? x : (x?.species || x?.name)).filter(Boolean); }

export function getOpponentRoundBucket(levelMode = 'Open Level', battle = 1) {
  const b = Math.max(1, Number(battle) || 1); const round = Math.ceil(b / 7); const effectiveRound = b % 7 === 0 ? round + 1 : round;
  if (levelMode === 'Open Level') return effectiveRound >= 5 ? '6' : String(effectiveRound);
  if (effectiveRound <= 3) return null;
  if (effectiveRound <= 7) return String(effectiveRound - 3);
  return '5';
}
function observedList(revealed = {}) { if (Array.isArray(revealed.observations)) return revealed.observations; if (revealed.species) return [{ species: revealed.species, item: revealed.item, moves: revealed.moves || [] }]; return []; }
function moveNames(set) { return (set?.moves || []).map((m) => typeof m === 'string' ? m : m?.name).filter(Boolean); }
function setKey(set) { return `${norm(set.species)}#${set.id ?? set.sourceId ?? set.setId ?? ''}`; }
function setMatchesObservation(set, observation) { if (!observation?.species || norm(set.species) !== norm(observation.species)) return false; if (observation.item && itemKey(set.item) !== itemKey(observation.item)) return false; const moves = moveNames(set).map(norm); return (observation.moves || []).filter(Boolean).map(norm).every((move) => moves.includes(move)); }
function teamMatchesObservations(team, revealed) { return observedList(revealed).every((o) => team.some((set) => setMatchesObservation(set, o))); }
function teamMatchesClue(team, scientist) { if (scientist.type && norm(calculateTeamType(team)) !== norm(scientist.type)) return false; if (scientist.style !== undefined && scientist.style !== null && Number(scientist.style) >= 0 && calculateTeamStyle(team) !== Number(scientist.style)) return false; return true; }
function legalTeam(a, b, c) { if (new Set([a.species, b.species, c.species].map(norm)).size !== 3) return false; const items = [a.item, b.item, c.item].map(itemKey).filter(Boolean); return new Set(items).size === items.length; }
function cacheKey({ draft, blockedSpecies, scientist, levelMode, battleNumber, revealed, noland, currentTeam, previousOpponent }) {
  const sets = (xs) => (xs || []).map((x) => setKey(x)).sort().join(',');
  const obs = observedList(revealed).map((o) => `${norm(o.species)}|${itemKey(o.item)}|${(o.moves || []).map(norm).sort().join('/')}`).sort().join(';');
  return [levelMode, battleNumber, JSON.stringify(scientist || {}), (blockedSpecies || []).map(norm).sort().join(','), obs, noland ? 'N' : 'O', sets(currentTeam), sets(previousOpponent), sets(draft)].join('||');
}
function remember(key, value) {
  if (ANALYSIS_CACHE.has(key)) ANALYSIS_CACHE.delete(key);
  ANALYSIS_CACHE.set(key, value);
  while (ANALYSIS_CACHE.size > CACHE_LIMIT) ANALYSIS_CACHE.delete(ANALYSIS_CACHE.keys().next().value);
  return value;
}

export function analyzeFactoryCandidates({ draft = [], blockedSpecies, scientist = {}, levelMode = 'Open Level', round = 1, battle = null, revealed = {}, noland = false, currentTeam = [], previousOpponent = [] } = {}) {
  const battleNumber = battle == null ? Math.max(1, Number(round) || 1) : Math.max(1, Number(battle) || 1);
  const targetBucket = getOpponentRoundBucket(levelMode, battleNumber);
  const explicitBlocked = Array.isArray(blockedSpecies) ? blockedSpecies : getDraftBlockedSpecies(draft);
  const hasTeamHistory = currentTeam.length > 0 || previousOpponent.length > 0;
  const factoryBlocked = battleNumber <= 1 || !hasTeamHistory ? explicitBlocked : [...getDraftBlockedSpecies(currentTeam), ...getDraftBlockedSpecies(previousOpponent)];
  const blocked = new Set((noland ? [] : factoryBlocked).map(norm));
  const observations = observedList(revealed);
  if (!targetBucket) return { matchingTeams: [], rankedSets: [], possibleSpecies: [], eliminatedSets: [], blockedSpecies: [...blocked], roundBucket: null, observations, exact: true, supported: false, battle: battleNumber, reason: 'This battle uses a low/mid-tier Level 50 Factory pool that is not included in the 436-set Group-3 dataset yet.' };

  const key = cacheKey({ draft, blockedSpecies: [...blocked], scientist, levelMode, battleNumber, revealed, noland, currentTeam, previousOpponent });
  const cached = ANALYSIS_CACHE.get(key);
  if (cached) return cached;

  const observationBySpecies = new Map();
  observations.forEach((o) => { const species = norm(o.species); if (species) observationBySpecies.set(species, o); });
  const pools = Object.values(POKEMON).map((pokemon) => {
    const observation = observationBySpecies.get(norm(pokemon.name));
    const sets = pokemon.sets.filter((set) => String(set.round) === String(targetBucket) && !blocked.has(norm(set.species)) && (!observation || setMatchesObservation(set, observation)));
    return { ...pokemon, sets };
  }).filter((p) => p.sets.length);
  const matchingTeams = []; const setOccurrences = new Map();
  const mark = (set) => { const k = setKey(set); const old = setOccurrences.get(k); if (old) old.count += 1; else setOccurrences.set(k, { set, count: 1 }); };
  const requiredSpecies = new Set(observationBySpecies.keys());

  for (let i = 0; i < pools.length - 2; i += 1) {
    for (let j = i + 1; j < pools.length - 1; j += 1) {
      for (let k = j + 1; k < pools.length; k += 1) {
        const speciesTeam = [pools[i], pools[j], pools[k]];
        if ([...requiredSpecies].some((name) => !speciesTeam.some((p) => norm(p.name) === name))) continue;
        for (const a of speciesTeam[0].sets) {
          for (const b of speciesTeam[1].sets) {
            if (itemKey(a.item) && itemKey(a.item) === itemKey(b.item)) continue;
            for (const c of speciesTeam[2].sets) {
              if (itemKey(c.item) && (itemKey(c.item) === itemKey(a.item) || itemKey(c.item) === itemKey(b.item))) continue;
              const team = [a, b, c];
              if (!teamMatchesClue(team, scientist)) continue;
              matchingTeams.push(team);
              team.forEach(mark);
            }
          }
        }
      }
    }
  }

  const rankedSets = [...setOccurrences.values()].sort((a, b) => b.count - a.count || String(a.set.species).localeCompare(String(b.set.species))).map((entry) => ({ ...entry, frequency: matchingTeams.length ? entry.count / matchingTeams.length : 0 }));
  const possibleBySpecies = {}; rankedSets.forEach((entry) => { const k = norm(entry.set.species); if (!possibleBySpecies[k]) possibleBySpecies[k] = []; possibleBySpecies[k].push(entry.set); });
  const possibleSpecies = Object.values(POKEMON).filter((p) => possibleBySpecies[norm(p.name)]?.length).map((p) => ({ pokemon: p, possible: possibleBySpecies[norm(p.name)] })).sort((a, b) => (b.possible.length - a.possible.length) || String(a.pokemon.name).localeCompare(String(b.pokemon.name)));

  const survivingKeys = new Set(rankedSets.map((x) => setKey(x.set))); const eliminatedSets = [];
  Object.values(POKEMON).forEach((pokemon) => pokemon.sets.filter((set) => String(set.round) === String(targetBucket)).forEach((set) => {
    if (survivingKeys.has(setKey(set))) return;
    let reason = 'Eliminated by the combined team constraints';
    if (blocked.has(norm(set.species))) reason = 'Blocked species';
    else { const obs = observationBySpecies.get(norm(set.species)); if (obs?.item && itemKey(obs.item) !== itemKey(set.item)) reason = `Held item mismatch: saw ${obs.item}`; else { const missing = obs?.moves?.find((m) => !moveNames(set).map(norm).includes(norm(m))); if (missing) reason = `Move clue mismatch: ${missing}`; else if (!teamMatchesClue([set], scientist)) reason = 'Does not fit the Scientist clue when combined with a legal team'; } }
    eliminatedSets.push({ set, reason });
  }));
  return remember(key, { matchingTeams, rankedSets, possibleSpecies, eliminatedSets, blockedSpecies: [...blocked], roundBucket: targetBucket, observations, exact: true, supported: true, battle: battleNumber, rankingNote: 'Ranked by frequency among surviving legal teams. This is candidate frequency, not guaranteed in-game probability because Factory generation uses rejection sampling rather than uniform selection from all legal teams.' });
}

export function getPossibleSets({ species, blockedSpecies = [], occupiedItems = [], revealed = {}, roundBucket } = {}) {
  const pokemon = getPokemon(species); if (!pokemon) return { pokemon: null, possible: [], eliminated: [] }; const blocked = new Set(blockedSpecies.map(norm)); const occupied = new Set(occupiedItems.map(itemKey)); const observed = observedList(revealed).find((o) => norm(o.species) === norm(pokemon.name)); const pool = roundBucket == null ? pokemon.sets : pokemon.sets.filter((set) => String(set.round) === String(roundBucket)); const possible = pool.filter((set) => !blocked.has(norm(pokemon.name)) && !occupied.has(itemKey(set.item)) && (!observed || setMatchesObservation(set, observed))); return { pokemon, possible, eliminated: pool.filter((set) => !possible.includes(set)).map((set) => ({ set, reason: blocked.has(norm(pokemon.name)) ? 'Blocked species' : 'Item, move, round, or team-constraint mismatch' })) };
}
