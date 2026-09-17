// Generation III damage helpers for the Battle Factory Companion.
// This module is deliberately dependency-free so the calculator remains offline.

export const MOVE_DATA = {
  Megahorn: { type: 'Bug', power: 120, category: 'physical' },
  'Brick Break': { type: 'Fighting', power: 75, category: 'physical' },
  'Rock Tomb': { type: 'Rock', power: 50, category: 'physical' },
  Earthquake: { type: 'Ground', power: 100, category: 'physical' },
  'Rock Slide': { type: 'Rock', power: 75, category: 'physical' },
  Reversal: { type: 'Fighting', power: 20, category: 'physical', variable: 'reversal' },
  'Ice Beam': { type: 'Ice', power: 95, category: 'special' },
  Thunderbolt: { type: 'Electric', power: 95, category: 'special' },
  Thunder: { type: 'Electric', power: 120, category: 'special', weatherAccuracy: 'rain' },
  Blizzard: { type: 'Ice', power: 120, category: 'special', weatherAccuracy: 'hail' },
  Explosion: { type: 'Normal', power: 250, category: 'physical' },
  Psychic: { type: 'Psychic', power: 90, category: 'special' },
  'Ice Punch': { type: 'Ice', power: 75, category: 'physical' },
  'Fire Punch': { type: 'Fire', power: 75, category: 'physical' },
  ThunderPunch: { type: 'Electric', power: 75, category: 'physical' },
  'Shadow Ball': { type: 'Ghost', power: 80, category: 'physical' },
  'Meteor Mash': { type: 'Steel', power: 100, category: 'physical' },
  Surf: { type: 'Water', power: 95, category: 'special' },
  'Fire Blast': { type: 'Fire', power: 120, category: 'special' },
  Flamethrower: { type: 'Fire', power: 95, category: 'special' },
  Overheat: { type: 'Fire', power: 140, category: 'special' },
  'Aerial Ace': { type: 'Flying', power: 60, category: 'physical' },
  'Mud-Slap': { type: 'Ground', power: 20, category: 'physical' },
  'Double-Edge': { type: 'Normal', power: 120, category: 'physical' },
  'Steel Wing': { type: 'Steel', power: 70, category: 'physical' },
  'Magical Leaf': { type: 'Grass', power: 60, category: 'special' },
  'Dream Eater': { type: 'Psychic', power: 100, category: 'special' },
};

const TYPE_CHART = {
  Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 },
  Fire: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
  Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
  Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
  Grass: { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
  Ice: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
  Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Steel: 2 },
  Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0 },
  Ground: { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
  Flying: { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
  Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Steel: 0.5 },
  Bug: { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Steel: 0.5 },
  Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
  Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5, Steel: 0.5 },
  Dragon: { Dragon: 2, Steel: 0.5 },
  Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Steel: 0.5 },
  Steel: { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5 },
};

const NATURES = {
  Adamant: ['atk', 'spa'], Jolly: ['spe', 'spa'], Modest: ['spa', 'atk'], Quiet: ['spa', 'spe'],
  Bold: ['def', 'atk'], Hardy: [null, null], Docile: [null, null], Brave: ['atk', 'spe'],
  Timid: ['spe', 'atk'], Calm: ['spd', 'atk'], Relaxed: ['def', 'spe'], Sassy: ['spd', 'spe'],
  Hasty: ['spe', 'def'], Naive: ['spe', 'spd'], Lonely: ['atk', 'def'], Impish: ['def', 'spa'],
};

function natureMultiplier(nature, stat) {
  const [up, down] = NATURES[nature] || [null, null];
  if (stat === up) return 1.1;
  if (stat === down) return 0.9;
  return 1;
}

export function getFactoryIV(round) {
  const r = Math.max(1, Math.min(7, Number(round) || 1));
  return [0, 3, 6, 9, 12, 15, 21, 31][r];
}

export function calculateStat(base, ev, iv, level, nature, stat, isHP = false) {
  const value = isHP
    ? Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10
    : Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
  return isHP ? value : Math.floor(value * natureMultiplier(nature, stat));
}

