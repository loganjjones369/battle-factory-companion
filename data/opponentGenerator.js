import { filterSets, filterTeams } from './candidateFilter';
import { hasDuplicateItems, hasDuplicateSpecies } from './factoryRules';

// Build legal 3-Pokémon opponent teams from the imported Factory set pool.
// This is intentionally data-driven: once the complete Emerald set pool is
// imported, the same generator works without changing the UI.
export function isLegalOpponentTeam(team = []) {
  return team.length === 3 && !hasDuplicateSpecies(team) && !hasDuplicateItems(team);
}

export function generateLegalTeams(sets = [], { blockedSpecies = [], scientist = {}, revealed = {} } = {}) {
  const eligible = filterSets(sets, {});
  const teams = [];
  const blocked = new Set((blockedSpecies || []).map((s) => String(s).trim().toLowerCase()));

  const pool = eligible.filter((set) => {
    const species = String(set.species || set.name || '').trim().toLowerCase();
    return species && !blocked.has(species);
  });

  for (let i = 0; i < pool.length - 2; i += 1) {
    for (let j = i + 1; j < pool.length - 1; j += 1) {
      if (pool[i].species === pool[j].species || pool[i].item === pool[j].item) continue;
      for (let k = j + 1; k < pool.length; k += 1) {
        const team = [pool[i], pool[j], pool[k]];
        if (!isLegalOpponentTeam(team)) continue;
        teams.push(team);
      }
    }
  }

  return filterTeams(teams, {
    ...scientist,
    blockedSpecies,
    requiredSpecies: revealed.requiredSpecies,
    revealedSetFacts: revealed.setFacts,
  });
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
