// Pokémon Emerald Battle Factory data pack.
// Set data is based on the Generation III Battle Frontier tables.
// This file is intentionally local so the calculator can work offline.

export const FACTORY_RULES = {
  rentalIVsByRound: { 1: 3, 2: 6, 3: 9, 4: 12, 5: 15, 6: 21, 7: 31 },
  level50: {
    rounds1: 'Group 1',
    rounds2to3: 'Group 2',
    rounds4to7: 'Group 3 variants 1-4',
    round8Plus: 'Group 3, with Level 50 legendary restrictions',
  },
  openLevel: {
    rounds1to4: 'Group 3 variants 1-4',
    round5Plus: 'Group 3',
  },
};

export const POKEMON = {
  Heracross: {
    id: 214,
    types: ['Bug', 'Fighting'],
    baseStats: { hp: 80, atk: 125, def: 75, spa: 40, spd: 95, spe: 85 },
    sets: [
      { id: 1, item: 'Focus Band', nature: 'Adamant', evs: { atk: 252, def: 252 }, moves: ['Megahorn', 'Brick Break', 'Rock Tomb', 'Counter'] },
      { id: 2, item: 'Lum Berry', nature: 'Jolly', evs: { hp: 252, spe: 252 }, moves: ['Megahorn', 'Earthquake', 'Attract', 'Bulk Up'] },
      { id: 3, item: 'BrightPowder', nature: 'Adamant', evs: { atk: 252, spe: 252 }, moves: ['Megahorn', 'Earthquake', 'Rock Slide', 'Brick Break'] },
      { id: 4, item: 'Salac Berry', nature: 'Adamant', evs: { atk: 252, spe: 252 }, moves: ['Megahorn', 'Earthquake', 'Reversal', 'Endure'] },
    ],
  },
  Regice: {
    id: 378,
    types: ['Ice'],
    baseStats: { hp: 80, atk: 50, def: 100, spa: 100, spd: 200, spe: 50 },
    sets: [
      { id: 1, item: 'Chesto Berry', nature: 'Modest', evs: { hp: 252, spa: 252 }, moves: ['Ice Beam', 'Thunderbolt', 'Amnesia', 'Rest'] },
      { id: 2, item: 'BrightPowder', nature: 'Quiet', evs: { hp: 252, spa: 252 }, moves: ['Thunder', 'Rain Dance', 'Blizzard', 'Brick Break'] },
      { id: 3, item: 'Lum Berry', nature: 'Quiet', evs: { hp: 252, spa: 252 }, moves: ['Ice Beam', 'Thunderbolt', 'Thunder Wave', 'Explosion'] },
      { id: 4, item: 'Leftovers', nature: 'Bold', evs: { hp: 252, def: 252 }, moves: ['Ice Beam', 'Hail', 'Double Team', 'Thunder Wave'] },
    ],
  },
  Gardevoir: {
    id: 282,
    types: ['Psychic'],
    baseStats: { hp: 68, atk: 65, def: 65, spa: 125, spd: 115, spe: 80 },
    sets: [
      { id: 1, item: 'Leftovers', nature: 'Timid', evs: { hp: 170, def: 170, spe: 170 }, moves: ['Dream Eater', 'Hypnosis', 'Magical Leaf', 'Reflect'] },
      { id: 2, item: 'Chesto Berry', nature: 'Modest', evs: { hp: 252, def: 252 }, moves: ['Psychic', 'Calm Mind', 'Double Team', 'Rest'] },
      { id: 3, item: 'Lum Berry', nature: 'Modest', evs: { spa: 252, spe: 252 }, moves: ['Psychic', 'Thunderbolt', 'Will-O-Wisp', 'Destiny Bond'] },
      { id: 4, item: 'BrightPowder', nature: 'Modest', evs: { spa: 252, spe: 252 }, moves: ['Psychic', 'Magical Leaf', 'Attract', 'Double Team'] },
    ],
  },
  Moltres: {
    id: 146,
    types: ['Fire', 'Flying'],
    baseStats: { hp: 90, atk: 100, def: 90, spa: 125, spd: 85, spe: 90 },
    sets: [
      { id: 1, item: 'Lum Berry', nature: 'Docile', evs: { atk: 252, spa: 252 }, moves: ['Flamethrower', 'Aerial Ace', 'Mud-Slap', 'Roar'] },
      { id: 2, item: 'White Herb', nature: 'Hardy', evs: { atk: 252, spa: 252 }, moves: ['Overheat', 'Aerial Ace', 'Double Team', 'Protect'] },
      { id: 3, item: 'Chesto Berry', nature: 'Modest', evs: { spa: 252, spe: 252 }, moves: ['Fire Blast', 'Sunny Day', 'Double Team', 'Rest'] },
      { id: 4, item: 'White Herb', nature: 'Quiet', evs: { atk: 252, spa: 252 }, moves: ['Overheat', 'Double-Edge', 'Steel Wing', 'Safeguard'] },
    ],
  },
  Metagross: {
    id: 376,
    types: ['Steel', 'Psychic'],
    baseStats: { hp: 80, atk: 135, def: 130, spa: 95, spd: 90, spe: 70 },
    sets: [
      { id: 1, item: 'Quick Claw', nature: 'Jolly', evs: { hp: 170, atk: 170, spe: 170 }, moves: ['Explosion', 'Earthquake', 'Rock Slide', 'Brick Break'] },
      { id: 2, item: 'BrightPowder', nature: 'Hardy', evs: { atk: 252, spa: 252 }, moves: ['Meteor Mash', 'Psychic', 'Ice Punch', 'ThunderPunch'] },
      { id: 3, item: 'Shell Bell', nature: 'Hardy', evs: { atk: 252, spa: 252 }, moves: ['Earthquake', 'Shadow Ball', 'Ice Punch', 'ThunderPunch'] },
      { id: 4, item: 'Quick Claw', nature: 'Adamant', evs: { hp: 170, atk: 170, spe: 170 }, moves: ['Meteor Mash', 'Earthquake', 'Brick Break', 'Explosion'] },
    ],
  },
  Swampert: {
    id: 260,
    types: ['Water', 'Ground'],
    baseStats: { hp: 100, atk: 110, def: 90, spa: 85, spd: 90, spe: 60 },
    sets: [
      { id: 1, item: 'Lum Berry', nature: 'Adamant', evs: { hp: 170, atk: 252 }, moves: ['Earthquake', 'Counter', 'Rest', 'Curse'] },
      { id: 2, item: 'Quick Claw', nature: 'Docile', evs: { hp: 170, def: 170, spa: 170 }, moves: ['Surf', 'Earthquake', 'Counter', 'Mirror Coat'] },
      { id: 3, item: 'Shell Bell', nature: 'Brave', evs: { atk: 252, spa: 252 }, moves: ['Surf', 'Earthquake', 'Ice Beam', 'Counter'] },
      { id: 4, item: 'Shell Bell', nature: 'Quiet', evs: { atk: 252, spa: 252 }, moves: ['Surf', 'Earthquake', 'Ice Beam', 'Mirror Coat'] },
    ],
  },
};

export function normalizePokemonName(value) {
  const cleaned = value.trim().toLowerCase();
  return Object.keys(POKEMON).find((name) => name.toLowerCase() === cleaned) || null;
}

export function getPokemon(value) {
  const name = normalizePokemonName(value);
  return name ? { name, ...POKEMON[name] } : null;
}

export function getSets(value) {
  return getPokemon(value)?.sets || [];
}
