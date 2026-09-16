import { filterTeams, summarizeCandidates } from './candidateFilter';

const norm = (v) => String(v || '').trim().toLowerCase();

// Apply the Battle Factory species-clause constraint to a candidate pool.
// This module deliberately reports facts instead of choosing a "best" play.
export function excludeHeldSpecies(teams = [], heldSpecies = []) {
  const held = new Set((heldSpecies || []).filter(Boolean).map(norm));
  if (!held.size) return teams;
  return teams.filter((team) => {
    const sets = team.sets || team;
    return !sets.some((set) => held.has(norm(set.species || set.name)));
  });
}

export function excludeSeenSpecies(teams = [], seenSpecies = []) {
  return excludeHeldSpecies(teams, seenSpecies);
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
  heldSpecies = [],
  seenSpecies = [],
  revealed = {},
} = {}) {
  let candidates = filterTeams(teams, scientist);
  candidates = excludeHeldSpecies(candidates, heldSpecies);
  candidates = excludeSeenSpecies(candidates, seenSpecies);

  if (revealed.setFacts?.length) {
    candidates = filterTeams(candidates, { revealedSetFacts: revealed.setFacts });
  }

  return {
    remainingTeams: candidates.length,
    candidates,
    summary: summarizeCandidates(candidates),
    possibleNextSpecies: getCandidateSpeciesCounts(candidates),
  };
}
