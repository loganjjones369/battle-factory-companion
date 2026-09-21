const norm = (v) => String(v || '').trim().toLowerCase();

function mergeEvidenceHistory(existing = [], incoming = []) {
  const seen = new Set();
  return [...existing, ...incoming]
    .filter(Boolean)
    .filter((event) => {
      const key = [
        event.type || '',
        event.round || '',
        event.value ?? '',
        event.move || '',
        event.percent ?? '',
        event.targetSpecies || '',
        event.targetSetId ?? '',
      ].join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
}

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
    evidenceHistory: Array.isArray(pokemon.evidenceHistory) ? pokemon.evidenceHistory.filter(Boolean) : [],
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
        evidenceHistory: mergeEvidenceHistory(next[existing].evidenceHistory || [], observation.evidenceHistory || []),
      };
    } else {
      next.push({ ...observation, moves: [...new Set(observation.moves || [])], evidenceHistory: [...(observation.evidenceHistory || [])] });
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
