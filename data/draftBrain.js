import {buildDraftSetSpread} from './draftSetAnalysis'; import {rankResponses, rankResponsesAcrossOpponentSets} from './responseAnalysis'; import {getFactorySets} from './setIdentity';
export function analyzeDraftBrain({draft=[],currentTeam=[],opponents=[],levelMode='Open Level',battle=1,swaps=0,scientist={},blockedSpecies=[]}={}){const spread=buildDraftSetSpread({draft,levelMode,battle,swaps,blockedSpecies});const threats=(opponents||[]).map(opponent=>{
  const level=levelMode==='Open Level'?100:50;
  const round=Math.max(1,Math.ceil(Number(battle)/7));
  const opponentSets=getFactorySets(opponent?.species||opponent?.name)||opponent?.sets||[];
  const uncertainty=rankResponsesAcrossOpponentSets(opponent,currentTeam,opponentSets,level,round,{});
  const checks=(currentTeam||[]).flatMap(ally=>rankResponses(opponent,[ally],level,round)||[]);
  return {species:opponent?.name||opponent?.species,checks,best:checks[0]||null,uncertainty};
});const draftRows=(spread.rows||[]).map(row=>({species:row.draftEntry?.species||row.draftEntry?.name,setCount:row.setCount,pressureScore:row.pressureScore,pressureTargets:(row.pressureTargets||[]).map(x=>({species:x.target?.name||x.target?.species,twoHit:x.twoHit,total:x.total,faster:x.faster}))})).sort((a,b)=>b.pressureScore-a.pressureScore);return {supported:spread.supported,spread,threats,draftRows,blockedSpecies,scientist,note:'Evidence-based draft analysis; candidate frequency is not an exact probability.'};}
export const summarizeDraftBrain=result=>{if(!result?.supported)return result?.spread?.reason||'Draft analysis unavailable.';const top=result.draftRows?.[0];return top?top.species+': '+top.setCount+' possible sets screened; pressure score '+top.pressureScore+'.':'No recognized draft Pokémon yet.'};