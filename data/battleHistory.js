const norm = (v) => String(v || '').trim().toLowerCase();

function moveNames(pokemon = {}) {
  return (pokemon.moves || [])
    .map((move) => (typeof move === 'string' ? move : move?.name))
    .filter(Boolean);
}

export function makeObservation(pokemon = {}) {
  if (!pokemon?.species && !pokemon?.name) return null;
  return {
    species: pokemon.species || pokemon.name,
    setId: pokemon.setId ?? pokemon.factorySetId ?? null,
    item: pokemon.item || '',
    moves: moveNames(pokemon),
    ability: pokemon.ability || '',
    observedSpeed: pokemon.observedSpeed ?? null,
    observedSpeedRelation: pokemon.observedSpeedRelation || '',
    observedDamagePercent: pokemon.observedDamagePercent ?? pokemon.observedDamage ?? null,
    observedDamageMove: pokemon.observedDamageMove || '',
  };
}

export function mergeObservationHistory(history = [], observations = []) {
  const next = [...history];
  observations.filter(Boolean).forEach((observation) => {
    const key = `${norm(observation.species)}#${observation.setId ?? ''}`;
    const existing = next.findIndex((item) => `${norm(item.species)}#${item.setId ?? ''}` === key);
    if (existing >= 0) {
      next[existing] = {
        ...next[existing],
        item: observation.item || next[existing].item || '',
        moves: [...new Set([...(next[existing].moves || []), ...(observation.moves || [])])],
        ability: observation.ability || next[existing].ability || '',
        observedSpeed: observation.observedSpeed ?? next[existing].observedSpeed ?? null,
        observedSpeedRelation: observation.observedSpeedRelation || next[existing].observedSpeedRelation || '',
        observedDamagePercent: observation.observedDamagePercent ?? observation.observedDamage ?? next[existing].observedDamagePercent ?? next[existing].observedDamage ?? null,
        observedDamageMove: observation.observedDamageMove || next[existing].observedDamageMove || '',
      };
    } else {
      next.push({ ...observation, moves: [...new Set(observation.moves || [])] });
    }
  });
  return next;
}

export function recordBattleHistory(history = [], battle, opponent = [], observations = []) {
  const exact = opponent.map(makeObservation).filter(Boolean);
  const observed = observations.filter(Boolean);
  const merged = mergeObservationHistory(history.flatMap((entry) => entry.observations || []), [...exact, ...observed]);
  return [
    ...history,
    {
      battle: Number(battle) || 1,
      opponent: opponent.map((pokemon) => ({
        species: pokemon?.species || pokemon?.name || '',
        setId: pokemon?.setId ?? pokemon?.factorySetId ?? null,
      })).filter((pokemon) => pokemon.species),
      observations: merged,
    },
  ];
}

export function getHistoricalObservations(history = []) {
  return mergeObservationHistory([], history.flatMap((entry) => entry.observations || []));
}

export function getHistoricalSpecies(history = []) {
  return [...new Set(getHistoricalObservations(history).map((item) => item.species).filter(Boolean))];
}
