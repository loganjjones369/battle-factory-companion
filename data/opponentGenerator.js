import { filterSets, filterTeams } from './candidateFilter';
import { hasDuplicateItems, hasDuplicateSpecies } from './factoryRules';

const norm = (value) => String(value || '').trim().toLowerCase();

export function isLegalOpponentTeam(team = []) {
  return team.length === 3 && !hasDuplicateSpecies(team) && !hasDuplicateItems(team);
}

function setSpecies(set) {
  return norm(set.species || set.name);
}

function setItem(set) {
  return norm(set.item);
}

function buildPool(sets, options) {
  const blocked = new Set((options.blockedSpecies || []).map(norm));
  const required = (options.revealed?.requiredSpecies || []).map(norm);
  const base = filterSets(sets, {}).filter((set) => {
    const species = setSpecies(set);
    return species && !blocked.has(species);
  });

  // If a revealed species is required, keep its sets plus all other legal sets.
  // Team-level required-species validation still happens after combinations are built.
  return { pool: base, blocked, required };
}

function passesTeamFilters(team, options) {
  const { scientist = {}, blockedSpecies = [], revealed = {} } = options;
  return filterTeams([team], {
    ...scientist,
    blockedSpecies,
    requiredSpecies: revealed.requiredSpecies,
    revealedSetFacts: revealed.setFacts,
  }).length > 0;
}

/**
 * Build compact indexes used by the Factory candidate engine. The app can use
 * these indexes to narrow the search before asking for concrete team samples.
 */
export function buildCandidateIndex(sets = [], options = {}) {
  const { pool, blocked } = buildPool(sets, options);
  const bySpecies = new Map();
  const byItem = new Map();

  pool.forEach((set) => {
    const species = setSpecies(set);
    const item = setItem(set);
    if (!bySpecies.has(species)) bySpecies.set(species, []);
    bySpecies.get(species).push(set);
    if (item) {
      if (!byItem.has(item)) byItem.set(item, []);
      byItem.get(item).push(set);
    }
  });

  return {
    pool,
    blockedSpecies: [...blocked],
    species: bySpecies,
    items: byItem,
    speciesCount: bySpecies.size,
    setCount: pool.length,
  };
}

function orderedSpecies(index, options) {
  const required = new Set((options.revealed?.requiredSpecies || []).map(norm));
  return [...index.species.keys()].sort((a, b) => {
    const ar = required.has(a) ? 0 : 1;
    const br = required.has(b) ? 0 : 1;
    return ar - br || a.localeCompare(b);
  });
}

/**
 * Lazily yield legal teams. Species are selected first, then individual sets,
 * which avoids repeatedly comparing every raw set against every other set.
 */
export function* iterateLegalTeams(sets = [], options = {}) {
  const index = buildCandidateIndex(sets, options);
  const speciesList = orderedSpecies(index, options);

  for (let a = 0; a < speciesList.length - 2; a += 1) {
    const speciesA = speciesList[a];
    const setsA = index.species.get(speciesA);
    for (let b = a + 1; b < speciesList.length - 1; b += 1) {
      const speciesB = speciesList[b];
      const setsB = index.species.get(speciesB);
      for (let c = b + 1; c < speciesList.length; c += 1) {
        const speciesC = speciesList[c];
        const setsC = index.species.get(speciesC);

        for (const first of setsA) {
          const itemA = setItem(first);
          for (const second of setsB) {
            const itemB = setItem(second);
            if (itemA && itemA === itemB) continue;
            for (const third of setsC) {
              const itemC = setItem(third);
              if (itemC && (itemC === itemA || itemC === itemB)) continue;

              const team = [first, second, third];
              if (passesTeamFilters(team, options)) yield team;
            }
          }
        }
      }
    }
  }
}

/** Return only a bounded sample; callers must not treat this as the complete candidate universe. */
export function generateLegalTeams(sets = [], options = {}) {
  const limit = Number.isFinite(options.limit) ? Math.max(0, options.limit) : 250;
  if (limit === 0) return [];
  const teams = [];
  const iterator = iterateLegalTeams(sets, options);
  for (let next = iterator.next(); !next.done && teams.length < limit; next = iterator.next()) {
    teams.push(next.value);
  }
  return teams;
}

/**
 * Count the concrete teams in a bounded search without retaining them. This is
 * exact for the supplied set pool/options, but intentionally does not create
 * millions of arrays in memory.
 */
export function countLegalTeams(sets = [], options = {}) {
  let count = 0;
  for (const _team of iterateLegalTeams(sets, options)) count += 1;
  return count;
}

export function getLegalTeamCounts(teams = []) {
  const species = {};
  const items = {};
  teams.forEach((team) => team.forEach((set) => {
    const speciesName = set.species || set.name;
    if (speciesName) species[speciesName] = (species[speciesName] || 0) + 1;
    if (set.item) items[set.item] = (items[set.item] || 0) + 1;
  }));
  return { species, items };
}

export function sampleLegalTeams(sets = [], options = {}) {
  const limit = Number.isFinite(options.limit) ? Math.max(1, options.limit) : 25;
  const teams = generateLegalTeams(sets, { ...options, limit });
  return { teams, sampleSize: teams.length, truncated: teams.length >= limit };
}
