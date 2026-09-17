import { MOVE_DATA, typeEffectiveness } from './damageCalc';

const moveNames = (set = {}) => (set.moves || []).map((move) => typeof move === 'string' ? move : move?.name).filter(Boolean);

export function getMappedMoveTypes(set = {}) {
  return moveNames(set).map((move) => MOVE_DATA[move]?.type).filter(Boolean);
}

export function buildThreatProfile(rankedSets = [], team = []) {
  if (!rankedSets.length) return null;

  const signal = {};
  rankedSets.slice(0, 20).forEach((entry) => {
    const set = entry?.set || {};
    const weight = Math.max(0.01, Number(entry?.frequency) || 0);
    const offensiveTypes = [...(set.types || []), ...getMappedMoveTypes(set)];
    [...new Set(offensiveTypes)].forEach((type) => {
      signal[type] = (signal[type] || 0) + weight;
    });
  });

  const ranked = Object.entries(signal).sort((a, b) => b[1] - a[1]);
  const threatType = ranked[0]?.[0];
  if (!threatType) return null;

  const totalSignal = ranked.reduce((sum, item) => sum + item[1], 0) || 1;
  const pressureShare = ranked[0][1] / totalSignal;
  const vulnerable = team.filter((pokemon) => (pokemon?.types || []).some((type) => typeEffectiveness(threatType, [type]) > 1)).length;
  const immune = team.filter((pokemon) => (pokemon?.types || []).some((type) => typeEffectiveness(threatType, [type]) === 0)).length;
  const answers = team.filter((pokemon) => {
    const types = pokemon?.types || [];
    const typingAnswer = types.some((type) => typeEffectiveness(type, [threatType]) > 1);
    const moveAnswer = getMappedMoveTypes(pokemon).some((type) => typeEffectiveness(type, [threatType]) > 1);
    const immunity = types.some((type) => typeEffectiveness(threatType, [type]) === 0);
    return typingAnswer || moveAnswer || immunity;
  }).length;

  return {
    threatType,
    pressureShare,
    vulnerable,
    immune,
    answers,
    ranked,
  };
}
