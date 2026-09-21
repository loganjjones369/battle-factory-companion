// Generation III damage helpers for the Battle Factory Companion.
// This module is deliberately dependency-free so the calculator remains offline.

const GENERATED_MOVE_DATA = {};
// Factory move metadata used by the offline Gen III damage engine.
// Damage-relevant entries are derived from the Factory move list and normalized to Emerald's
// pre-Generation-IV physical/special split. Variable/fixed-damage moves remain handled separately.
export const FACTORY_MOVE_DATA = {
  "AncientPower": { type: "Rock", power: 60, category: "physical" },
  "DragonBreath": { type: "Dragon", power: 60, category: "special" },
  "Aerial Ace": { type: "Flying", power: 60, category: "physical" },
  "Hyper Beam": { type: "Normal", power: 150, category: "physical" },
  "Earthquake": { type: "Ground", power: 100, category: "physical" },
  "Double-Edge": { type: "Normal", power: 120, category: "physical" },
  "Rock Slide": { type: "Rock", power: 75, category: "physical" },
  "Fire Blast": { type: "Fire", power: 120, category: "special" },
  "Dragon Claw": { type: "Dragon", power: 80, category: "special" },
  "Bite": { type: "Dark", power: 60, category: "special" },
  "Iron Tail": { type: "Steel", power: 100, category: "physical" },
  "Focus Punch": { type: "Fighting", power: 150, category: "physical" },
  "Surf": { type: "Water", power: 95, category: "special" },
  "Thunder": { type: "Electric", power: 120, category: "special" },
  "Blizzard": { type: "Ice", power: 120, category: "special" },
  "ThunderPunch": { type: "Electric", power: 75, category: "special" },
  "Fire Punch": { type: "Fire", power: 75, category: "special" },
  "Ice Punch": { type: "Ice", power: 75, category: "special" },
  "Psychic": { type: "Psychic", power: 90, category: "special" },
  "Body Slam": { type: "Normal", power: 85, category: "physical" },
  "Pursuit": { type: "Dark", power: 40, category: "special" },
  "Flamethrower": { type: "Fire", power: 95, category: "special" },
  "Ice Beam": { type: "Ice", power: 95, category: "special" },
  "Thunderbolt": { type: "Electric", power: 95, category: "special" },
  "Mega Kick": { type: "Normal", power: 120, category: "physical" },
  "Brick Break": { type: "Fighting", power: 75, category: "physical" },
  "ExtremeSpeed": { type: "Normal", power: 80, category: "physical" },
  "Crunch": { type: "Dark", power: 80, category: "special" },
  "Overheat": { type: "Fire", power: 140, category: "special" },
  "Slash": { type: "Normal", power: 70, category: "physical" },
  "Knock Off": { type: "Dark", power: 65, category: "special" },
  "Water Pulse": { type: "Water", power: 60, category: "special" },
  "Icy Wind": { type: "Ice", power: 55, category: "special" },
  "Facade": { type: "Normal", power: 70, category: "physical" },
  "Hydro Pump": { type: "Water", power: 120, category: "special" },
  "Double Kick": { type: "Fighting", power: 30, category: "physical" },
  "Blaze Kick": { type: "Fire", power: 85, category: "special" },
  "Sky Uppercut": { type: "Fighting", power: 85, category: "physical" },
  "Mach Punch": { type: "Fighting", power: 40, category: "physical" },
  "Headbutt": { type: "Normal", power: 70, category: "physical" },
  "Giga Drain": { type: "Grass", power: 60, category: "special" },
  "Sludge Bomb": { type: "Poison", power: 90, category: "physical" },
  "SolarBeam": { type: "Grass", power: 120, category: "special" },
  "Shadow Ball": { type: "Ghost", power: 80, category: "physical" },
  "Explosion": { type: "Normal", power: 250, category: "physical" },
  "Meteor Mash": { type: "Steel", power: 100, category: "physical" },
  "Magical Leaf": { type: "Grass", power: 60, category: "special" },
  "Astonish": { type: "Ghost", power: 30, category: "physical" },
  "Air Cutter": { type: "Flying", power: 60, category: "physical" },
  "Fake Out": { type: "Normal", power: 40, category: "physical" },
  "Signal Beam": { type: "Bug", power: 75, category: "physical" },
  "Drill Peck": { type: "Flying", power: 80, category: "physical" },
  "Tri Attack": { type: "Normal", power: 80, category: "physical" },
  "Steel Wing": { type: "Steel", power: 70, category: "physical" },
  "Rock Tomb": { type: "Rock", power: 50, category: "physical" },
  "Secret Power": { type: "Normal", power: 70, category: "physical" },
  "Outrage": { type: "Dragon", power: 90, category: "special" },
  "Sand Tomb": { type: "Ground", power: 15, category: "physical" },
  "Cross Chop": { type: "Fighting", power: 100, category: "physical" },
  "Swift": { type: "Normal", power: 60, category: "physical" },
  "Hyper Voice": { type: "Normal", power: 90, category: "physical" },
  "Extrasensory": { type: "Psychic", power: 80, category: "special" },
  "Mud-Slap": { type: "Ground", power: 20, category: "physical" },
  "Sky Attack": { type: "Flying", power: 140, category: "physical" },
  "Zap Cannon": { type: "Electric", power: 100, category: "special" },
  "Dream Eater": { type: "Psychic", power: 100, category: "special" },
  "Dig": { type: "Ground", power: 60, category: "physical" },
  "Megahorn": { type: "Bug", power: 120, category: "physical" },
  "Dizzy Punch": { type: "Normal", power: 70, category: "physical" },
  "Crush Claw": { type: "Normal", power: 75, category: "physical" },
  "Mist Ball": { type: "Psychic", power: 95, category: "special" },
  "Luster Purge": { type: "Psychic", power: 95, category: "special" },
  "Revenge": { type: "Fighting", power: 60, category: "physical" },
  "Quick Attack": { type: "Normal", power: 40, category: "physical" },
  "Bonemerang": { type: "Ground", power: 50, category: "physical" },
  "DynamicPunch": { type: "Fighting", power: 100, category: "physical" },
  "Superpower": { type: "Fighting", power: 120, category: "physical" },
  "Heat Wave": { type: "Fire", power: 100, category: "special" },
  "Bounce": { type: "Flying", power: 85, category: "physical" },
  "Metal Claw": { type: "Steel", power: 50, category: "physical" },
  "Leaf Blade": { type: "Grass", power: 70, category: "special" },
  "Silver Wind": { type: "Bug", power: 60, category: "physical" },
  "Rollout": { type: "Rock", power: 30, category: "physical" },
  "Wrap": { type: "Normal", power: 15, category: "physical" },
  "Fly": { type: "Flying", power: 70, category: "physical" },
  "Dive": { type: "Water", power: 60, category: "special" },
  "Thrash": { type: "Normal", power: 120, category: "physical" },
  "Petal Dance": { type: "Grass", power: 70, category: "special" },
  "Spark": { type: "Electric", power: 65, category: "special" },
  "Future Sight": { type: "Psychic", power: 80, category: "special" },
  "Sludge": { type: "Poison", power: 65, category: "physical" },
  "Crabhammer": { type: "Water", power: 90, category: "special" },
  "Mud Shot": { type: "Ground", power: 55, category: "physical" },
  "Confusion": { type: "Psychic", power: 50, category: "special" },
  "Take Down": { type: "Normal", power: 90, category: "physical" },
  "Ice Ball": { type: "Ice", power: 30, category: "special" },
  "Ember": { type: "Fire", power: 40, category: "special" },
  "BubbleBeam": { type: "Water", power: 65, category: "special" },
  "Acid": { type: "Poison", power: 40, category: "physical" },
  "Needle Arm": { type: "Grass", power: 60, category: "special" },
  "Mega Drain": { type: "Grass", power: 40, category: "special" },
  "Razor Wind": { type: "Normal", power: 80, category: "physical" },
  "Absorb": { type: "Grass", power: 20, category: "special" },
  "Rock Blast": { type: "Rock", power: 25, category: "physical" },
  "Flame Wheel": { type: "Fire", power: 60, category: "special" },
  "Water Gun": { type: "Water", power: 40, category: "special" },
  "Fury Cutter": { type: "Bug", power: 10, category: "physical" },
  "Fury Swipes": { type: "Normal", power: 18, category: "physical" },
  "Stomp": { type: "Normal", power: 65, category: "physical" },
  "Psybeam": { type: "Psychic", power: 65, category: "special" },
  "Shock Wave": { type: "Electric", power: 60, category: "special" },
  "Smog": { type: "Poison", power: 20, category: "physical" },
  "Twineedle": { type: "Bug", power: 25, category: "physical" },
  "DoubleSlap": { type: "Normal", power: 15, category: "physical" },
  "Bind": { type: "Normal", power: 15, category: "physical" },
  "Comet Punch": { type: "Normal", power: 18, category: "physical" },
  "Slam": { type: "Normal", power: 80, category: "physical" },
  "Lick": { type: "Ghost", power: 20, category: "physical" },
  "Razor Leaf": { type: "Grass", power: 55, category: "special" },
  "Rock Throw": { type: "Rock", power: 50, category: "physical" },
  "Whirlpool": { type: "Water", power: 15, category: "special" },
  "Fire Spin": { type: "Fire", power: 15, category: "special" },
  "Low Kick": { type: "Fighting", power: 50, category: "physical" },
  "Shadow Punch": { type: "Ghost", power: 60, category: "physical" },
  "Snore": { type: "Normal", power: 50, category: "physical" },
  "Poison Fang": { type: "Poison", power: 50, category: "physical" },
  "Covet": { type: "Normal", power: 60, category: "physical" },
  "Pin Missile": { type: "Bug", power: 14, category: "physical" },
  "Aurora Beam": { type: "Ice", power: 65, category: "special" },
  "Uproar": { type: "Normal", power: 50, category: "physical" },
  "Karate Chop": { type: "Fighting", power: 50, category: "physical" },
  "Rolling Kick": { type: "Fighting", power: 60, category: "physical" },
  "Triple Kick": { type: "Fighting", power: 10, category: "physical" },
  "Poison Tail": { type: "Poison", power: 50, category: "physical" },
  "Mega Punch": { type: "Normal", power: 80, category: "physical" },
  "Octazooka": { type: "Water", power: 65, category: "special" },
  "Spike Cannon": { type: "Normal", power: 20, category: "physical" },
  "Submission": { type: "Fighting", power: 80, category: "physical" },
  "Sonic Boom": { type: "Normal", fixedDamage: 20, category: "fixed" },
  "Dragon Rage": { type: "Dragon", fixedDamage: 40, category: "fixed" },
  "Night Shade": { type: "Ghost", fixedDamage: "level", category: "fixed" },
  "Seismic Toss": { type: "Fighting", fixedDamage: "level", category: "fixed" },
  "Psywave": { type: "Psychic", fixedDamage: "psywave", category: "fixed" },
  "Super Fang": { type: "Normal", fixedDamage: "half-current-hp", category: "fixed" },
  "Endeavor": { type: "Normal", fixedDamage: "hp-difference", category: "fixed" },
  "Double Slap": { type: "Normal", power: 15, category: "physical", multiHit: true },
  "Fury Attack": { type: "Normal", power: 15, category: "physical", multiHit: true },
  "Bone Rush": { type: "Ground", power: 25, category: "physical", multiHit: true },
  "Arm Thrust": { type: "Fighting", power: 15, category: "physical", multiHit: true },
  "Bullet Seed": { type: "Grass", power: 10, category: "physical", multiHit: true },
  "Icicle Spear": { type: "Ice", power: 10, category: "physical", multiHit: true },
};


