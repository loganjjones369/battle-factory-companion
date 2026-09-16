import { filterTeams, summarizeCandidates } from './candidateFilter';

const norm = (v) => String(v || '').trim().toLowerCase();

// Apply only the species that are actually blocked for the current opponent.
// Do not use a global "seen species" list: ordinary Factory generation only
// needs the current six blocked slots (or the six draft species on battle 1).
export function excludeBlockedSpecies(teams = [], blockedSpecies = []) {
  const blocked = new Set((blockedSpecies || []).filter(Boolean).map(norm));
  if (!blocked.size) return teams;
  return teams.filter((team) => {
    const sets = team.sets || team;
    return !sets.some((set) => blocked.has(norm(set.species || set.name)));
  });
}

// Backward-compatible alias for callers that used the old name. The argument
// should contain only the legitimately blocked species for this battle.
export function excludeHeldSpecies(teams = [], heldSpecies = []) {
  return excludeBlockedSpecies(teams, heldSpecies);
}

export function getCandidateSpeciesCounts(teams = []) {
  const summary = summarizeCandidates(teams);
  return summary.species;
}

export function getCandidateSetFacts(teams = [], species) {
  const wanted = norm(species);
  const facts = {};
  teams.forEach((team) => (team.sets || team).forEach((set) => {
    if (norm(set.species || set.name) !== wanted) return;
    const key = set.id || set.set || `${set.species || set.name}-${set.item || ''}`;
    facts[key] = {
      species: set.species || set.name,
      id: set.id || set.set,
      item: set.item,
      nature: set.nature,
      moves: set.moves || [],
      ability: set.ability,
      round: set.round,
    };
  }));
  return Object.values(facts);
}

export function buildOpponentCandidateState({
  teams = [],
  scientist = {},
  blockedSpecies = [],
  revealed = {},
  battleState = {},
} = {}) {
  const blocked = blockedSpecies.length
    ? blockedSpecies
    : (battleState.blockedSpecies || []);

  let candidates = filterTeams(teams, {
    ...scientist,
    blockedSpecies: blocked,
  });

  if (revealed.setFacts?.length) {
    candidates = filterTeams(candidates, { revealedSetFacts: revealed.setFacts });
  }

  return {
    remainingTeams: candidates.length,
    candidates,
    summary: summarizeCandidates(candidates),
    possibleNextSpecies: getCandidateSpeciesCounts(candidates),
    blockedSpecies: blocked,
  };
}
