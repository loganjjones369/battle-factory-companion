// Scientist-clue analysis based on Battle Factory Buddy's team logic.
// Returns candidate facts rather than a single recommendation.

const STYLE_TEXT = {
  0: 'free-spirited and unrestrained',
  1: 'based on total preparation',
  2: 'slow and steady',
  3: 'one of endurance',
  4: 'high risk, high return',
  5: 'weakening the foe to start',
  6: 'impossible to predict',
  7: "depend on the battle's flow",
  8: 'flexibly adaptable to the situation',
};

export function calculateTeamStyle(sets) {
  const stylepoints = (sets || []).flatMap((set) => String(set.styleMarkers || set.movesStyle || ''));
  const count = (value) => stylepoints.filter((item) => item === String(value)).length;
  const flags = [count(1) > 2, count(2) > 2, count(3) > 2, count(4) > 1, count(5) > 1, count(6) > 1, count(7) > 1];
  if (flags.filter(Boolean).length > 2) return 8;
  for (let i = flags.length - 1; i >= 0; i -= 1) if (flags[i]) return i + 1;
  return 0;
}

export function calculateTeamType(sets) {
  const types = (sets || []).flatMap((set) => set.types || []).filter(Boolean);
  if (!types.length) return 'None';
  const counts = types.reduce((map, type) => ({ ...map, [type]: (map[type] || 0) + 1 }), {});
  const max = Math.max(...Object.values(counts));
  const winners = Object.keys(counts).filter((type) => counts[type] === max);
  return winners.length === 1 ? winners[0] : 'None';
}

export function calculateTeamRoundBucket(sets) {
  const markers = (sets || []).map((set) => String(set.roundInfo ?? set.roundMarker ?? ''));
  if (markers.includes('6')) return '6';
  if (markers.includes('5')) return '5';
  if (markers.length && new Set(markers).size === 1) return markers[0];
  return '5';
}

export function describeScientistClue(sets) {
  const type = calculateTeamType(sets);
  const style = calculateTeamStyle(sets);
  return {
    type,
    style,
    typeText: type === 'None' ? 'The Trainer appears to have no clear favourites when it comes to type.' : `The Trainer is apparently skilled in the handling of the ${type} type.`,
    styleText: `The favourite battle style appears to be ${STYLE_TEXT[style] || 'unknown'}.`,
    roundBucket: calculateTeamRoundBucket(sets),
  };
}

export function getScientistCandidateFacts(candidateTeams) {
  const teams = (candidateTeams || []).map((team) => ({ sets: team, ...describeScientistClue(team) }));
  const typeCounts = {};
  const styleCounts = {};
  teams.forEach((team) => {
    typeCounts[team.type] = (typeCounts[team.type] || 0) + 1;
    styleCounts[team.style] = (styleCounts[team.style] || 0) + 1;
  });
  return { teams, typeCounts, styleCounts, totalCandidates: teams.length };
}

export { STYLE_TEXT };
