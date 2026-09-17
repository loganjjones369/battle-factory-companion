import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { analyzeFactoryCandidates } from '../data/candidateEngine';
import { bestDamagingMoves, calculateDamage, getEffectiveSpeed, getStats } from '../data/damageCalc';

const norm = (v) => String(v || '').trim().toLowerCase();
const setKey = (set) => `${norm(set?.species)}#${set?.id ?? set?.setId ?? set?.sourceId ?? ''}`;
const setLabel = (set) => `${set?.species || 'Unknown'} ${set?.id ?? set?.setId ?? set?.sourceId ?? ''}`.trim();

function bestHit(attacker, defender, level, round) {
  let best = null;
  for (const moveName of bestDamagingMoves(attacker)) {
    const result = calculateDamage({ attacker, attackerSet: attacker, defender, defenderSet: defender, level, round, moveName });
    if (!result.unsupported && (!best || result.percentMax > best.percentMax)) best = { ...result, moveName };
  }
  return best;
}

function threatLine(set, team, level, round) {
  if (!set || !team?.length) return null;
  const speed = getEffectiveSpeed(getStats(set, set, level, round), 'healthy');
  const hits = team.map((ally) => {
    const allySpeed = getEffectiveSpeed(getStats(ally, ally, level, round), 'healthy');
    const hit = bestHit(set, ally, level, round);
    return { ally, hit, faster: speed > allySpeed };
  });
  const dangerous = hits.filter((x) => x.faster || x.hit?.percentMax >= 50 || x.hit?.percentMin >= 50);
  if (!dangerous.length) return 'No mapped high-priority pressure against your current team.';
  const x = dangerous[0];
  const damage = x.hit ? `${x.hit.moveName} ${x.hit.percentMin.toFixed(1)}–${x.hit.percentMax.toFixed(1)}%` : 'No mapped damage';
  return `${setLabel(set)} → ${x.ally.species}: ${damage}${x.faster ? ' • faster' : ''}`;
}

export default function LiveOpponentAnalysis({ draft = [], scientist = {}, levelMode = 'Open Level', battle = 1, blockedSpecies = [], observations = [], currentTeam = [], previousOpponent = [], noland = false }) {
  const result = useMemo(() => analyzeFactoryCandidates({ draft, blockedSpecies, scientist, levelMode, battle, revealed: { observations }, currentTeam, previousOpponent, noland }), [draft, blockedSpecies, scientist, levelMode, battle, observations, currentTeam, previousOpponent, noland]);
  const observedSpecies = [...new Set(observations.map((o) => norm(o.species)).filter(Boolean))];
  const observedSets = observedSpecies.map((species) => {
    const unique = new Map();
    (result.rankedSets || []).filter((entry) => norm(entry.set?.species) === species).forEach((entry) => unique.set(setKey(entry.set), entry.set));
    return { species, sets: [...unique.values()] };
  });
  const exact = observedSets.filter((x) => x.sets.length === 1);
  const unresolved = observedSets.filter((x) => x.sets.length > 1);
  const candidateCount = result.rankedSets?.length || 0;

  if (!observations.length) return null;
  return <View style={styles.card}>
    <View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.kicker}>LIVE RESEARCH</Text><Text style={styles.title}>Opponent possibilities updated</Text></View><Text style={styles.badge}>{result.supported ? candidateCount : '—'}</Text></View>
    {!result.supported ? <Text style={styles.warning}>{result.reason}</Text> : <>
      {!!exact.length && <View style={styles.exactBox}><Text style={styles.exactTitle}>SET IDENTIFIED FROM CURRENT CLUES</Text>{exact.map((x) => <Text key={x.species} style={styles.exactText}>✓ {setLabel(x.sets[0])} — the current recorded clues leave one compatible set.</Text>)}</View>}
      {!!unresolved.length && <View style={styles.section}><Text style={styles.sectionTitle}>STILL ALIVE</Text>{unresolved.map((x) => <View key={x.species} style={styles.speciesRow}><Text style={styles.speciesName}>{x.species}</Text><Text style={styles.speciesText}>{x.sets.length} compatible sets remain: {x.sets.slice(0, 6).map(setLabel).join(' • ')}{x.sets.length > 6 ? ' • …' : ''}</Text></View>)}</View>}
      {currentTeam.length > 0 && <View style={styles.section}><Text style={styles.sectionTitle}>IMMEDIATE THREATS</Text>{observedSets.flatMap((x) => x.sets.slice(0, 4)).map((set, i) => <Text key={`${setKey(set)}-${i}`} style={styles.threat}>{threatLine(set, currentTeam, levelMode === 'Open Level' ? 100 : 50, Math.max(1, Math.ceil((Number(battle) || 1) / 7)))}</Text>)}</View>}
      <Text style={styles.note}>{candidateCount} surviving set candidates are shown from the current clue screen. Candidate frequency is not a probability.</Text>
    </>}
  </View>;
}

const styles = StyleSheet.create({
  card:{backgroundColor:'#10231f',borderRadius:15,padding:11,marginTop:10,borderWidth:1,borderColor:'#315047'},
  header:{flexDirection:'row',alignItems:'center'},
  kicker:{fontSize:9,fontWeight:'900',letterSpacing:1.2,color:'#82a79b'},
  title:{fontSize:16,fontWeight:'900',color:'#eef6f2',marginTop:2},
  badge:{minWidth:30,paddingHorizontal:7,paddingVertical:5,borderRadius:10,backgroundColor:'#1d3c33',color:'#bfe4d7',textAlign:'center',fontWeight:'900'},
  warning:{color:'#e5b6a5',fontSize:11,lineHeight:16,marginTop:8},
  exactBox:{backgroundColor:'#1c3b32',borderRadius:9,padding:8,marginTop:9},
  exactTitle:{fontSize:9,fontWeight:'900',letterSpacing:.8,color:'#9fe2c8'},
  exactText:{fontSize:11,fontWeight:'800',color:'#edf7f2',marginTop:4,lineHeight:16},
  section:{marginTop:9,paddingTop:8,borderTopWidth:1,borderTopColor:'#25443b'},
  sectionTitle:{fontSize:9,fontWeight:'900',letterSpacing:1,color:'#82a79b'},
  speciesRow:{marginTop:6},
  speciesName:{fontSize:12,fontWeight:'900',color:'#edf6f2'},
  speciesText:{fontSize:10.5,color:'#b3c9c2',lineHeight:16,marginTop:2},
  threat:{fontSize:10.5,color:'#e1c18e',lineHeight:16,marginTop:5},
  note:{fontSize:9.5,color:'#78958d',lineHeight:14,marginTop:9},
});