export function getStats(pokemon, set, level, round) {
  // Exact set IV wins over a generic round-derived IV. This matters for draft
  // upgrades and for later swaps whose identity is carried with the set.
  const iv = Number(set?.factoryIV ?? pokemon?.factoryIV ?? getFactoryIV(round));
  return {
    hp: calculateStat(pokemon.baseStats.hp, set.evs.hp || 0, iv, level, set.nature, 'hp', true),
    atk: calculateStat(pokemon.baseStats.atk, set.evs.atk || 0, iv, level, set.nature, 'atk'),
    def: calculateStat(pokemon.baseStats.def, set.evs.def || 0, iv, level, set.nature, 'def'),
    spa: calculateStat(pokemon.baseStats.spa, set.evs.spa || 0, iv, level, set.nature, 'spa'),
    spd: calculateStat(pokemon.baseStats.spd, set.evs.spd || 0, iv, level, set.nature, 'spd'),
    spe: calculateStat(pokemon.baseStats.spe, set.evs.spe || 0, iv, level, set.nature, 'spe'),
  };
}

export function typeEffectiveness(moveType, defenderTypes) {
  return defenderTypes.reduce((multiplier, type) => multiplier * (TYPE_CHART[moveType]?.[type] ?? 1), 1);
}

function weatherMultiplier(moveType, weather) {
  if (weather === 'sun') {
    if (moveType === 'Fire') return 1.5;
    if (moveType === 'Water') return 0.5;
  }
  if (weather === 'rain') {
    if (moveType === 'Water') return 1.5;
    if (moveType === 'Fire') return 0.5;
  }
  return 1;
}

function movePower(move, attackerHP, maxHP) {
  if (move.variable === 'reversal') {
    const fraction = attackerHP / maxHP;
    if (fraction >= 0.7) return 20;
    if (fraction >= 0.55) return 40;
    if (fraction >= 0.4) return 50;
    if (fraction >= 0.25) return 70;
    if (fraction >= 0.1) return 100;
    return 200;
  }
  return move.power;
}

export function calculateDamage({ attacker, attackerSet, defender, defenderSet, level = 50, round = 1, moveName, weather = 'none', attackerStatus = 'healthy', defenderStatus = 'healthy', attackerHP }) {
  const move = MOVE_DATA[moveName];
  if (!move) return { min: 0, max: 0, percentMin: 0, percentMax: 0, effectiveness: 0, unsupported: true };
  const atkStats = getStats(attacker, attackerSet, level, round);
  const defStats = getStats(defender, defenderSet, level, round);
  const maxAttackerHP = atkStats.hp;
  const currentHP = attackerHP == null ? maxAttackerHP : Math.max(1, Math.min(maxAttackerHP, attackerHP));
  const attackStat = move.category === 'physical' ? atkStats.atk : atkStats.spa;
  const defenseStat = move.category === 'physical' ? defStats.def : defStats.spd;
  const power = movePower(move, currentHP, maxAttackerHP);
  let base = Math.floor(Math.floor(Math.floor((2 * level) / 5 + 2) * power * attackStat / defenseStat) / 50) + 2;

  if (attackerStatus === 'burned' && move.category === 'physical' && moveName !== 'Facade') base = Math.floor(base / 2);
  base = Math.floor(base * weatherMultiplier(move.type, weather));

  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const effectiveness = typeEffectiveness(move.type, defender.types);
  if (effectiveness === 0) return { min: 0, max: 0, percentMin: 0, percentMax: 0, effectiveness: 0, ko: null };

  const min = Math.floor(Math.floor(base * stab * effectiveness) * 217 / 255);
  const max = Math.floor(Math.floor(base * stab * effectiveness) * 255 / 255);
  const hp = defStats.hp;
  return {
    min,
    max,
    percentMin: Math.floor((min * 100) / hp * 10) / 10,
    percentMax: Math.floor((max * 100) / hp * 10) / 10,
    effectiveness,
    ko: Math.ceil(hp / Math.max(1, min)),
    hp,
    attackerStats: atkStats,
    defenderStats: defStats,
  };
}

export function bestDamagingMoves(set) {
  return (set?.moves || []).filter((move) => MOVE_DATA[move]);
}
