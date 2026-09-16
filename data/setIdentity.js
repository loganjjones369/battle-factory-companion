import { POKEMON } from './factoryData';

const norm = (value) => String(value || '').trim().toLowerCase();

/**
 * Battle Factory sets are identities, not just species names.
 * Swampert 2 and Swampert 3 are different set identities even though Species
 * Clause means only one Swampert may occupy the player's three team slots.
 */
export function getFactorySets(species = '') {
  const key = norm(species);
  const entry = Object.values(POKEMON).find((pokemon) => norm(pokemon?.species || pokemon?.name) === key);
  return entry?.sets || [];
}

export function getFactorySet(species = '', setId = null) {
  const sets = getFactorySets(species);
  if (!sets.length) return null;
  if (setId === null || setId === undefined || setId === '') return sets[0] || null;
  return sets.find((set) => Number(set.id) === Number(setId)) || null;
}

export function getSetIdentity(pokemon = {}, fallbackSetId = null) {
  const species = pokemon?.species || pokemon?.name || '';
  const setId = pokemon?.setId ?? pokemon?.factorySetId ?? pokemon?.id ?? fallbackSetId;
  const set = pokemon?.moves && pokemon?.item
    ? pokemon
    : getFactorySet(species, setId);
  return {
    species,
    setId: set?.id ?? (setId === null || setId === undefined || setId === '' ? null : Number(setId)),
    setKey: species && set?.id ? `${species} ${set.id}` : species,
    item: set?.item || pokemon?.item || '',
    nature: set?.nature || pokemon?.nature || '',
    ability: set?.ability || pokemon?.ability || '',
    moves: set?.moves || pokemon?.moves || [],
    evs: set?.evs || pokemon?.evs || {},
    round: set?.round ?? pokemon?.round ?? null,
    sourceId: set?.sourceId ?? pokemon?.sourceId ?? null,
  };
}

/** Attach immutable set identity plus explicit draft-slot state. */
export function makeTeamPokemon(pokemon, options = {}) {
  if (!pokemon) return pokemon;
  const identity = getSetIdentity(pokemon, options.setId);
  return {
    ...pokemon,
    ...identity,
    draftSlot: options.draftSlot ?? pokemon.draftSlot ?? null,
    teamSlot: options.teamSlot ?? pokemon.teamSlot ?? null,
    isElevated: Boolean(options.isElevated ?? pokemon.isElevated),
    elevationSource: options.isElevated ?? pokemon.isElevated ? (options.draftSlot ?? pokemon.draftSlot ?? null) : null,
    factoryIV: options.factoryIV ?? pokemon.factoryIV ?? null,
  };
}

/**
 * A swap replacement is a newly acquired team member. It must never inherit
 * elevation or the outgoing Pokémon's draft-slot identity.
 */
export function makeSwapReplacement(pokemon, teamSlot = null) {
  if (!pokemon) return pokemon;
  const identity = getSetIdentity(pokemon);
  return {
    ...pokemon,
    ...identity,
    teamSlot,
    draftSlot: null,
    isElevated: false,
    elevationSource: null,
    factoryIV: pokemon.factoryIV ?? null,
  };
}

export function sameSet(a, b) {
  const ai = getSetIdentity(a);
  const bi = getSetIdentity(b);
  return norm(ai.species) === norm(bi.species) && Number(ai.setId) === Number(bi.setId);
}
