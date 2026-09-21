import {getStats,getEffectiveSpeed,applyStatStages,calculateDamage} from './damageCalc'; const norm=v=>String(v||'').trim().toLowerCase();
const movesOf=s=>(s?.moves||[]).map(m=>typeof m==='string'?m:m?.name).filter(Boolean);
export function inferSetEvidence({pokemon,sets=[],observation={}}={}){return sets.map(set=>{const reasons=[];let compatible=true;if(observation.item&&norm(set.item)!==norm(observation.item)){compatible=false;reasons.push('held item mismatch');}const moves=movesOf(set).map(norm);for(const move of observation.moves||[])if(!moves.includes(norm(move))){compatible=false;reasons.push('move mismatch: '+move);}if(observation.ability&&!String(set.ability||'').toLowerCase().split('/').map(norm).includes(norm(observation.ability))){compatible=false;reasons.push('ability mismatch');}return {set,compatible,reasons};});}
export function inferSpeedCandidates({pokemon,sets=[],level=50,round=1,observedSpeed,observedRelation,status='healthy',stages={}}={}){if(observedSpeed==null&&!observedRelation)return {possible:sets,eliminated:[]};const possible=[],eliminated=[];for(const set of sets){const base=getStats(pokemon,set,level,round);const effective=getEffectiveSpeed(applyStatStages(base,stages),status);let ok=true;if(observedRelation==='equal')ok=effective===Number(observedSpeed);if(observedRelation==='at least')ok=effective>=Number(observedSpeed);if(observedRelation==='at most')ok=effective<=Number(observedSpeed);(ok?possible:eliminated).push({set,speed:effective});}return {possible,eliminated};}
export function inferDamageCandidates({attacker,defender,attackerSets=[],defenderSets=[],moveName,observedDamage,level=50,round=1,weather='none'}={}){if(observedDamage==null)return {possible:defenderSets,eliminated:[]};const possible=[],eliminated=[];for(const ds of defenderSets){let ok=false;for(const as of attackerSets){const d=calculateDamage({attacker,attackerSet:as,defender,defenderSet:ds,level,round,moveName,weather});if(Number(observedDamage)>=Number(d.min)&&Number(observedDamage)<=Number(d.max))ok=true;}(ok?possible:eliminated).push(ds);}return {possible,eliminated};}

export function inferObservationBranches({ observations = [], sets = [], level = 50, round = 1, currentTeam = [] } = {}) {
  const surviving = sets.filter(Boolean);
  const results = [];
  for (const set of surviving) {
    const pokemon = set?.species ? { name: set.species } : null;
    const evidence = inferSetEvidence({ pokemon, sets: [set], observation: observations.find((o) => norm(o?.species) === norm(set?.species)) || {} })[0];
    if (!evidence?.compatible) continue;
    results.push({ set, evidence });
  }
  return {
    surviving: results,
    eliminated: surviving.filter((set) => !results.some((row) => row.set === set)),
    count: results.length,
    note: 'Observation branches are evidence filters, not probabilities. Each new clue can remove incompatible set branches.',
  };
}

export function summarizeObservationEvidence(observations = []) {
  return observations.filter(Boolean).map((observation) => ({
    species: observation.species || '',
    clues: [
      observation.item ? 'item' : null,
      observation.ability ? 'ability' : null,
      ...(observation.moves || []).map(() => 'move'),
      observation.observedDamagePercent != null ? 'damage percent' : null,
      observation.observedSpeed != null ? 'speed' : null,
    ].filter(Boolean),
  }));
}
