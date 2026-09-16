import { calculateTeamRoundBucket, calculateTeamStyle, calculateTeamType } from './scientistAnalysis';

const norm = (v) => String(v || '').trim().toLowerCase();
const has = (list, value) => !value || (list || []).some((x) => norm(x) === norm(value));

export function filterSets(sets = [], facts = {}) {
  return sets.filter((set) => {
    if (facts.species && norm(set.species || set.name) !== norm(facts.species)) return false;
    if (facts.item && norm(set.item) !== norm(facts.item)) return false;
    if (facts.nature && norm(set.nature) !== norm(facts.nature)) return false;
    if (facts.move && !has(set.moves, facts.move)) return false;
    if (facts.revealedMoves?.some((move) => !has(set.moves, move))) return false;
    return true;
  });
}

export function filterTeams(teams = [], facts = {}) {
  return teams.filter((team) => {
    const sets = team.sets || team;
    if (facts.type && norm(calculateTeamType(sets)) !== norm(facts.type)) return false;
    if (facts.style !== undefined && calculateTeamStyle(sets) !== Number(facts.style)) return false;
    if (facts.roundBucket && String(calculateTeamRoundBucket(sets)) !== String(facts.roundBucket)) return false;
    const species = sets.map((s) => norm(s.species || s.name));
    if (facts.requiredSpecies?.some((s) => !species.includes(norm(s)))) return false;
    if (facts.excludedSpecies?.some((s) => species.includes(norm(s)))) return false;
    if (facts.revealedSetFacts?.some((fact) => !filterSets(sets, fact).length)) return false;
    return true;
  });
}

export function summarizeCandidates(teams = []) {
  const species = {}, items = {}, moves = {};
  teams.forEach((team) => (team.sets || team).forEach((set) => {
    const name = set.species || set.name;
    if (name) species[name] = (species[name] || 0) + 1;
    if (set.item) items[set.item] = (items[set.item] || 0) + 1;
    (set.moves || []).forEach((move) => { moves[move] = (moves[move] || 0) + 1; });
  }));
  const sort = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }));
  return { totalTeams: teams.length, species: sort(species), items: sort(items), moves: sort(moves) };
}

export function buildCandidateState({ teams = [], scientist = {}, revealed = {} } = {}) {
  const candidates = filterTeams(teams, { ...scientist, requiredSpecies: revealed.requiredSpecies, excludedSpecies: revealed.excludedSpecies, revealedSetFacts: revealed.setFacts });
  return { candidates, remaining: candidates.length, summary: summarizeCandidates(candidates) };
}
