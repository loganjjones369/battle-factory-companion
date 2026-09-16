// Local Generation III Emerald Battle Factory data pack.
// The first six species are cross-checked against Battle Factory Buddy's allpkmn.csv.
// More species and later-round variants will be added to this same local structure.

export const FACTORY_RULES = {
  rentalIVsByRound: { 1: 3, 2: 6, 3: 9, 4: 12, 5: 15, 6: 21, 7: 31 },
  level50: { rounds1: 'Group 1', rounds2to3: 'Group 2', rounds4to7: 'Group 3 variants', round8Plus: 'Group 3 with Level 50 restrictions' },
  openLevel: { rounds1to4: 'Group 3 variants', round5Plus: 'Group 3' },
};

export const POKEMON = {
  Heracross: {
    id: 214, types: ['Bug', 'Fighting'], baseStats: { hp: 80, atk: 125, def: 75, spa: 40, spd: 95, spe: 85 },
    sets: [
      { id: 1, item: 'Focus Band', nature: 'Adamant', ability: 'Swarm / Guts', evs: { atk: 255, def: 255 }, moves: ['Megahorn', 'Brick Break', 'Rock Tomb', 'Counter'] },
      { id: 2, item: 'Lum Berry', nature: 'Jolly', ability: 'Swarm / Guts', evs: { hp: 255, spe: 255 }, moves: ['Megahorn', 'Earthquake', 'Attract', 'Bulk Up'] },
      { id: 3, item: 'BrightPowder', nature: 'Adamant', ability: 'Swarm / Guts', evs: { atk: 255, spe: 255 }, moves: ['Megahorn', 'Earthquake', 'Rock Slide', 'Brick Break'] },
      { id: 4, item: 'Salac Berry', nature: 'Adamant', ability: 'Swarm / Guts', evs: { atk: 255, spe: 255 }, moves: ['Megahorn', 'Earthquake', 'Reversal', 'Endure'] },
    ],
  },
  Regice: {
    id: 378, types: ['Ice'], baseStats: { hp: 80, atk: 50, def: 100, spa: 100, spd: 200, spe: 50 },
    sets: [
      { id: 1, item: 'Chesto Berry', nature: 'Modest', ability: 'Clear Body', evs: { hp: 255, spa: 255 }, moves: ['Ice Beam', 'Thunderbolt', 'Amnesia', 'Rest'] },
      { id: 2, item: 'BrightPowder', nature: 'Quiet', ability: 'Clear Body', evs: { hp: 255, spa: 255 }, moves: ['Thunder', 'Rain Dance', 'Blizzard', 'Brick Break'] },
      { id: 3, item: 'Lum Berry', nature: 'Quiet', ability: 'Clear Body', evs: { hp: 255, spa: 255 }, moves: ['Ice Beam', 'Thunderbolt', 'Thunder Wave', 'Explosion'] },
      { id: 4, item: 'Leftovers', nature: 'Bold', ability: 'Clear Body', evs: { hp: 255, def: 255 }, moves: ['Ice Beam', 'Hail', 'Double Team', 'Thunder Wave'] },
    ],
  },
  Gardevoir: {
    id: 282, types: ['Psychic'], baseStats: { hp: 68, atk: 65, def: 65, spa: 125, spd: 115, spe: 80 },
    sets: [
      { id: 1, item: 'Leftovers', nature: 'Timid', ability: 'Synchronize / Trace', evs: { hp: 170, def: 170, spe: 170 }, moves: ['Dream Eater', 'Hypnosis', 'Magical Leaf', 'Reflect'] },
      { id: 2, item: 'Chesto Berry', nature: 'Modest', ability: 'Synchronize / Trace', evs: { hp: 255, def: 255 }, moves: ['Psychic', 'Calm Mind', 'Double Team', 'Rest'] },
      { id: 3, item: 'Lum Berry', nature: 'Modest', ability: 'Synchronize / Trace', evs: { spa: 255, spe: 255 }, moves: ['Psychic', 'Ice Punch', 'Fire Punch', 'Magical Leaf'] },
      { id: 4, item: 'BrightPowder', nature: 'Modest', ability: 'Synchronize / Trace', evs: { spa: 255, spe: 255 }, moves: ['Psychic', 'Thunderbolt', 'Ice Punch', 'Fire Punch'] },
    ],
  },
  Moltres: {
    id: 146, types: ['Fire', 'Flying'], baseStats: { hp: 90, atk: 100, def: 90, spa: 125, spd: 85, spe: 90 },
    sets: [
      { id: 1, item: 'Lum Berry', nature: 'Docile', ability: 'Pressure', evs: { atk: 255, spa: 255 }, moves: ['Flamethrower', 'Aerial Ace', 'Mud-Slap', 'Roar'] },
      { id: 2, item: 'White Herb', nature: 'Hardy', ability: 'Pressure', evs: { atk: 255, spa: 255 }, moves: ['Overheat', 'Aerial Ace', 'Double Team', 'Protect'] },
      { id: 3, item: 'Chesto Berry', nature: 'Modest', ability: 'Pressure', evs: { spa: 255, spe: 255 }, moves: ['Fire Blast', 'Sunny Day', 'Double Team', 'Rest'] },
      { id: 4, item: 'White Herb', nature: 'Quiet', ability: 'Pressure', evs: { atk: 255, spa: 255 }, moves: ['Overheat', 'Double-Edge', 'Steel Wing', 'Safeguard'] },
    ],
  },
  Metagross: {
    id: 376, types: ['Psychic', 'Steel'], baseStats: { hp: 80, atk: 135, def: 130, spa: 95, spd: 90, spe: 70 },
    sets: [
      { id: 1, item: 'Leftovers', nature: 'Adamant', ability: 'Clear Body', evs: { def: 170, spd: 170, spe: 170 }, moves: ['Meteor Mash', 'Aerial Ace', 'Facade', 'Light Screen'] },
      { id: 2, item: 'Lum Berry', nature: 'Adamant', ability: 'Clear Body', evs: { hp: 170, spd: 170, spe: 170 }, moves: ['Earthquake', 'Meteor Mash', 'Psych Up', 'Swagger'] },
      { id: 3, item: 'Chesto Berry', nature: 'Adamant', ability: 'Clear Body', evs: { hp: 170, atk: 170, spe: 170 }, moves: ['Earthquake', 'Meteor Mash', 'Double Team', 'Rest'] },
      { id: 4, item: 'Quick Claw', nature: 'Hardy', ability: 'Clear Body', evs: { atk: 255, spa: 255 }, moves: ['Meteor Mash', 'Psychic', 'Earthquake', 'Shadow Ball'] },
    ],
  },
  Swampert: {
    id: 260, types: ['Ground', 'Water'], baseStats: { hp: 100, atk: 110, def: 90, spa: 85, spd: 90, spe: 60 },
    sets: [
      { id: 1, item: 'Lum Berry', nature: 'Adamant', ability: 'Torrent', evs: { hp: 170, def: 170, spd: 170 }, moves: ['Earthquake', 'Counter', 'Rest', 'Curse'] },
      { id: 2, item: 'Quick Claw', nature: 'Docile', ability: 'Torrent', evs: { hp: 170, def: 170, spd: 170 }, moves: ['Surf', 'Earthquake', 'Counter', 'Mirror Coat'] },
      { id: 3, item: 'Shell Bell', nature: 'Brave', ability: 'Torrent', evs: { atk: 255, spa: 255 }, moves: ['Surf', 'Earthquake', 'Ice Beam', 'Counter'] },
      { id: 4, item: 'Shell Bell', nature: 'Quiet', ability: 'Torrent', evs: { atk: 255, spa: 255 }, moves: ['Surf', 'Earthquake', 'Ice Beam', 'Mirror Coat'] },
    ],
  },
};

export function normalizePokemonName(value) {
  const cleaned = String(value || '').trim().toLowerCase();
  return Object.keys(POKEMON).find((name) => name.toLowerCase() === cleaned) || null;
}

export function getPokemon(value) {
  const name = normalizePokemonName(value);
  return name ? { name, ...POKEMON[name] } : null;
}

export function getSets(value) { return getPokemon(value)?.sets || []; }
