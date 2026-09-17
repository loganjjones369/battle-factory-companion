import { bestDamagingMoves, calculateDamage, getEffectiveSpeed, getStats } from './damageCalc';

function bestHit(attacker, defender, level, round, options = {}) {
  let best = null;
  for (const moveName of bestDamagingMoves(attacker)) {
    const result = calculateDamage({
      attacker,
      attackerSet: attacker,
      defender,
      defenderSet: defender,
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

export function analyzeResponse(opponent, ally, level, round, options = {}) {
  if (!opponent || !ally) return null;
  const opponentSpeed = getEffectiveSpeed(getStats(opponent, opponent, level, round), options.opponentStatus || 'healthy');
  const allySpeed = getEffectiveSpeed(getStats(ally, ally, level, round), options.allyStatus || 'healthy');
  const hitBack = bestHit(ally, opponent, level, round, {
    ...options,
    attackerStatus: options.allyStatus || 'healthy',
    defenderStatus: options.opponentStatus || 'healthy',
    attackerAbility: options.allyAbility,
    defenderAbility: options.opponentAbility,
    attackerStages: options.allyStages,
    defenderStages: options.opponentStages,
  });
  const incoming = bestHit(opponent, ally, level, round, {
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
  return {
    ally,
    opponent,
    allySpeed,
    opponentSpeed,
    relation,
    hitBack,
    incoming,
    damageOut,
    damageIn,
    guaranteedTwoHKO,
    guaranteedOHKO,
    possibleOHKO,
    dangerousIncoming,
    safeSwitch,
    classification,
    incomingMove: incoming?.moveName || null,
    returnMove: hitBack?.moveName || null,
  };
}

export function rankResponses(opponent, team = [], level = 100, round = 1, options = {}) {
  return team.map((ally) => analyzeResponse(opponent, ally, level, round, options)).filter(Boolean).sort((a, b) => {
    const score = (x) => (x.guaranteedOHKO ? 100 : 0) + (x.possibleOHKO ? 35 : 0) + (x.guaranteedTwoHKO ? 25 : 0) + (x.relation === 'outspeeds' ? 15 : x.relation === 'speed ties' ? 5 : 0) + (x.safeSwitch ? 20 : 0) + Math.min(20, x.damageOut / 5) - Math.min(30, x.damageIn / 3);
    return score(b) - score(a);
  });
}

export function analyzeSwitchIn(candidate, team = [], level = 100, round = 1, options = {}) {
  if (!candidate || !team.length) return [];
  return team.map((ally) => analyzeResponse(candidate, ally, level, round, options)).filter(Boolean);
}

export function analyzeCandidateSwitchIns(candidates = [], team = [], level = 100, round = 1, options = {}) {
  const rows = [];
  for (const candidate of candidates) {
    const checks = analyzeSwitchIn(candidate, team, level, round, options);
    if (!checks.length) continue;
    rows.push({ candidate, checks });
  }
  return rows;
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
    return {
      species,
      candidateCount: entries.length,
      minPercent: mins.length ? Math.min(...mins) : 0,
      maxPercent: maxs.length ? Math.max(...maxs) : 0,
      safeCount,
      safeShare: entries.length ? safeCount / entries.length : 0,
      worst,
      safest,
    };
  });
}
