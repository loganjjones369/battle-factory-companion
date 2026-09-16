import { POKEMON, getPokemon } from './factoryData';

const norm = (value) => String(value || '').trim().toLowerCase();

function itemKey(value) {
  return norm(value).replace(/[^a-z0-9]/g, '');
}

/**
 * Set-level candidate engine for the Factory workspace.
 *
 * This intentionally separates hard mechanical exclusions from the future
 * team-index layer. A set is removed here only when we have a concrete reason:
 * species blocked by Factory rules, or a held item that is already known to be
 * occupied by another opposing Pokemon (Item Clause).
 */
export function getPossibleSets({ species, blockedSpecies = [], occupiedItems = [], revealed = {} } = {}) {
  const pokemon = getPokemon(species);
  if (!pokemon) return { pokemon: null, possible: [], eliminated: [] };

  const blocked = new Set(blockedSpecies.map(norm));
  const occupied = new Set(occupiedItems.map(itemKey));
  const observedMoves = (revealed.moves || []).map(norm);
  const observedSpecies = norm(revealed.species);

  if (blocked.has(norm(pokemon.name))) {
    return {
      pokemon,
      possible: [],
      eliminated: pokemon.sets.map((set) => ({ set, reason: 'Species Clause / blocked opponent slot' })),
    };
  }

  const possible = [];
  const eliminated = [];
  pokemon.sets.forEach((set) => {
    const setItem = itemKey(set.item);
    if (occupied.has(setItem)) {
      eliminated.push({ set, reason: `Item Clause — ${set.item} is already occupied` });
      return;
    }

    // If this is the specifically observed species, every move we have seen
    // must exist on the set. This is deliberately species-specific: seeing a
    // move on Suicune must not eliminate an unrelated Swampert set.
    if (observedSpecies === norm(pokemon.name) && observedMoves.length) {
      const moves = new Set((set.moves || []).map(norm));
      const missing = observedMoves.find((move) => !moves.has(move));
      if (missing) {
        eliminated.push({ set, reason: `Observed move mismatch — ${revealed.moves.find((m) => norm(m) === missing) || missing}` });
        return;
      }
    }

    possible.push(set);
  });

  return { pokemon, possible, eliminated };
}

export function getDraftBlockedSpecies(draft = []) {
  return draft.map((entry) => typeof entry === 'string' ? entry : entry?.name).filter(Boolean);
}

export function getVisibleCandidateSpecies({ blockedSpecies = [], occupiedItems = [] } = {}) {
  const blocked = new Set(blockedSpecies.map(norm));
  const occupied = new Set(occupiedItems.map(itemKey));
  return Object.values(POKEMON)
    .filter((pokemon) => !blocked.has(norm(pokemon.name)))
    .map((pokemon) => ({
      pokemon,
      possibleSetCount: pokemon.sets.filter((set) => !occupied.has(itemKey(set.item))).length,
    }))
    .filter((entry) => entry.possibleSetCount > 0)
    .sort((a, b) => b.possibleSetCount - a.possibleSetCount || a.pokemon.name.localeCompare(b.pokemon.name));
}

export function buildCandidateSummary({ draft = [], observed = null } = {}) {
  const blockedSpecies = getDraftBlockedSpecies(draft);
  const occupiedItems = observed?.item ? [observed.item] : [];
  const visible = getVisibleCandidateSpecies({ blockedSpecies, occupiedItems });
  return {
    blockedSpecies,
    occupiedItems,
    possibleSpeciesCount: visible.length,
    visible,
  };
}
