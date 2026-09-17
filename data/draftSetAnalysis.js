import { getDraftSetPools } from './factoryPools';
import { calculateDamage, getStats, getEffectiveSpeed, bestDamagingMoves, applyStatStages } from './damageCalc';
import { optionsFor } from '../components/AbilitySelector';

const norm = (v) => String(v || '').trim().toLowerCase();
const setKey = (set) => `${norm(set?.species)}#${set?.id ?? set?.setId ?? ''}`;
const swapCountForElevation = (elevation) => [0, 15, 22, 29, 36, 43][Math.max(0, Math.min(5, Number(elevation) || 0))];
const emptyStages = () => ({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });

function setWithDraftStats(set, draftEntry, levelNumber, round) {
  return { ...set, species: set.species || draftEntry?.species, setId: set.id ?? set.setId, factoryIV: draftEntry?.factoryIV, isElevated: draftEntry?.isElevated, level: levelNumber, round };
}

function bestAgainst(attacker, defender, levelNumber, round, scenario = {}) {
  const attackerStatus = scenario.statuses?.[setKey(attacker)] || scenario.statuses?.[norm(attacker.species)] || 'healthy';
  const defenderStatus = scenario.statuses?.[setKey(defender)] || scenario.statuses?.[norm(defender.species)] || 'healthy';
  const attackerStages = scenario.stages?.[setKey(attacker)] || scenario.stages?.[norm(attacker.species)] || emptyStages();
  const defenderStages = scenario.stages?.[setKey(defender)] || scenario.stages?.[norm(defender.species)] || emptyStages();
  const attackerAbility = scenario.abilities?.[setKey(attacker)] || scenario.abilities?.[norm(attacker.species)] || optionsFor(attacker)[0] || '';
  const defenderAbility = scenario.abilities?.[setKey(defender)] || scenario.abilities?.[norm(defender.species)] || optionsFor(defender)[0] || '';
  let best = null;
  for (const moveName of bestDamagingMoves(attacker)) {
    const result = calculateDamage({ attacker, attackerSet: attacker, defender, defenderSet: defender, level: levelNumber, round, moveName, weather: scenario.weather || 'none', attackerStatus, defenderStatus, attackerStages, defenderStages, attackerAbility, defenderAbility });
    if (!result.unsupported && (!best || result.percentMax > best.percentMax)) best = { ...result, moveName };
  }
  return best;
}

function speedOf(pokemon, levelNumber, round, scenario = {}) {
  const status = scenario.statuses?.[setKey(pokemon)] || scenario.statuses?.[norm(pokemon.species)] || 'healthy';
  const stages = scenario.stages?.[setKey(pokemon)] || scenario.stages?.[norm(pokemon.species)] || emptyStages();
  const ability = scenario.abilities?.[setKey(pokemon)] || scenario.abilities?.[norm(pokemon.species)] || optionsFor(pokemon)[0] || '';
  const stats = applyStatStages(getStats(pokemon, pokemon, levelNumber, round), stages);
  return Math.floor(getEffectiveSpeed(stats, status));
}

export function buildDraftSetSpread({ draft = [], levelMode = 'Open Level', battle = 1, swaps = null, weather = 'none', statuses = {}, stages = {}, abilities = {} } = {}) {
  const levelNumber = levelMode === 'Open Level' ? 100 : 50;
  const round = Math.max(1, Math.ceil((Number(battle) || 1) / 7));
  const inferredElevation = draft.filter((p) => p?.isElevated).length;
  const effectiveSwaps = swaps == null ? swapCountForElevation(inferredElevation) : Math.max(0, Number(swaps) || 0);
  const pool = getDraftSetPools({ levelMode, battle, swaps: effectiveSwaps });
  if (!pool.supported) return { supported: false, reason: pool.reason, rows: [] };

  const scenario = { weather, statuses, stages, abilities };
  const rows = draft.filter(Boolean).map((draftEntry, index) => {
    const bucket = index < pool.elevation ? pool.upgradeBucket : pool.baseBucket;
    const possibleSets = [...(index < pool.elevation ? pool.upgradedPool : pool.regularPool)].filter((set) => norm(set.species) === norm(draftEntry.species));
    const targets = draft.filter((target, targetIndex) => target && targetIndex !== index).map((target) => {
      const targetSet = setWithDraftStats(target, target, levelNumber, round);
      const setResults = possibleSets.map((candidate) => {
        const attacker = setWithDraftStats(candidate, draftEntry, levelNumber, round);
        const best = bestAgainst(attacker, targetSet, levelNumber, round, scenario);
        const attackerSpeed = speedOf(attacker, levelNumber, round, scenario); const defenderSpeed = speedOf(targetSet, levelNumber, round, scenario);
        return { set: attacker, best, faster: attackerSpeed > defenderSpeed, speed: attackerSpeed, targetSpeed: defenderSpeed };
      });
      const meaningful = setResults.filter((x) => x.best || x.faster);
      const twoHit = setResults.filter((x) => x.best?.guaranteedTwoHKO || (x.best?.ko && x.best.ko <= 2));
      const fiftyPlus = setResults.filter((x) => x.best?.percentMax >= 50);
      const faster = setResults.filter((x) => x.faster);
      return { target, total: setResults.length, meaningful: meaningful.length, twoHit: twoHit.length, fiftyPlus: fiftyPlus.length, faster: faster.length, sets: setResults };
    });
    const pressureTargets = targets.filter((target) => target.twoHit || target.fiftyPlus || target.faster);
    const pressureScore = targets.reduce((sum, target) => sum + target.twoHit * 3 + target.fiftyPlus + target.faster, 0);
    return { draftEntry, slotIndex: index, bucket, elevated: index < pool.elevation, possibleSets, setCount: possibleSets.length, targets, pressureTargets, pressureScore };
  });
  return { supported: true, levelMode, battle: Number(battle) || 1, swaps: effectiveSwaps, elevation: pool.elevation, baseBucket: pool.baseBucket, upgradeBucket: pool.upgradeBucket, rows };
}

export function summarizeDraftSetRow(row) {
  if (!row) return '';
  const target = row.targets.find((x) => x.twoHit || x.fiftyPlus || x.faster);
  if (!target) return `${row.setCount} possible ${row.draftEntry.species} sets screened; no mapped pressure found against the other draft Pokémon.`;
  return `${row.setCount} possible ${row.draftEntry.species} sets; ${target.twoHit}/${target.total} can reach a 2HKO against ${target.target.species}, ${target.fiftyPlus}/${target.total} reach 50%+ damage, and ${target.faster}/${target.total} are faster.`;
}

export { setKey };
