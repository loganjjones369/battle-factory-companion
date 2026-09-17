import { bestDamagingMoves, calculateDamage, getEffectiveSpeed, getStats } from './damageCalc';
import { getPokemon } from './factoryData';

function resolvePokemon(value) {
  if (!value) return null;
  if (value.types && value.baseStats) return value;
  if (value.species) return getPokemon(value.species);
  if (value.name) return getPokemon(value.name);
  return null;
}

function resolveSet(value, explicitSet) {
  if (explicitSet) return explicitSet;
  if (value?.setId != null || value?.sourceId != null || value?.evs || value?.moves) return value;
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
    });
    if (!result.unsupported && (!best || result.percentMax > best.percentMax)) best = { ...result, moveName };
  }
  return best;
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
  const opponentSpeed = getEffectiveSpeed(opponentStats, options.opponentStatus || 'healthy');
  const allySpeed = getEffectiveSpeed(allyStats, options.allyStatus || 'healthy');
  const hitBack = bestHit(allyPokemon, allySet, opponentPokemon, opponentSet, level, round, {
    ...options,
    attackerStatus: options.allyStatus || 'healthy',
    defenderStatus: options.opponentStatus || 'healthy',
    attackerAbility: options.allyAbility,
    defenderAbility: options.opponentAbility,
    attackerStages: options.allyStages,
    defenderStages: options.opponentStages,
  });
  const incoming = bestHit(opponentPokemon, opponentSet, allyPokemon, allySet, level, round, {
    ...options,
    attackerStatus: options.opponentStatus || 'healthy',
    defenderStatus: options.allyStatus || 'healthy',
    attackerAbility: options.opponentAbility,
    defenderAbility: options.allyAbility,
    attackerStages: options.opponentStages,
    defenderStages: options.allyStages,
  });
  const relation = speedRelation(allySpeed, opponentSpeed);
  const damageOut = hitBack?.percentMax ?? 0;
  const damageIn = incoming?.percentMax ?? 0;
  const guaranteedTwoHKO = hitBack ? hitBack.percentMin >= 50 : false;
  const guaranteedOHKO = hitBack ? hitBack.percentMin >= 100 : false;
  const possibleOHKO = hitBack ? hitBack.percentMax >= 100 : false;
  const dangerousIncoming = incoming ? incoming.percentMin >= 50 : false;
  const safeSwitch = damageIn < 50;
  let classification = 'Neutral';
  if (guaranteedOHKO && relation === 'outspeeds') classification = 'OHKO + outspeeds';
  else if (possibleOHKO && relation === 'outspeeds') classification = 'Possible OHKO + outspeeds';
  else if (guaranteedTwoHKO && relation === 'outspeeds') classification = 'Guaranteed 2HKO + outspeeds';
  else if (safeSwitch && damageOut >= 50) classification = 'Safe switch + strong pressure';
  else if (safeSwitch) classification = 'Safer switch-in';
  else if (relation === 'outspeeds' && damageOut >= 50) classification = 'Outspeeds + strong pressure';
  else if (relation === 'speed ties') classification = 'Speed tie';
  else if (damageOut >= 50) classification = 'Strong pressure, but exposed';
  else classification = 'Limited pressure';
  return { ally: allyPokemon, opponent: opponentPokemon, allySet, opponentSet, allySpeed, opponentSpeed, relation, hitBack, incoming, damageOut, damageIn, guaranteedTwoHKO, guaranteedOHKO, possibleOHKO, dangerousIncoming, safeSwitch, classification, incomingMove: incoming?.moveName || null, returnMove: hitBack?.moveName || null };
}

export function rankResponses(opponent, team = [], level = 100, round = 1, options = {}) {
  return team.map((ally) => analyzeResponse(opponent, ally, level, round, options)).filter(Boolean).sort((a, b) => {
    const score = (x) => (x.guaranteedOHKO ? 100 : 0) + (x.possibleOHKO ? 35 : 0) + (x.guaranteedTwoHKO ? 25 : 0) + (x.relation === 'outspeeds' ? 15 : x.relation === 'speed ties' ? 5 : 0) + (x.safeSwitch ? 20 : 0) + Math.min(20, x.damageOut / 5) - Math.min(30, x.damageIn / 3);
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
