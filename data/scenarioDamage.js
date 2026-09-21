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
import { getFactorySet } from './setIdentity';

export const EMPTY_STAGES = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

export function scenarioKey(pokemon) {
  return `${String(pokemon?.species || '').trim().toLowerCase()}#${pokemon?.setId ?? pokemon?.id ?? ''}`;
}

export function scenarioState(pokemon, state = {}) {
  const key = scenarioKey(pokemon);
  const side = state.sides?.[key] || {};
  return {
    status: state.statuses?.[key] || side.status || 'healthy',
    stages: { ...EMPTY_STAGES, ...(state.stages?.[key] || side.statStages || {}) },
    ability: state.abilities?.[key] || side.ability || optionsFor(pokemon)[0] || '',
    weather: state.weather || 'none',
    hpPercent: side.hpPercent == null ? 100 : Math.max(0, Math.min(100, Number(side.hpPercent) || 0)),
    screens: { reflect: Boolean(side.reflect), lightScreen: Boolean(side.lightScreen) },
    substitute: Boolean(side.substitute),
    hazards: { spikes: Math.max(0, Math.min(3, Number(side.spikes) || 0)) },
  };
}

export function scenarioSpeed(pokemon, level, round, state = {}) {
  const s = scenarioState(pokemon, state);
  const set = pokemon?.setId != null ? getFactorySet(pokemon.species, pokemon.setId) : pokemon;
  const stats = applyStatStages(getStats(pokemon, set, level, round), s.stages);
  return getEffectiveSpeed(stats, s.status);
}

export function bestScenarioHit(attacker, defender, level, round, state = {}) {
  const atk = scenarioState(attacker, state);
  const def = scenarioState(defender, state);
  const attackerSet = attacker?.setId != null ? getFactorySet(attacker.species, attacker.setId) : attacker;
  const defenderSet = defender?.setId != null ? getFactorySet(defender.species, defender.setId) : defender;
  if (!attackerSet || !defenderSet) return null;
  const attackerStats = getStats(attacker, attackerSet, level, round);
  const defenderStats = getStats(defender, defenderSet, level, round);
  let best = null;
  for (const moveName of bestDamagingMoves(attackerSet)) {
    const result = calculateDamage({
      attacker,
      attackerSet,
      defender,
      defenderSet,
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
      attackerHP: Math.max(1, Math.floor(attackerStats.hp * atk.hpPercent / 100)),
      defenderHP: Math.max(1, Math.floor(defenderStats.hp * def.hpPercent / 100)),
      screens: def.screens,
          defenderSubstitute: Boolean(def.substitute),
    });
    if (!result.unsupported && (!best || result.percentMax > best.percentMax)) {
      best = { ...result, moveName };
    }
  }
  return best;
}

export function scenarioSwitchInDamage(pokemon, level, round, state = {}) {
  const s = scenarioState(pokemon, state);
  const set = pokemon?.setId != null ? getFactorySet(pokemon.species, pokemon.setId) : pokemon;
  const stats = getStats(pokemon, set, level, round);
  let percent = 0;
  const parts = [];
  const ability = String(set?.ability || pokemon?.ability || '').toLowerCase();
  const grounded = !(pokemon?.types || []).includes('Flying') && ability !== 'levitate';
  if (s.hazards.spikes > 0 && grounded) {
    const fractions = [0, 12.5, 16.6667, 25];
    percent += fractions[s.hazards.spikes] || 0;
    parts.push(`Spikes ${(fractions[s.hazards.spikes] || 0).toFixed(1)}%`);
  }
  return {
    percent: Math.min(100, percent),
    remainingPercent: Math.max(0, 100 - percent),
    parts,
    maxHP: stats.hp,
  };
}

export function scenarioMatchup(attacker, defender, level, round, state = {}) {
  const hitBack = bestScenarioHit(attacker, defender, level, round, state);
  const incoming = bestScenarioHit(defender, attacker, level, round, state);
  const attackerSpeed = scenarioSpeed(attacker, level, round, state);
  const defenderSpeed = scenarioSpeed(defender, level, round, state);
  const attackerSwitch = scenarioSwitchInDamage(attacker, level, round, state);
  const defenderSwitch = scenarioSwitchInDamage(defender, level, round, state);
  return {
    attacker,
    defender,
    hitBack,
    incoming,
    attackerSpeed,
    defenderSpeed,
    attackerSwitch,
    defenderSwitch,
    speed: attackerSpeed > defenderSpeed ? 'faster' : attackerSpeed < defenderSpeed ? 'slower' : 'tie',
  };
}
