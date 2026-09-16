import { filterTeams, summarizeCandidates } from './candidateFilter';
import { isLegalTeam } from './factoryRules';

const norm = (v) => String(v || '').trim().toLowerCase();

function speciesOf(set) {
  return norm(set?.species || set?.name);
}

function itemOf(set) {
  return norm(set?.item);
}

/**
 * Generate legal 3-Pokémon teams from a local set pool.
 *
 * This is intentionally a pure/offline helper. Once the complete Factory team
 * tables are imported, the app can use those tables directly; this generator
 * remains useful for building candidate combinations from a raw set pool.
 */
export function generateLegalTeams(sets = [], options = {}) {
  const maxTeams = Math.max(1, Number(options.maxTeams) || 50000);
  const blockedSpecies = new Set((options.blockedSpecies || []).map(norm));
  const pool = sets.filter((set) => {
    const species = speciesOf(set);
    return species && !blockedSpecies.has(species);
  });

  const teams = [];
  for (let i = 0; i < pool.length && teams.length < maxTeams; i += 1) {
    const a = pool[i];
    const aSpecies = speciesOf(a);
    const aItem = itemOf(a);

    for (let j = i + 1; j < pool.length && teams.length < maxTeams; j += 1) {
      const b = pool[j];
      const bSpecies = speciesOf(b);
      if (bSpecies === aSpecies) continue;
      const bItem = itemOf(b);
      if (aItem && bItem && aItem === bItem) continue;

      for (let k = j + 1; k < pool.length && teams.length < maxTeams; k += 1) {
        const c = pool[k];
        const cSpecies = speciesOf(c);
        if (!cSpecies || cSpecies === aSpecies || cSpecies === bSpecies) continue;
        const cItem = itemOf(c);
        if ((cItem && aItem && cItem === aItem) || (cItem && bItem && cItem === bItem)) continue;

        const team = [a, b, c];
        if (isLegalTeam(team)) teams.push({ sets: team });
      }
    }
  }

  return teams;
}

/**
 * Build the current opponent candidate state from either a precomputed team
 * table or a raw set pool. The returned data preserves every surviving team;
 * the UI can therefore show all surviving sets instead of a black-box pick.
 */
export function buildOpponentCandidates({
  teams = [],
  sets = [],
  scientist = {},
  battleState = {},
  revealed = {},
  maxGeneratedTeams = 50000,
} = {}) {
  const sourceTeams = teams.length
    ? teams
    : generateLegalTeams(sets, {
        blockedSpecies: battleState.blockedSpecies || [],
        maxTeams: maxGeneratedTeams,
      });

  const filtered = filterTeams(sourceTeams, {
    ...scientist,
    blockedSpecies: battleState.noland ? [] : (battleState.blockedSpecies || []),
    requiredSpecies: revealed.requiredSpecies,
    revealedSetFacts: revealed.setFacts,
  });

  return {
    candidates: filtered,
    remainingTeams: filtered.length,
    summary: summarizeCandidates(filtered),
    blockedSpecies: battleState.noland ? [] : (battleState.blockedSpecies || []),
    generatedFromRawSets: !teams.length,
  };
}
