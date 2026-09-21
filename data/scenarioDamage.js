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
  const side = state.sides?.[key] || {};
  return {
    status: state.statuses?.[key] || side.status || 'healthy',
    stages: { ...EMPTY_STAGES, ...(state.stages?.[key] || side.statStages || {}) },
    ability: state.abilities?.[key] || side.ability || optionsFor(pokemon)[0] || '',
    weather: state.weather || 'none',
    hpPercent: side.hpPercent == null ? 100 : Math.max(0, Math.min(100, Number(side.hpPercent) || 0)),
    screens: { reflect: Boolean(side.reflect), lightScreen: Boolean(side.lightScreen) },
    hazards: { spikes: Math.max(0, Math.min(3, Number(side.spikes) || 0)), stealthRock: Boolean(side.stealthRock) },
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
      attackerHP: Math.max(1, Math.floor(getStats(attacker, attacker, level, round).hp * atk.hpPercent / 100)),
      screens: def.screens,
    });
    if (!result.unsupported && (!best || result.percentMax > best.percentMax)) {
      best = { ...result, moveName };
    }
  }
  return best;
}

export function scenarioSwitchInDamage(pokemon, level, round, state = {}) {
  const s = scenarioState(pokemon, state);
  const stats = getStats(pokemon, pokemon, level, round);
  let percent = 0;
  const parts = [];
  if (s.hazards.stealthRock) {
    const rock = pokemon?.types || [];
    const effectiveness = rock.reduce((m, type) => m * ({
      Fire: 0.5, Ice: 2, Flying: 2, Bug: 2, Fighting: 0.5, Ground: 0.5, Steel: 0.5
    }[type] ?? 1), 1);
    percent += 12.5 * effectiveness;
    parts.push(`Stealth Rock ${(12.5 * effectiveness).toFixed(1)}%`);
  }
  if (s.hazards.spikes > 0 && !(pokemon?.types || []).includes('Flying')) {
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