const TYPE_CHART = {
  Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 }, Fire: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 }, Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 }, Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 }, Grass: { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 }, Ice: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 }, Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Steel: 2 }, Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0 }, Ground: { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 }, Flying: { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 }, Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Steel: 0.5 }, Bug: { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Steel: 0.5 }, Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 }, Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5, Steel: 0.5 }, Dragon: { Dragon: 2, Steel: 0.5 }, Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Steel: 0.5 }, Steel: { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5 },
};

const NATURES = {
  Adamant: ['atk', 'spa'], Jolly: ['spe', 'spa'], Modest: ['spa', 'atk'], Quiet: ['spa', 'spe'], Bold: ['def', 'atk'], Hardy: [null, null], Docile: [null, null], Brave: ['atk', 'spe'], Timid: ['spe', 'atk'], Calm: ['spd', 'atk'], Relaxed: ['def', 'spe'], Sassy: ['spd', 'spe'], Hasty: ['spe', 'def'], Naive: ['spe', 'spd'], Lonely: ['atk', 'def'], Impish: ['def', 'spa'],
};
export function getNatureEffect(nature, stat) { const [up, down] = NATURES[nature] || [null, null]; if (stat === up) return 'up'; if (stat === down) return 'down'; return 'neutral'; }
function natureMultiplier(nature, stat) { const effect = getNatureEffect(nature, stat); return effect === 'up' ? 1.1 : effect === 'down' ? 0.9 : 1; }
export function getFactoryIV(round) { const r = Math.max(1, Math.min(7, Number(round) || 1)); return [0, 3, 6, 9, 12, 15, 21, 31][r]; }
export function calculateStat(base, ev, iv, level, nature, stat, isHP = false) { const value = isHP ? Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10 : Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5; return isHP ? value : Math.floor(value * natureMultiplier(nature, stat)); }
export function getStats(pokemon, set, level, round) { const iv = Number(set?.factoryIV ?? pokemon?.factoryIV ?? getFactoryIV(round)); return { hp: calculateStat(pokemon.baseStats.hp, set.evs.hp || 0, iv, level, set.nature, 'hp', true), atk: calculateStat(pokemon.baseStats.atk, set.evs.atk || 0, iv, level, set.nature, 'atk'), def: calculateStat(pokemon.baseStats.def, set.evs.def || 0, iv, level, set.nature, 'def'), spa: calculateStat(pokemon.baseStats.spa, set.evs.spa || 0, iv, level, set.nature, 'spa'), spd: calculateStat(pokemon.baseStats.spd, set.evs.spd || 0, iv, level, set.nature, 'spd'), spe: calculateStat(pokemon.baseStats.spe, set.evs.spe || 0, iv, level, set.nature, 'spe') }; }
export function getStatStageMultiplier(stage = 0) { const s = Math.max(-6, Math.min(6, Number(stage) || 0)); return s >= 0 ? (2 + s) / 2 : 2 / (2 - s); }
export function applyStatStage(stat, stage = 0) { return Math.floor(Number(stat || 0) * getStatStageMultiplier(stage)); }
export function applyStatStages(stats, stages = {}) { return { ...stats, atk: applyStatStage(stats.atk, stages.atk), def: applyStatStage(stats.def, stages.def), spa: applyStatStage(stats.spa, stages.spa), spd: applyStatStage(stats.spd, stages.spd), spe: applyStatStage(stats.spe, stages.spe) }; }
export const DEFAULT_STAT_STAGES = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
export function normalizeStatus(status = 'healthy') { const s = String(status || 'healthy').trim().toLowerCase(); const aliases = { healthy: 'healthy', none: 'healthy', par: 'paralyzed', paralysis: 'paralyzed', paralyzed: 'paralyzed', brn: 'burned', burn: 'burned', burned: 'burned', psn: 'poisoned', poison: 'poisoned', poisoned: 'poisoned', tox: 'toxic', toxic: 'toxic', slp: 'asleep', sleep: 'asleep', asleep: 'asleep', frz: 'frozen', freeze: 'frozen', frozen: 'frozen' }; return aliases[s] || s; }
export function getEffectiveSpeed(stats, status = 'healthy') { const raw = Number(stats?.spe) || 0; return normalizeStatus(status) === 'paralyzed' ? Math.floor(raw / 4) : raw; }
export function typeEffectiveness(moveType, defenderTypes) { return defenderTypes.reduce((multiplier, type) => multiplier * (TYPE_CHART[moveType]?.[type] ?? 1), 1); }
export function getWeatherDamageMultiplier(moveType, weather = 'none') { if (weather === 'sun') { if (moveType === 'Fire') return 1.5; if (moveType === 'Water') return 0.5; } if (weather === 'rain') { if (moveType === 'Water') return 1.5; if (moveType === 'Fire') return 0.5; } return 1; }
const RECOVERY_MOVES = new Set(['Moonlight', 'Synthesis', 'Morning Sun']);
export function getWeatherRecoveryFraction(moveName, weather = 'none') { if (!RECOVERY_MOVES.has(moveName)) return null; if (weather === 'sun') return 2 / 3; if (weather === 'rain' || weather === 'sand' || weather === 'hail') return 1 / 4; return 1 / 2; }
export function getRecoveryAmount(moveName, maxHP, weather = 'none') { const fraction = getWeatherRecoveryFraction(moveName, weather); return fraction == null ? 0 : Math.floor(Number(maxHP || 0) * fraction); }
function movePower(move, attackerHP, maxHP) { if (move.variable === 'reversal') { const fraction = attackerHP / maxHP; if (fraction >= 0.7) return 20; if (fraction >= 0.55) return 40; if (fraction >= 0.4) return 50; if (fraction >= 0.25) return 70; if (fraction >= 0.1) return 100; return 200; } return move.power; }

