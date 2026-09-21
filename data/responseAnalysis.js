import { bestDamagingMoves, calculateDamage, calculateResidualDamage, getEffectiveSpeed, getStats } from './damageCalc';
import { getPokemon } from './factoryData';
import { getFactorySet } from './setIdentity';
import { getMoveTurnProfile, getMovePriority, getTurnOrderExplanation, buildTurnPlan, buildTurnOutcomes } from './battleSequence';
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
  const allyResidual = calculateResidualDamage({ pokemon: allyPokemon, set: allySet, level, round, hp: options.allyHP, status: options.allyStatus || 'healthy', weather: options.weather || 'none' });
  const opponentResidual = calculateResidualDamage({ pokemon: opponentPokemon, set: opponentSet, level, round, hp: options.opponentHP, status: options.opponentStatus || 'healthy', weather: options.weather || 'none' });
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
  const turnOrder = hitBack?.moveName || incoming?.moveName ? { priority: { ally: getMovePriority(hitBack?.moveName), opponent: getMovePriority(incoming?.moveName) }, allyProfile: returnTurn, opponentProfile: incomingTurn, explanation: getTurnOrderExplanation({ moveName: hitBack?.moveName, speed: allySpeed }, { moveName: incoming?.moveName, speed: opponentSpeed }), plan: buildTurnPlan({ allyMove: hitBack?.moveName, opponentMove: incoming?.moveName, weather: options.weather || 'none', allySpeed, opponentSpeed }) } : null;
  const turnPlanRisk = turnOrder?.plan?.exposure ? 20 : 0;
  const residualDelta = opponentResidual.percent - allyResidual.percent;
  return { ally: allyPokemon, opponent: opponentPokemon, allySet, opponentSet, allySpeed, opponentSpeed, relation, hitBack, incoming, damageOut, damageIn, safeSwitch, classification, incomingMove: incoming?.moveName || null, returnMove: hitBack?.moveName || null, switchIn: allySwitch, turnOrder, turnPlanRisk, allyResidual, opponentResidual, residualDelta };
}


export function buildTwoTurnBattlePlan(opponent, ally, level = 100, round = 1, options = {}) {
  const response = analyzeResponse(opponent, ally, level, round, options);
  if (!response) return null;
  const allyHP = Number(options.allyHPPercent ?? 100);
  const opponentHP = Number(options.opponentHPPercent ?? 100);
  const outcome = buildTurnOutcomes({
    allyMove: response.returnMove || '',
    opponentMove: response.incomingMove || '',
    allySpeed: response.allySpeed,
    opponentSpeed: response.opponentSpeed,
    allyHPPercent: allyHP,
    opponentHPPercent: opponentHP,
    allyDamagePercent: Number(response.hitBack?.percentMax || 0),
    opponentDamagePercent: Number(response.incoming?.percentMax || 0),
    allyResidualPercent: Number(response.allyResidual?.percent || 0),
    opponentResidualPercent: Number(response.opponentResidual?.percent || 0),
    weather: options.weather || 'none',
  });
  return {
    ...outcome,
    response,
    twoTurnRange: {
      allyHPRemainingPercent: [outcome.turnTwo.allyHPRemaining, outcome.turnTwo.allyHPRemaining],
      opponentHPRemainingPercent: [outcome.turnTwo.opponentHPRemaining, outcome.turnTwo.opponentHPRemaining],
    },
    note: 'Two-turn projection uses the currently selected best damaging moves and the surviving set assumptions; it is a planning aid, not an exact future script.',
  };
}

export function analyzeOpponentSetPool(opponent, ally, opponentSets = [], level = 100, round = 1, options = {}) {
  const sets = opponentSets.filter(Boolean);
  const checks = sets.map((opponentSet) =>
    analyzeResponse(
      { ...opponent, setId: opponentSet.id },
      ally,
      level,
      round,
      { ...options, opponentSet }
    )
  ).filter(Boolean);
  if (!checks.length) return null;
  const bySpecies = (rows, key) => rows.map((row) => Number(row?.[key]) || 0);
  const damageOut = bySpecies(checks, 'damageOut');
  const damageIn = bySpecies(checks, 'damageIn');
  const safeCount = checks.filter((row) => row.safeSwitch).length;
  const fasterCount = checks.filter((row) => row.relation === 'outspeeds').length;
  const tieCount = checks.filter((row) => row.relation === 'speed ties').length;
  const exposureCount = checks.filter((row) => row.turnPlanRisk > 0).length;
  const residualDelta = checks.map((row) => Number(row.residualDelta) || 0);
  return {
    checks,
    setCount: checks.length,
    damageOutMin: Math.min(...damageOut),
    damageOutMax: Math.max(...damageOut),
    damageInMin: Math.min(...damageIn),
    damageInMax: Math.max(...damageIn),
    safeCount,
    safeShare: safeCount / checks.length,
    fasterCount,
    fasterShare: fasterCount / checks.length,
    tieCount,
    tieShare: tieCount / checks.length,
    exposureCount,
    exposureShare: exposureCount / checks.length,
    residualDeltaMin: Math.min(...residualDelta),
    residualDeltaMax: Math.max(...residualDelta),
    worstCase: checks.reduce((best, row) => !best || row.damageIn > best.damageIn ? row : best, null),
    bestCase: checks.reduce((best, row) => !best || row.damageOut > best.damageOut ? row : best, null),
  };
}

export function rankResponsesAcrossOpponentSets(opponent, team = [], opponentSets = [], level = 100, round = 1, options = {}) {
  return team.map((ally) => {
    const pool = analyzeOpponentSetPool(opponent, ally, opponentSets, level, round, options);
    if (!pool) return null;
    const score =
      (pool.fasterShare * 15) +
      (pool.safeShare * 20) +
      Math.min(60, pool.damageOutMin) -
      Math.min(60, pool.damageInMax) +
      Math.min(15, pool.residualDeltaMin) -
      (pool.exposureShare * 20);
    return { ally, pool, score };
  }).filter(Boolean).sort((a, b) => b.score - a.score);
}

export function rankResponses(opponent, team = [], level = 100, round = 1, options = {}) {
  return team.map((ally) => analyzeResponse(opponent, ally, level, round, options)).filter(Boolean).sort((a, b) => {
    const score = (x) => (x.relation === 'outspeeds' ? 15 : x.relation === 'speed ties' ? 5 : 0) + (x.safeSwitch ? 20 : 0) + Math.min(60, x.damageOut) - Math.min(60, x.damageIn) + Math.min(15, x.residualDelta) - x.turnPlanRisk;
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
