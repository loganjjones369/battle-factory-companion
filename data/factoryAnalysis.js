import { getPokemon } from './factoryData';
import { bestDamagingMoves, calculateDamage, getStats } from './damageCalc';
import { getPossibleSetsForSpecies } from './candidateFilter';
import { getBlockedSpecies } from './factoryRules';

const norm = (v) => String(v || '').trim().toLowerCase();

/**
 * Build the set-level view the UI needs after an opponent is observed.
 * This deliberately returns the actual remaining sets rather than only a
 * species-level yes/no answer, so the user can inspect Set 2/3/4 individually.
 */
export function getPossibleSpeciesSets({ species, allSets = [], revealed = {}, battleState = {} } = {}) {
  const blockedSpecies = battleState.blockedSpecies || getBlockedSpecies(battleState);
  if (blockedSpecies.some((name) => norm(name) === norm(species))) return [];

  return getPossibleSetsForSpecies(allSets, species, {
    revealedMoves: revealed.moves,
    revealedItems: revealed.items,
    forbiddenItems: revealed.items,
    setFacts: revealed.setFacts,
  });
}

export function getPossibleSetReport({ pokemonName, allSets = [], revealed = {}, battleState = {} } = {}) {
  const pokemon = getPokemon(pokemonName);
  if (!pokemon) return null;
  const sets = getPossibleSpeciesSets({ species: pokemon.name, allSets, revealed, battleState });
  return {
    pokemon,
    sets,
    possibleSetIds: sets.map((set) => set.id),
    eliminatedSetIds: pokemon.sets.filter((set) => !sets.some((candidate) => candidate.id === set.id)).map((set) => set.id),
  };
}

/**
 * Compare every remaining set of a candidate Pokémon against the user's
 * current team. The caller can use this to highlight threats without hiding
 * the underlying damage rolls.
 */
export function getCandidateThreatReport({ candidate, playerPokemon = [], level = 50, round = 1, weather = 'none' } = {}) {
  if (!candidate || !playerPokemon.length) return null;
  const rows = candidate.sets.map((candidateSet) => {
    const targets = playerPokemon.map((target) => {
      const defender = getPokemon(target?.name || target);
      if (!defender) return null;
      const defenderSet = defender.sets[0];
      const moves = bestDamagingMoves(candidateSet);
      const results = moves.map((moveName) => calculateDamage({
        attacker: candidate,
        attackerSet: candidateSet,
        defender,
        defenderSet,
        level,
        round,
        moveName,
        weather,
      })).filter((result) => !result.unsupported && result.effectiveness !== 0);
      if (!results.length) return { target: defender.name, results: [] };
      return {
        target: defender.name,
        results: results.sort((a, b) => b.percentMax - a.percentMax).slice(0, 3),
        speed: getStats(candidate, candidateSet, level, round).spe - getStats(defender, defenderSet, level, round).spe,
      };
    }).filter(Boolean);
    return { set: candidateSet, targets };
  });
  return { pokemon: candidate.name, rows };
}