function normalizeAbility(value) { return String(value || '').trim().toLowerCase(); }
function selectedAbility(pokemon, set, explicit) { if (explicit) return explicit; const raw = String(set?.ability || pokemon?.ability || '').split('/').map((x) => x.trim()).filter(Boolean); return raw[0] || ''; }
function abilityEffect({ moveType, effectiveness, category, attackerAbility, defenderAbility, attackerStatus }) {
  const atk = normalizeAbility(attackerAbility); const def = normalizeAbility(defenderAbility);
  if (def === 'levitate' && moveType === 'Ground') return { immune: true, multiplier: 0, reason: 'Levitate' };
  if (def === 'flash fire' && moveType === 'Fire') return { immune: true, multiplier: 0, reason: 'Flash Fire' };
  if (def === 'water absorb' && moveType === 'Water') return { immune: true, multiplier: 0, reason: 'Water Absorb' };
  if (def === 'volt absorb' && moveType === 'Electric') return { immune: true, multiplier: 0, reason: 'Volt Absorb' };
  if (def === 'wonder guard' && effectiveness <= 1) return { immune: true, multiplier: 0, reason: 'Wonder Guard' };
  let multiplier = 1; const reasons = [];
  if (def === 'thick fat' && (moveType === 'Fire' || moveType === 'Ice')) { multiplier *= 0.5; reasons.push('Thick Fat'); }
  if (category === 'physical' && (atk === 'huge power' || atk === 'pure power')) { reasons.push('Huge/Pure Power'); }
  if (category === 'physical' && atk === 'guts' && attackerStatus !== 'healthy') { multiplier *= 1.5; reasons.push('Guts'); }
  if ((moveType === 'Fire' && atk === 'blaze') || (moveType === 'Water' && atk === 'torrent') || (moveType === 'Grass' && atk === 'overgrow') || (moveType === 'Bug' && atk === 'swarm')) { reasons.push('STAB ability'); }
  return { immune: false, multiplier, reason: reasons.join(' • '), attackMultiplier: category === 'physical' && (atk === 'huge power' || atk === 'pure power') ? 2 : 1 };
}

