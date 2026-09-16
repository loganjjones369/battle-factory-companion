import { filterSets, filterTeams } from './candidateFilter';
import { hasDuplicateItems, hasDuplicateSpecies } from './factoryRules';

const norm = (value) => String(value || '').trim().toLowerCase();

export function isLegalOpponentTeam(team = []) {
  return team.length === 3 && !hasDuplicateSpecies(team) && !hasDuplicateItems(team);
}

function passesPoolFilters(set, blocked) {
  const species = norm(set.species || set.name);
  return species && !blocked.has(species);
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

/** Lazily yield legal teams so the full Factory universe is never materialized in memory. */
export function* iterateLegalTeams(sets = [], options = {}) {
  const blocked = new Set((options.blockedSpecies || []).map(norm));
  const pool = filterSets(sets, {}).filter((set) => passesPoolFilters(set, blocked));

  for (let i = 0; i < pool.length - 2; i += 1) {
    const first = pool[i];
    const firstSpecies = norm(first.species || first.name);
    const firstItem = norm(first.item);
    for (let j = i + 1; j < pool.length - 1; j += 1) {
      const second = pool[j];
      const secondSpecies = norm(second.species || second.name);
      const secondItem = norm(second.item);
      if (firstSpecies === secondSpecies || firstItem === secondItem) continue;

      for (let k = j + 1; k < pool.length; k += 1) {
        const third = pool[k];
        const thirdSpecies = norm(third.species || third.name);
        const thirdItem = norm(third.item);
        if (firstSpecies === thirdSpecies || secondSpecies === thirdSpecies) continue;
        if (firstItem === thirdItem || secondItem === thirdItem) continue;

        const team = [first, second, third];
        if (passesTeamFilters(team, options)) yield team;
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
