import { bestDamagingMoves, calculateDamage, getEffectiveSpeed, getStats } from './damageCalc';
import { getPokemon } from './factoryData';
import { getFactorySet } from './setIdentity';
import { getMoveTurnProfile, getMovePriority } from './battleSequence';
import { scenarioSwitchInDamage } from './scenarioDamage';

function resolvePokemon(value) {
  if (!value) return null;
  if (value.types && value.baseStats) return value;
  if (value.species) return getPokemon(value.species);
  if (value.name) return getPokemon(value.name);
  return null;
}

function resolveSet(value, explicitSet) {
  if (explicitSet) return explicitSet;
  if (value?.setId != null) return getFactorySet(value.species, value.setId);
  if (value?.sourceId != null || value?.evs || value?.moves) return value;
  return null;
}

function bestHit(attacker, attackerSet, defender, defenderSet, level, round, options = {}) {
  if (!attacker || !defender) return null;
  let best = null;
  const set = resolveSet(attacker, attackerSet);
  for (const moveName of bestDamagingMoves(set || attacker)) {
    const result = calculateDamage({
      attacker,
      attackerSet: set,
      defender,
      defenderSet: resolveSet(defender, defenderSet),
      level,
      round,
      moveName,
      weather: options.weather || 'none',
      attackerStatus: options.attackerStatus || 'healthy',
      defenderStatus: options.defenderStatus || 'healthy',
      attackerStages: options.attackerStages,
      defenderStages: options.defenderStages,
      attackerAbility: options.attackerAbility,
      defenderAbility: options.defenderAbility,
      attackerHP: options.attackerHP,
      defenderHP: options.defenderHP,
      screens: options.screens || {},
      defenderSubstitute: Boolean(options.defenderSubstitute),
    });
    if (!result.unsupported && (!best || result.percentMax > best.percentMax)) best = { ...result, moveName };
  }
  return best;
}


function applyStagesForResponse(stats, stages) {
  const s = stages || {};
  const mult = (value) => { const n = Number(value) || 0; return n >= 0 ? (2 + n) / 2 : 2 / (2 - n); };
  return { ...stats, spe: Math.floor(stats.spe * mult(s.spe || 0)) };
}

function speedRelation(allySpeed, opponentSpeed) {
  if (allySpeed > opponentSpeed) return 'outspeeds';
  if (allySpeed < opponentSpeed) return 'slower than';
  return 'speed ties';
}

export function analyzeResponse(opponent, ally, level = 100, round = 1, options = {}) {
  const opponentPokemon = resolvePokemon(opponent);
  const allyPokemon = resolvePokemon(ally);
  if (!opponentPokemon || !allyPokemon) return null;
  const opponentSet = resolveSet(opponent, options.opponentSet);
  const allySet = resolveSet(ally, options.allySet);
  const opponentStats = getStats(opponentPokemon, opponentSet, level, round);
  const allyStats = getStats(allyPokemon, allySet, level, round);
  const opponentSpeed = getEffectiveSpeed(applyStagesForResponse(opponentStats, options.opponentStages), options.opponentStatus || 'healthy');
  const allySpeed = getEffectiveSpeed(applyStagesForResponse(allyStats, options.allyStages), options.allyStatus || 'healthy');
  const hitBack = bestHit(allyPokemon, allySet, opponentPokemon, opponentSet, level, round, {
    ...options,
    attackerHP: options.allyHP,
    defenderHP: options.opponentHP,
    screens: options.opponentScreens || {},
    attackerStatus: options.allyStatus || 'healthy',
    defenderStatus: options.opponentStatus || 'healthy',
    attackerAbility: options.allyAbility,
    defenderAbility: options.opponentAbility,
    attackerStages: options.allyStages,
    defenderStages: options.opponentStages,
  });
  const incoming = bestHit(opponentPokemon, opponentSet, allyPokemon, allySet, level, round, {
    ...options,
    attackerHP: options.opponentHP,
    defenderHP: options.allyHP,
    screens: options.allyScreens || {},
    attackerStatus: options.opponentStatus || 'healthy',
    defenderStatus: options.allyStatus || 'healthy',
    attackerAbility: options.opponentAbility,
    defenderAbility: options.allyAbility,
    attackerStages: options.opponentStages,
    defenderStages: options.allyStages,
  });
  const relation = speedRelation(allySpeed, opponentSpeed);
  const allySwitch = scenarioSwitchInDamage(ally, level, round, { weather: options.weather || 'none', sides: { [String(ally?.species || '').trim().toLowerCase() + '#' + (ally?.setId ?? ally?.id ?? '')]: { spikes: options.allySpikes || 0 } } });
  const damageOut = hitBack?.percentMax ?? 0;
  const damageIn = incoming?.percentMax ?? 0;
  const safeSwitch = damageIn < 50;
  let classification = 'Neutral';
  if (safeSwitch && damageOut >= 50) classification = 'Safe switch + strong pressure';
  else if (safeSwitch) classification = 'Safer switch-in';
  else if (relation === 'outspeeds' && damageOut >= 50) classification = 'Outspeeds + strong pressure';
  else if (relation === 'speed ties') classification = 'Speed tie';
  else if (damageOut >= 50) classification = 'Strong pressure, but exposed';
  else classification = 'Limited pressure';
  const incomingTurn = incoming?.moveName ? getMoveTurnProfile(incoming.moveName, options.weather || 'none') : null;
  const returnTurn = hitBack?.moveName ? getMoveTurnProfile(hitBack.moveName, options.weather || 'none') : null;
  const turnOrder = hitBack?.moveName || incoming?.moveName ? { priority: { ally: getMovePriority(hitBack?.moveName), opponent: getMovePriority(incoming?.moveName) }, allyProfile: returnTurn, opponentProfile: incomingTurn } : null;
  return { ally: allyPokemon, opponent: opponentPokemon, allySet, opponentSet, allySpeed, opponentSpeed, relation, hitBack, incoming, damageOut, damageIn, safeSwitch, classification, incomingMove: incoming?.moveName || null, returnMove: hitBack?.moveName || null, switchIn: allySwitch, turnOrder };
}

