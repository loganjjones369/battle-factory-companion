import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { calculateDamage, bestDamagingMoves, getStats } from '../data/damageCalc';
import { getFactorySets } from '../data/setIdentity';

const norm = (v) => String(v || '').trim().toLowerCase();
const known = (p) => p?.species && p?.setId != null ? p : null;

function assessSet(attacker, defender, level, round) {
  const a = known(attacker), d = known(defender);
  if (!a || !d) return null;
  const aStats = getStats(a, a, level, round);
  const dStats = getStats(d, d, level, round);
  let best = null;
  for (const moveName of bestDamagingMoves(a)) {
    const r = calculateDamage({ attacker: a, attackerSet: a, defender: d, defenderSet: d, level, round, moveName });
    if (r?.percentMax != null && (!best || r.percentMax > best.percentMax)) best = { ...r, moveName };
  }
  if (!best) return { speed: aStats.spe > dStats.spe, damage: null, ko: false };
  return { speed: aStats.spe > dStats.spe, damage: best.percentMax, minDamage: best.percentMin, ko: best.percentMin >= 100, moveName: best.moveName };
}

function threatFor(attacker, team, level, round) {
  const details = team.map((defender) => ({ defender, result: assessSet(attacker, defender, level, round) })).filter(x => x.result);
  const dangerous = details.filter(x => x.result.ko || x.result.damage >= 50);
  const reliable = details.filter(x => !x.result.ko && x.result.damage < 50);
  return { details, dangerous, reliable, koCount: details.filter(x => x.result.ko).length, pressureCount: dangerous.length, fasterCount: details.filter(x => x.result.speed).length };
}

function label(t) {
  if (t.koCount) return `Can guarantee a KO against ${t.koCount}/${t.details.length}`;
  if (t.pressureCount === t.details.length && t.details.length) return 'Pressures your entire team';
  if (t.pressureCount) return `Pressures ${t.pressureCount}/${t.details.length} team members`;
  return 'Limited direct pressure';
}

export default function ThreatRadar({ candidates = [], team = [], level = 50, round = 1, max = 8 }) {
  const rows = useMemo(() => candidates.map((entry) => {
    const set = entry?.set || entry;
    const threat = threatFor(set, team, level, round);
    return { set, threat, frequency: Number(entry?.frequency || 0) };
  }).filter(x => x.threat.details.length).sort((a,b) => b.threat.koCount - a.threat.koCount || b.threat.pressureCount - a.threat.pressureCount || b.frequency - a.frequency).slice(0, max), [candidates, team, level, round, max]);

  if (!team.length || !rows.length) return null;
  return <View style={styles.card}>
    <Text style={styles.kicker}>THREAT RADAR</Text>
    <Text style={styles.title}>Why should I worry about these?</Text>
    <Text style={styles.sub}>Each row checks the candidate's exact Factory set against your exact current team. Damage is the best supported damaging move; speed is exact-set speed.</Text>
    {rows.map(({ set, threat, frequency }, i) => <View key={`${norm(set.species)}-${set.id}-${i}`} style={styles.row}>
      <View style={styles.head}><View style={styles.rank}><Text style={styles.rankText}>{i + 1}</Text></View><View style={{flex:1}}><Text style={styles.name}>{set.species} {set.id}</Text><Text style={styles.freq}>{(frequency * 100).toFixed(1)}% of surviving candidate teams</Text></View></View>
      <Text style={styles.label}>⚠ {label(threat)}</Text>
      {threat.details.map(({ defender, result }) => <View key={`${defender.species}-${defender.setId}`} style={styles.detail}><Text style={styles.defender}>{defender.species} {defender.setId}</Text><Text style={styles.detailText}>{result.ko ? 'GUARANTEED KO' : `${result.damage?.toFixed(1) || '—'}% max damage`}{result.speed ? ' • FASTER' : ' • SLOWER'}{result.moveName ? ` • ${result.moveName}` : ''}</Text></View>)}
    </View>)}
    <Text style={styles.note}>This is a matchup warning, not a prediction of which Pokémon will appear. Candidate frequency is based on the surviving legal Factory teams.</Text>
  </View>;
}

const styles=StyleSheet.create({card:{marginTop:12,backgroundColor:'#eee9dc',borderWidth:3,borderColor:'#39423a',borderRadius:16,padding:12},kicker:{fontSize:10,fontWeight:'900',letterSpacing:1.5,color:'#536453'},title:{fontSize:20,fontWeight:'900',color:'#263027',marginTop:2},sub:{fontSize:11,color:'#4b554c',lineHeight:16,marginTop:4,marginBottom:9},row:{borderTopWidth:2,borderTopColor:'#c4c8bd',paddingVertical:9},head:{flexDirection:'row',alignItems:'center'},rank:{width:28,height:28,borderRadius:14,borderWidth:2,borderColor:'#596957',alignItems:'center',justifyContent:'center',marginRight:8},rankText:{fontWeight:'900',color:'#263027'},name:{fontSize:15,fontWeight:'900',color:'#263027'},freq:{fontSize:9,color:'#647066',marginTop:2},label:{fontSize:11,fontWeight:'900',color:'#6a4b2e',marginTop:6},detail:{flexDirection:'row',justifyContent:'space-between',gap:8,paddingVertical:3},defender:{fontSize:10,fontWeight:'900',color:'#3f4b42'},detailText:{fontSize:9,fontWeight:'800',color:'#59635b',textAlign:'right',flex:1},note:{fontSize:9,color:'#697269',marginTop:7,lineHeight:13}}
