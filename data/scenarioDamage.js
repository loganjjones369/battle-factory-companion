// Shared scenario-aware damage helpers for draft and battle analysis.
// Keeps status, stat stages, weather, and explicit abilities in one place so
// every higher-level analyzer can use the same Generation III damage inputs.
import {
  calculateDamage,
  getEffectiveSpeed,
  getStats,
  applyStatStages,
  bestDamagingMoves,
} from './damageCalc';
import { optionsFor } from '../components/AbilitySelector';

export const EMPTY_STAGES = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

export function scenarioKey(pokemon) {
  return `${String(pokemon?.species || '').trim().toLowerCase()}#${pokemon?.setId ?? pokemon?.id ?? ''}`;
}

export function scenarioState(pokemon, state = {}) {
  const key = scenarioKey(pokemon);
  return {
    status: state.statuses?.[key] || 'healthy',
    stages: { ...EMPTY_STAGES, ...(state.stages?.[key] || {}) },
    ability: state.abilities?.[key] || optionsFor(pokemon)[0] || '',
    weather: state.weather || 'none',
  };
}

export function scenarioSpeed(pokemon, level, round, state = {}) {
  const s = scenarioState(pokemon, state);
  const stats = applyStatStages(getStats(pokemon, pokemon, level, round), s.stages);
  return getEffectiveSpeed(stats, s.status);
}

export function bestScenarioHit(attacker, defender, level, round, state = {}) {
  const atk = scenarioState(attacker, state);
  const def = scenarioState(defender, state);
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
      weather: atk.weather,
      attackerStatus: atk.status,
      defenderStatus: def.status,
      attackerAbility: atk.ability,
      defenderAbility: def.ability,
      attackerStages: atk.stages,
      defenderStages: def.stages,
    });
    if (!result.unsupported && (!best || result.percentMax > best.percentMax)) {
      best = { ...result, moveName };
    }
  }
  return best;
}

export function scenarioMatchup(attacker, defender, level, round, state = {}) {
  const hitBack = bestScenarioHit(attacker, defender, level, round, state);
  const incoming = bestScenarioHit(defender, attacker, level, round, state);
  const attackerSpeed = scenarioSpeed(attacker, level, round, state);
  const defenderSpeed = scenarioSpeed(defender, level, round, state);
  return {
    attacker,
    defender,
    hitBack,
    incoming,
    attackerSpeed,
    defenderSpeed,
    speed: attackerSpeed > defenderSpeed ? 'faster' : attackerSpeed < defenderSpeed ? 'slower' : 'tie',
    guaranteedOHKO: !!hitBack && hitBack.percentMin >= 100,
    guaranteedTwoHKO: !!hitBack && hitBack.percentMin * 2 >= 100,
    threatened: !!incoming && incoming.percentMax >= 100,
  };
}