export function getDamageRollDistribution(result) {
  if (!result || result.max == null) return [];
  const counts = new Map();
  for (let factor = 217; factor <= 255; factor += 1) {
    const damage = Math.floor(Number(result.max) * factor / 255);
    counts.set(damage, (counts.get(damage) || 0) + 1);
  }
  return [...counts.entries()].map(([damage, count]) => ({ damage, rolls: count, probability: Number((count / 39 * 100).toFixed(1)) }));
}

export function getDamageRolls(result) {
  if (!result || result.min == null || result.max == null) return [];
  const values = [];
  for (let factor = 217; factor <= 255; factor += 1) values.push(Math.floor(Number(result.max) * factor / 255));
  return [...new Set(values)];
}

export function calculateDamage({ attacker, attackerSet, defender, defenderSet, level = 50, round = 1, moveName, weather = 'none', attackerStatus = 'healthy', defenderStatus = 'healthy', attackerHP, defenderHP, attackerStages = DEFAULT_STAT_STAGES, defenderStages = DEFAULT_STAT_STAGES, attackerAbility, defenderAbility, critical = false, screens = {}, targets = 1 }) {
  const move = MOVE_DATA[moveName];
  if (!move) return { min: 0, max: 0, percentMin: 0, percentMax: 0, effectiveness: 0, unsupported: true };
  const rawAtkStats = getStats(attacker, attackerSet, level, round); const rawDefStats = getStats(defender, defenderSet, level, round);
  const defenderCurrentHP = defenderHP == null ? rawDefStats.hp : Math.max(0, Math.min(rawDefStats.hp, Number(defenderHP) || 0));
  const fixedEffectiveness = typeEffectiveness(move.type, defender.types);
  if (move.category === 'fixed') {
    if (fixedEffectiveness === 0) return { min: 0, max: 0, percentMin: 0, percentMax: 0, effectiveness: 0, immune: true, fixedDamage: true };
    let min = 0; let max = 0;
    if (move.fixedDamage === 'level') { min = max = level; }
    else if (move.fixedDamage === 20 || move.fixedDamage === 40) { min = max = move.fixedDamage; }
    else if (move.fixedDamage === 'half-current-hp') { min = max = Math.floor(defenderCurrentHP / 2); }
    else if (move.fixedDamage === 'hp-difference') {
      const attackerCurrentHP = attackerHP == null ? rawAtkStats.hp : Math.max(0, Math.min(rawAtkStats.hp, Number(attackerHP) || 0));
      min = max = Math.max(0, attackerCurrentHP - defenderCurrentHP);
    } else if (move.fixedDamage === 'psywave') {
      min = Math.max(1, Math.floor(level * 0.5)); max = Math.max(min, Math.floor(level * 1.5));
    } else return { min: 0, max: 0, percentMin: 0, percentMax: 0, effectiveness: fixedEffectiveness, unsupported: true };
    return { min, max, percentMin: Math.floor((min * 100) / rawDefStats.hp * 10) / 10, percentMax: Math.floor((max * 100) / rawDefStats.hp * 10) / 10, effectiveness: fixedEffectiveness, hp: rawDefStats.hp, fixedDamage: true, attackerStats: rawAtkStats, defenderStats: rawDefStats };
  }
  const atkStats = applyStatStages(rawAtkStats, attackerStages); const defStats = applyStatStages(rawDefStats, defenderStages);
  const maxAttackerHP = rawAtkStats.hp; const currentHP = attackerHP == null ? maxAttackerHP : Math.max(1, Math.min(maxAttackerHP, attackerHP)); const normalizedAttackerStatus = normalizeStatus(attackerStatus); const normalizedDefenderStatus = normalizeStatus(defenderStatus);
  const chosenAtkAbility = selectedAbility(attacker, attackerSet, attackerAbility); const chosenDefAbility = selectedAbility(defender, defenderSet, defenderAbility);
  const crit = Boolean(critical);
  const critAtkStages = { ...attackerStages }; const critDefStages = { ...defenderStages };
  if (crit) { for (const s of ['atk','spa']) critAtkStages[s] = Math.max(0, Number(critAtkStages[s] || 0)); for (const s of ['def','spd']) critDefStages[s] = Math.min(0, Number(critDefStages[s] || 0)); }
  const calcAtkStats = crit ? applyStatStages(rawAtkStats, critAtkStages) : atkStats;
  const calcDefStats = crit ? applyStatStages(rawDefStats, critDefStages) : defStats;
  const attackStatBase = move.category === 'physical' ? calcAtkStats.atk : calcAtkStats.spa; const defenseStat = move.category === 'physical' ? calcDefStats.def : calcDefStats.spd;
  const ability = abilityEffect({ moveType: move.type, effectiveness: typeEffectiveness(move.type, defender.types), category: move.category, attackerAbility: chosenAtkAbility, defenderAbility: chosenDefAbility, attackerStatus: normalizedAttackerStatus });
  if (ability.immune) return { min: 0, max: 0, percentMin: 0, percentMax: 0, effectiveness: typeEffectiveness(move.type, defender.types), ko: null, immune: true, abilityReason: ability.reason, attackerStats: atkStats, defenderStats: defStats, rawAttackerStats: rawAtkStats, rawDefenderStats: rawDefStats };
  const lowHPBoost = currentHP * 3 <= maxAttackerHP && ((move.type === 'Fire' && normalizeAbility(chosenAtkAbility) === 'blaze') || (move.type === 'Water' && normalizeAbility(chosenAtkAbility) === 'torrent') || (move.type === 'Grass' && normalizeAbility(chosenAtkAbility) === 'overgrow') || (move.type === 'Bug' && normalizeAbility(chosenAtkAbility) === 'swarm')) ? 1.5 : 1;
  const attackStat = Math.floor(attackStatBase * (ability.attackMultiplier || 1)); const power = movePower(move, currentHP, maxAttackerHP);
  let base = Math.floor(Math.floor(Math.floor((2 * level) / 5 + 2) * power * attackStat / defenseStat) / 50) + 2;
  if (attackerStatus === 'burned' && move.category === 'physical' && normalizeAbility(chosenAtkAbility) !== 'guts') base = Math.floor(base / 2);
  base = Math.floor(base * getWeatherDamageMultiplier(move.type, weather));
  const item = normalizeAbility(attackerSet?.item);
  const typeBoostItems = { magnet:'electric', charcoal:'fire', nevermeltice:'ice', 'miracle seed':'grass', mysticwater:'water', 'soft sand':'ground', 'hard stone':'rock', 'blackglasses':'dark', 'silverpowder':'bug', 'spell tag':'ghost', 'twistedspoon':'psychic', 'dragon fang':'dragon', 'metal coat':'steel', 'poison barb':'poison', 'sharp beak':'flying', 'black belt':'fighting' };
  if (typeBoostItems[item] === normalizeAbility(move.type)) base = Math.floor(base * 1.1);
  if (item === 'choice band' && move.category === 'physical') base = Math.floor(base * 1.5);
  const stab = attacker.types.includes(move.type) ? 1.5 : 1; const effectiveness = typeEffectiveness(move.type, defender.types); if (effectiveness === 0) return { min: 0, max: 0, percentMin: 0, percentMax: 0, effectiveness: 0, ko: null, abilityReason: ability.reason, attackerStats: atkStats, defenderStats: defStats, rawAttackerStats: rawAtkStats, rawDefenderStats: rawDefStats };
  const modifiedBase = Math.floor(base * ability.multiplier * lowHPBoost); let critBase = modifiedBase; if (crit) critBase = Math.floor(critBase * 2); if (screens?.reflect && move.category === 'physical' && !crit) critBase = Math.floor(critBase / 2); if (screens?.lightScreen && move.category === 'special' && !crit) critBase = Math.floor(critBase / 2); if (targets > 1) critBase = Math.floor(critBase / 2); const min = Math.floor(Math.floor(critBase * stab * effectiveness) * 217 / 255); const max = Math.floor(Math.floor(critBase * stab * effectiveness) * 255 / 255); const hp = rawDefStats.hp;
  if (move.multiHit) {
    const minHits = 2; const maxHits = 5;
    return { min: min * minHits, max: max * maxHits, percentMin: Math.floor((min * minHits * 100) / hp * 10) / 10, percentMax: Math.floor((max * maxHits * 100) / hp * 10) / 10, effectiveness, hp, immune: false, multiHit: true, hitRange: [minHits, maxHits], abilityReason: ability.reason, attackerAbility: chosenAtkAbility, defenderAbility: chosenDefAbility, attackerStats: atkStats, defenderStats: defStats, rawAttackerStats: rawAtkStats, rawDefenderStats: rawDefStats };
  }
  return { min, max, percentMin: Math.floor((min * 100) / hp * 10) / 10, percentMax: Math.floor((max * 100) / hp * 10) / 10, effectiveness, hp, immune: false, abilityReason: ability.reason, attackerAbility: chosenAtkAbility, defenderAbility: chosenDefAbility, attackerStats: atkStats, defenderStats: defStats, rawAttackerStats: rawAtkStats, rawDefenderStats: rawDefenderStats };
}
export function bestDamagingMoves(set) { return (set?.moves || []).filter((move) => MOVE_DATA[move]); }