export function rankResponses(opponent, team = [], level = 100, round = 1, options = {}) {
  return team.map((ally) => analyzeResponse(opponent, ally, level, round, options)).filter(Boolean).sort((a, b) => {
    const score = (x) => (x.relation === 'outspeeds' ? 15 : x.relation === 'speed ties' ? 5 : 0) + (x.safeSwitch ? 20 : 0) + Math.min(60, x.damageOut) - Math.min(60, x.damageIn);
    return score(b) - score(a);
  });
}

export function analyzeSwitchIn(candidate, team = [], level = 100, round = 1, options = {}) {
  if (!candidate || !team.length) return [];
  const candidatePokemon = resolvePokemon(candidate);
  const candidateSet = resolveSet(candidate, options.candidateSet);
  if (!candidatePokemon) return [];
  return team.map((ally) => analyzeResponse(candidatePokemon, ally, level, round, { ...options, opponentSet: candidateSet, allySet: resolveSet(ally, options.allySet) })).filter(Boolean);
}

export function analyzeCandidateSwitchIns(candidates = [], team = [], level = 100, round = 1, options = {}) {
  return candidates.map((candidate) => ({ candidate, checks: analyzeSwitchIn(candidate, team, level, round, options) })).filter((row) => row.checks.length);
}

export function summarizeCandidateSwitchIns(rows = []) {
  const byAlly = new Map();
  rows.forEach(({ candidate, checks }) => checks.forEach((check) => {
    const key = check.ally?.species || 'Unknown';
    if (!byAlly.has(key)) byAlly.set(key, []);
    byAlly.get(key).push({ candidate, check });
  }));
  return [...byAlly.entries()].map(([species, entries]) => {
    const incoming = entries.map((x) => x.check.incoming).filter(Boolean);
    const mins = incoming.map((x) => x.percentMin);
    const maxs = incoming.map((x) => x.percentMax);
    const worst = entries.reduce((best, x) => !best || x.check.damageIn > best.check.damageIn ? x : best, null);
    const safest = entries.reduce((best, x) => !best || x.check.damageIn < best.check.damageIn ? x : best, null);
    const safeCount = entries.filter((x) => x.check.safeSwitch).length;
    return { species, candidateCount: entries.length, minPercent: mins.length ? Math.min(...mins) : 0, maxPercent: maxs.length ? Math.max(...maxs) : 0, safeCount, safeShare: entries.length ? safeCount / entries.length : 0, worst, safest };
  });
}
