import { MOVE_DATA, typeEffectiveness } from './damageCalc';

const moveNames = (set = {}) =>
  (set.moves || [])
    .map((move) => (typeof move === 'string' ? move : move?.name))
    .filter(Boolean);

export function getMappedMoveTypes(set = {}) {
  return moveNames(set)
    .map((move) => MOVE_DATA[move]?.type)
    .filter(Boolean);
}

const unique = (items = []) => [...new Set(items.filter(Boolean))];

function offensiveSignalForSet(set = {}) {
  const signal = {};

  // Actual mapped attacks are the strongest evidence of what a surviving
  // Factory set can pressure with. A species' typing is secondary context.
  unique(getMappedMoveTypes(set)).forEach((type) => {
    signal[type] = (signal[type] || 0) + 2;
  });

  unique(set.types || []).forEach((type) => {
    signal[type] = (signal[type] || 0) + 0.5;
  });

  return signal;
}

function teamAnswerDetails(team = [], threatType) {
  return team.map((pokemon) => {
    const types = pokemon?.types || [];
    const moveTypes = unique(getMappedMoveTypes(pokemon));
    const typingAnswer = types.some((type) => typeEffectiveness(type, [threatType]) > 1);
    const moveAnswer = moveTypes.some((type) => typeEffectiveness(type, [threatType]) > 1);
    const immunity = types.some((type) => typeEffectiveness(threatType, [type]) === 0);

    return {
      pokemon,
      name: pokemon?.species || pokemon?.name || 'Unknown',
      typingAnswer,
      moveAnswer,
      immunity,
      isAnswer: typingAnswer || moveAnswer || immunity,
    };
  });
}

export function buildThreatProfile(rankedSets = [], team = []) {
  if (!rankedSets.length) return null;

  const signal = {};
  const consideredSets = rankedSets.slice(0, 20);

  consideredSets.forEach((entry) => {
    const set = entry?.set || {};
    const weight = Math.max(0.01, Number(entry?.frequency) || 0);
    const setSignal = offensiveSignalForSet(set);

    Object.entries(setSignal).forEach(([type, strength]) => {
      signal[type] = (signal[type] || 0) + weight * strength;
    });
  });

  const ranked = Object.entries(signal).sort((a, b) => b[1] - a[1]);
  const threatType = ranked[0]?.[0];
  if (!threatType) return null;

  const totalSignal = ranked.reduce((sum, item) => sum + item[1], 0) || 1;
  const pressureShare = ranked[0][1] / totalSignal;
  const answerDetails = teamAnswerDetails(team, threatType);
  const vulnerable = team.filter((pokemon) =>
    (pokemon?.types || []).some((type) => typeEffectiveness(threatType, [type]) > 1)
  ).length;
  const immune = team.filter((pokemon) =>
    (pokemon?.types || []).some((type) => typeEffectiveness(threatType, [type]) === 0)
  ).length;
  const answers = answerDetails.filter((item) => item.isAnswer).length;

  // Keep the profile descriptive. It is a matchup signal, not an in-game
  // probability calculation; Factory team generation is not uniform.
  const threatLevel =
    vulnerable >= 2 && pressureShare >= 0.3 ? 'high' :
    vulnerable >= 1 && pressureShare >= 0.2 ? 'medium' :
    'low';

  return {
    threatType,
    pressureShare,
    vulnerable,
    immune,
    answers,
    answerDetails,
    ranked,
    consideredSetCount: consideredSets.length,
    threatLevel,
    hasMultipleAnswers: answers >= 2,
  };
}
