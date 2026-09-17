import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { analyzeFactoryCandidates } from '../data/candidateEngine';
import { calculateDamage, bestDamagingMoves, getStats } from '../data/damageCalc';
import { getActiveRunContext } from '../data/runProgress';

const norm = (v) => String(v || '').trim().toLowerCase();
const label = (p) => `${p?.species || p?.name || 'Unknown'} ${p?.setId ?? p?.sourceId ?? p?.id ?? ''}`.trim();

function assess(candidate, team, level, round) {
  const aStats = getStats(candidate, candidate, level, round);
  const details = team.map((d) => {
    const dStats = getStats(d, d, level, round);
    let best = null;
    bestDamagingMoves(candidate).forEach((moveName) => {
      const r = calculateDamage({ attacker: candidate, attackerSet: candidate, defender: d, defenderSet: d, level, round, moveName });
      if (r?.percentMax == null) return;
      if (!best || r.percentMax > best.percentMax) best = { ...r, moveName };
    });
    return { defender: d, speed: aStats.spe > dStats.spe, best };
  });
  const pressured = details.filter((x) => x.best?.percentMax >= 50).length;
  const ko = details.filter((x) => x.best?.percentMin >= 100).length;
  const faster = details.filter((x) => x.speed).length;
  const worst = Math.max(0, ...details.map((x) => Number(x.best?.percentMax) || 0));
  return { details, pressured, ko, faster, worst };
}

function threatText(a) {
  if (a.ko) return `Guaranteed KO range vs ${a.ko}/${a.teamSize}`;
  if (a.pressured === a.teamSize) return `50%+ damage range vs all ${a.teamSize}`;
  if (a.pressured) return `50%+ damage range vs ${a.pressured}/${a.teamSize}`;
  if (a.faster === a.teamSize) return `Faster than all ${a.teamSize}`;
  if (a.faster) return `Faster than ${a.faster}/${a.teamSize}`;
  return 'No mapped damage pressure';
}

export default function ThreatDashboard() {
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState(true);
  useEffect(() => { const id = setInterval(() => setTick((x) => x + 1), 700); return () => clearInterval(id); }, []);
  const context = getActiveRunContext();
  const team = context.currentTeam || [];
  const draft = context.draft || [];
  const blocked = draft.map((p) => p?.species).filter(Boolean);
  const levelMode = context.level === 100 ? 'Open Level' : 'Level 50';
  const level = levelMode === 'Open Level' ? 100 : 50;
  const round = Math.max(1, Math.ceil((Number(context.battle) || 1) / 7));
  const result = useMemo(() => {
    if (!team.length || !draft.length) return null;
    return analyzeFactoryCandidates({ draft, blockedSpecies: blocked, scientist: context.scientist || {}, levelMode, battle: context.battle || 1, revealed: context.revealed || {}, noland: context.noland || false, currentTeam: team, previousOpponent: context.previousOpponent || [] });
  }, [tick]);
  const threats = useMemo(() => {
    if (!result?.rankedSets?.length) return [];
    return result.rankedSets.slice(0, 30).map((entry) => {
      const a = assess(entry.set, team, level, round);
      return { ...entry, ...a, threatScore: (a.ko * 100) + (a.pressured * 30) + (a.faster * 15) + (a.worst >= 75 ? 10 : 0) };
    }).sort((a, b) => b.threatScore - a.threatScore || b.frequency - a.frequency).slice(0, 5);
  }, [result, team, level, round]);
  if (!team.length) return null;
  return <View style={styles.card}>
    <TouchableOpacity onPress={() => setOpen((x) => !x)} style={styles.header}>
      <View style={{ flex: 1 }}><Text style={styles.kicker}>LIVE THREAT RADAR</Text><Text style={styles.title}>What could still hurt my team?</Text><Text style={styles.sub}>Remaining Factory sets are checked against your exact three Pokémon.</Text></View>
      <Text style={styles.arrow}>{open ? '▲' : '▼'}</Text>
    </TouchableOpacity>
    {open && <>
      <View style={styles.teamBox}><Text style={styles.teamTitle}>YOUR CURRENT TEAM</Text><Text style={styles.teamText}>{team.map(label).join('  •  ')}</Text></View>
      {result && <Text style={styles.count}>{result.rankedSets.length} surviving candidate sets • ranked by threat, then surviving frequency</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rows}>
        {threats.map((t, i) => <View key={`${label(t.set)}-${i}`} style={styles.threat}>
          <View style={styles.rank}><Text style={styles.rankText}>#{i + 1}</Text></View>
          <View style={{ flex: 1 }}><Text style={styles.name}>{label(t.set)}</Text><Text style={styles.reason}>⚠ {threatText({ ...t, teamSize: team.length })}</Text><Text style={styles.meta}>{Number(t.frequency || 0) * 100 >= 0 ? `${(Number(t.frequency || 0) * 100).toFixed(1)}% surviving frequency` : ''} • Speed {t.faster}/{team.length}</Text></View>
        </View>)}
      </ScrollView>
      {!threats.length && <Text style={styles.empty}>No surviving threat candidates were found from the current evidence.</Text>}
      <Text style={styles.note}>This is a threat list, not a probability or prediction. It uses the Factory candidates that remain consistent with the information you have entered.</Text>
    </>}
  </View>;
}

const styles = StyleSheet.create({
  card:{backgroundColor:'#101c20',borderWidth:1,borderColor:'#5a4b36',borderRadius:15,padding:11,marginHorizontal:8,marginBottom:7},
  header:{flexDirection:'row',alignItems:'center'},kicker:{color:'#d9b979',fontSize:8,fontWeight:'900',letterSpacing:1.4},title:{color:'#f3faf7',fontSize:16,fontWeight:'900',marginTop:2},sub:{color:'#91a09a',fontSize:9,lineHeight:14,marginTop:2},arrow:{color:'#d9b979',fontSize:15,padding:6},
  teamBox:{backgroundColor:'#172722',borderRadius:9,padding:8,marginTop:9},teamTitle:{color:'#7f9b8d',fontSize:7,fontWeight:'900',letterSpacing:1},teamText:{color:'#e7eee9',fontSize:10,fontWeight:'800',marginTop:3},count:{color:'#788a82',fontSize:8,marginTop:7},rows:{gap:7,paddingTop:7,paddingBottom:2},threat:{width:250,backgroundColor:'#e9e9e1',borderRadius:11,padding:9,flexDirection:'row'},rank:{width:28,height:28,borderRadius:14,backgroundColor:'#314b38',alignItems:'center',justifyContent:'center',marginRight:8},rankText:{color:'#fff',fontSize:9,fontWeight:'900'},name:{color:'#263027',fontSize:12,fontWeight:'900'},reason:{color:'#6b3328',fontSize:9,fontWeight:'900',marginTop:3},meta:{color:'#5c655e',fontSize:8,marginTop:3},empty:{color:'#a7b1ac',fontSize:10,marginTop:8},note:{color:'#6f7d76',fontSize:8,lineHeight:12,marginTop:8}
});