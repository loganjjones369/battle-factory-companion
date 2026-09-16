// Parser for the canonical BattleFactoryBuddy allpkmn.csv format.
// Keeping this parser separate lets the app import the full Emerald Factory
// dataset without changing the UI or calculation code.

const STAT_ORDER = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

function numberOrZero(value) {
  const n = Number(String(value || '').trim());
  return Number.isFinite(n) ? n : 0;
}

export function parseEVs(value = '') {
  const parts = String(value).split('/').map((part) => numberOrZero(part));
  return STAT_ORDER.reduce((out, stat, index) => {
    out[stat] = parts[index] || 0;
    return out;
  }, {});
}

export function parseFactoryCSVRow(row = '') {
  const fields = String(row).split(',').map((field) => field.trim());
  if (fields.length < 15) return null;

  const [typeText, movesText, species, setNumber, nature, item, m1, m2, m3, m4, roundMarker, ability, evText, baseSpeed, id] = fields;
  if (!species || !setNumber || !id) return null;

  const types = typeText.split(/\s+/).filter(Boolean);
  const style = movesText.split(/\s+/).filter(Boolean).slice(0, 4);

  return {
    id: `${species}-${setNumber}`,
    species,
    name: species,
    set: numberOrZero(setNumber),
    nature,
    item,
    moves: [m1, m2, m3, m4].filter(Boolean),
    style,
    round: numberOrZero(roundMarker),
    ability,
    evs: parseEVs(evText),
    baseSpeed: numberOrZero(baseSpeed),
    sourceId: numberOrZero(id),
    types,
  };
}

export function parseFactoryCSV(csv = '') {
  const sets = String(csv)
    .split(/\r?\n/)
    .flatMap((line) => {
      const trimmed = line.trim();
      if (!trimmed) return [];
      const parsed = parseFactoryCSVRow(trimmed);
      return parsed ? [parsed] : [];
    });

  return sets;
}

export function groupFactorySets(sets = []) {
  const bySpecies = {};
  sets.forEach((set) => {
    const key = String(set.species || set.name || '').trim().toLowerCase();
    if (!key) return;
    if (!bySpecies[key]) bySpecies[key] = { name: set.species || set.name, sets: [] };
    bySpecies[key].sets.push(set);
  });
  return Object.values(bySpecies);
}

export function validateFactorySets(sets = []) {
  const errors = [];
  sets.forEach((set, index) => {
    if (!set.species) errors.push(`Row ${index + 1}: missing species`);
    if (!set.moves || set.moves.length !== 4) errors.push(`${set.species || 'Unknown'} set ${set.set || '?'}: expected 4 moves`);
    if (!set.evs || STAT_ORDER.some((stat) => typeof set.evs[stat] !== 'number')) {
      errors.push(`${set.species || 'Unknown'} set ${set.set || '?'}: invalid EV data`);
    }
  });
  return { valid: errors.length === 0, errors, count: sets.length };
}

export function buildFactoryIndex(sets = []) {
  const species = {};
  const items = {};
  const moves = {};

  sets.forEach((set) => {
    const speciesKey = String(set.species || '').trim().toLowerCase();
    if (speciesKey) (species[speciesKey] ||= []).push(set);
    if (set.item) (items[set.item] ||= []).push(set);
    (set.moves || []).forEach((move) => {
      if (move) (moves[move] ||= []).push(set);
    });
  });

  return { species, items, moves };
}
