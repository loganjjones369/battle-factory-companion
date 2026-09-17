import { bestDamagingMoves, calculateDamage, getEffectiveSpeed, getStats } from './damageCalc';

function bestHit(attacker, defender, level, round) {
  let best = null;
  for (const moveName of bestDamagingMoves(attacker)) {
    const result = calculateDamage({ attacker, attackerSet: attacker, defender, defenderSet: defender, level, round, moveName });
    if (!result.unsupported && (!best || result.percentMax > best.percentMax)) best = { ...result, moveName };
  }
  return best;
}

function speedRelation(allySpeed, opponentSpeed) {
  if (allySpeed > opponentSpeed) return 'outspeeds';
  if (allySpeed < opponentSpeed) return 'slower than';
  return 'speed ties';
}

export function analyzeResponse(opponent, ally, level, round) {
  if (!opponent || !ally) return null;
  const opponentSpeed = getEffectiveSpeed(getStats(opponent, opponent, level, round), 'healthy');
  const allySpeed = getEffectiveSpeed(getStats(ally, ally, level, round), 'healthy');
  const hitBack = bestHit(ally, opponent, level, round);
  const incoming = bestHit(opponent, ally, level, round);
  const relation = speedRelation(allySpeed, opponentSpeed);
  const damageOut = hitBack?.percentMax ?? 0;
  const damageIn = incoming?.percentMax ?? 0;
  const guaranteedTwoHKO = hitBack ? hitBack.percentMin >= 50 : false;
  const guaranteedOHKO = hitBack ? hitBack.percentMin >= 100 : false;
  const possibleOHKO = hitBack ? hitBack.percentMax >= 100 : false;
  const dangerousIncoming = incoming ? incoming.percentMin >= 50 : false;
  const safeSwitch = damageIn < 50 && !dangerousIncoming;
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
  return { ally, opponent, allySpeed, opponentSpeed, relation, hitBack, incoming, damageOut, damageIn, guaranteedTwoHKO, guaranteedOHKO, possibleOHKO, dangerousIncoming, safeSwitch, classification };
}

export function rankResponses(opponent, team = [], level = 100, round = 1) {
  return team.map((ally) => analyzeResponse(opponent, ally, level, round)).filter(Boolean).sort((a, b) => {
    const score = (x) => (x.guaranteedOHKO ? 100 : 0) + (x.possibleOHKO ? 35 : 0) + (x.guaranteedTwoHKO ? 25 : 0) + (x.relation === 'outspeeds' ? 15 : x.relation === 'speed ties' ? 5 : 0) + (x.safeSwitch ? 20 : 0) + Math.min(20, x.damageOut / 5) - Math.min(30, x.damageIn / 3);
    return score(b) - score(a);
  });
}
