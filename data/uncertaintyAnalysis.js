const norm = (value) => String(value || '').trim().toLowerCase();

function moveNames(set = {}) {
  return (set.moves || []).map((move) => (typeof move === 'string' ? move : move?.name)).filter(Boolean);
}
function setKey(set = {}) { return `${norm(set.species)}#${set.id ?? set.setId ?? set.sourceId ?? ''}`; }
function unique(values = []) { return [...new Set(values.filter(Boolean))]; }
function teamKey(team = []) { return team.map(setKey).sort().join('|'); }
function confidenceForCount(count) { if (count <= 1) return 'identified'; if (count <= 3) return 'narrow'; if (count <= 6) return 'uncertain'; return 'broad'; }

function clueGroups(sets, getter) {
  const groups = new Map();
  sets.forEach((set) => getter(set).forEach((value) => { const key = norm(value); if (!key) return; if (!groups.has(key)) groups.set(key, { value, sets: new Set() }); groups.get(key).sets.add(setKey(set)); }));
  return [...groups.values()].map((group) => ({ value: group.value, count: group.sets.size })).sort((a, b) => a.count - b.count || String(a.value).localeCompare(String(b.value)));
}

function bestResolvingClues(sets = [], limit = 4) {
  if (sets.length <= 1) return [];
  const candidates = [
    ...clueGroups(sets, (set) => [set.item]).map((group) => ({ kind: 'item', value: group.value, remaining: group.count })),
    ...clueGroups(sets, (set) => moveNames(set)).map((group) => ({ kind: 'move', value: group.value, remaining: group.count })),
  ];
  return candidates.filter((entry) => entry.remaining < sets.length).sort((a, b) => a.remaining - b.remaining || (a.kind === 'move' ? -1 : 1)).slice(0, limit);
}

function teamLevelClues(matchingTeams = [], limit = 5) {
  if (matchingTeams.length <= 1) return [];
  const groups = new Map();
  matchingTeams.forEach((team) => {
    const seen = new Set();
    team.forEach((set) => {
      const species = set?.species || set?.name || 'Unknown';
      if (set?.item) seen.add(`item|${norm(species)}|${norm(set.item)}`);
      moveNames(set).forEach((move) => seen.add(`move|${norm(species)}|${norm(move)}`));
    });
    seen.forEach((key) => {
      const [kind, species, ...valueParts] = key.split('|');
      const value = valueParts.join('|');
      if (!groups.has(key)) groups.set(key, { kind, species, value, teams: new Set() });
      groups.get(key).teams.add(teamKey(team));
    });
  });
  return [...groups.values()].map((group) => ({ kind: group.kind, species: group.species, value: group.value, remainingTeams: group.teams.size, eliminatedTeams: matchingTeams.length - group.teams.size, reduction: (matchingTeams.length - group.teams.size) / matchingTeams.length })).filter((entry) => entry.remainingTeams < matchingTeams.length).sort((a, b) => b.reduction - a.reduction || a.remainingTeams - b.remainingTeams || String(a.value).localeCompare(String(b.value))).slice(0, limit);
}

function bestGlobalClues(speciesEntries = [], limit = 5) {
  const groups = new Map();
  speciesEntries.filter((entry) => entry.observed && entry.setCount > 1).forEach((entry) => entry.resolvingClues.forEach((clue) => { const key = `${clue.kind}:${norm(clue.value)}`; if (!groups.has(key)) groups.set(key, { ...clue, species: [] }); const group = groups.get(key); if (!group.species.includes(entry.species)) group.species.push(entry.species); }));
  return [...groups.values()].sort((a, b) => a.remaining - b.remaining || b.species.length - a.species.length || String(a.value).localeCompare(String(b.value))).slice(0, limit);
}

export function analyzeUncertainty(result = {}, observations = []) {
  const rankedSets = result.rankedSets || [];
  const matchingTeams = result.matchingTeams || [];
  const observedSpecies = unique(observations.map((observation) => observation?.species).filter(Boolean));
  const bySpecies = {};
  rankedSets.forEach((entry) => { const species = entry?.set?.species; if (!species) return; const key = norm(species); if (!bySpecies[key]) bySpecies[key] = { species, sets: [] }; bySpecies[key].sets.push(entry.set); });
  const species = Object.values(bySpecies).map((entry) => { const sets = entry.sets; const observed = observedSpecies.some((name) => norm(name) === norm(entry.species)); return { species: entry.species, setCount: sets.length, confidence: confidenceForCount(sets.length), observed, sets, resolvingClues: bestResolvingClues(sets) }; }).sort((a, b) => (a.observed === b.observed ? b.setCount - a.setCount : a.observed ? -1 : 1));
  const unresolved = species.filter((entry) => entry.observed && entry.setCount > 1);
  const unresolvedSetCount = unresolved.reduce((sum, entry) => sum + entry.setCount, 0);
  const signatures = new Set(matchingTeams.map(teamKey));
  const unseenSpecies = species.filter((entry) => !entry.observed).map((entry) => entry.species);
  const bestNextClues = matchingTeams.length > 1 ? teamLevelClues(matchingTeams) : bestGlobalClues(species);
  let state = 'clear';
  if (rankedSets.length === 0) state = 'none'; else if (unresolved.length > 0) state = unresolved.some((entry) => entry.setCount >= 7) ? 'high' : 'moderate'; else if (species.some((entry) => !entry.observed && entry.setCount > 1)) state = 'moderate';
  return { state, candidateSetCount: rankedSets.length, candidateTeamCount: matchingTeams.length, distinctTeamCount: signatures.size, observedSpecies, unresolved, unresolvedSetCount, unseenSpecies, species, bestNextClues, note: 'Uncertainty describes the surviving legal possibilities. It is not an in-game probability estimate.' };
}

export function describeUncertainty(analysis = {}) {
  if (analysis.state === 'none') return 'No legal candidate sets remain under the current clues.';
  if (analysis.state === 'clear') return 'The current clues have resolved every observed species to one compatible set.';
  if (analysis.state === 'high') return 'Several sets still fit the observed clues. One more move or item clue could substantially narrow the field.';
  return 'The observed clues narrow the field, but multiple sets or partner combinations remain possible.';
}
