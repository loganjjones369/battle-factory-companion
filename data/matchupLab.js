import {calculateDamage,getStats,getEffectiveSpeed} from './damageCalc';
import {getFactorySets} from './setIdentity';

const setsFor=p=>p?.sets||getFactorySets(p?.species||p?.name)||[];

export function analyzeSetPair({attacker,defender,attackerSet,defenderSet,level=50,round=1,weather='none',attackerStatus='healthy',defenderStatus='healthy',attackerStages={},defenderStages={}}={}){
  if(!attacker||!defender||!attackerSet||!defenderSet)return null;
  const moves=(attackerSet.moves||[]).map(m=>typeof m==='string'?m:m?.name).filter(Boolean);
  const moveResults=moves.map(moveName=>({moveName,damage:calculateDamage({attacker,defender,attackerSet,defenderSet,level,round,moveName,weather,attackerStatus,defenderStatus,attackerStages,defenderStages})}));
  const a=getEffectiveSpeed(getStats(attacker,attackerSet,level,round),attackerStatus);
  const d=getEffectiveSpeed(getStats(defender,defenderSet,level,round),defenderStatus);
  return {attacker,defender,attackerSet,defenderSet,attackerSpeed:a,defenderSpeed:d,speedRelation:a>d?'outspeeds':a<d?'is slower':'speed ties',moveResults};
}

export function analyzeAllSets({attacker,defender,level=50,round=1,weather='none'}={}){
  const rows=[];for(const a of setsFor(attacker))for(const d of setsFor(defender))rows.push(analyzeSetPair({attacker,defender,attackerSet:a,defenderSet:d,level,round,weather}));return rows.filter(Boolean);
}

export function summarizeMatchup(rows=[]){
  const valid=rows.filter(Boolean);
  const attackerSets=[...new Map(valid.map(r=>[String(r.attackerSet?.id),r.attackerSet])).values()];
  const defenderSets=[...new Map(valid.map(r=>[String(r.defenderSet?.id),r.defenderSet])).values()];
  const fasterAttackers=attackerSets.filter(a=>valid.some(r=>String(r.attackerSet?.id)===String(a.id)&&r.speedRelation==='outspeeds'));
  const coveredDefenders=defenderSets.filter(d=>valid.some(r=>String(r.defenderSet?.id)===String(d.id)&&r.speedRelation==='outspeeds'));
  const moves=valid.flatMap(r=>r.moveResults).map(x=>x.damage).filter(Boolean);
  return {pairs:valid.length,attackerSetCount:attackerSets.length,defenderSetCount:defenderSets.length,fasterAttackerSetCount:fasterAttackers.length,defenderSetCountBeaten:coveredDefenders.length,fasterPairs:valid.filter(r=>r.speedRelation==='outspeeds').length,slowerPairs:valid.filter(r=>r.speedRelation==='is slower').length,ties:valid.filter(r=>r.speedRelation==='speed ties').length,bestPercentMax:moves.reduce((a,b)=>Math.max(a,b.percentMax||0),0),bestPercentMin:moves.reduce((a,b)=>Math.max(a,b.percentMin||0),0)};
}

export function buildSpeedStatement(attacker,defender,rows=[]){
  const summary=summarizeMatchup(rows);
  const a=attacker?.name||attacker?.species||'attacker';
  const d=defender?.name||defender?.species||'defender';
  if(!summary.attackerSetCount||!summary.defenderSetCount)return 'Speed data unavailable for this matchup.';
  return `${summary.fasterAttackerSetCount}/${summary.attackerSetCount} ${a} sets can move first against ${summary.defenderSetCountBeaten}/${summary.defenderSetCount} ${d} sets (${summary.fasterPairs}/${summary.pairs} set-vs-set comparisons).`;
}
