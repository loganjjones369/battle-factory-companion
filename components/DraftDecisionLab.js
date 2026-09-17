import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { analyzeFactoryCandidates } from '../data/candidateEngine';
import { calculateDamage, getStats, bestDamagingMoves } from '../data/damageCalc';

const norm = (v) => String(v || '').trim().toLowerCase();
const key = (p) => `${norm(p?.species)}#${p?.setId ?? ''}`;

function analyzeThreats(candidateResult, lineup, levelNumber, round) {
  const threats = [];
  const sets = candidateResult?.rankedSets || [];
  for (const entry of sets.slice(0, 120)) {
    const foe = entry.set;
    const foeBase = { ...foe };
    const foeStats = getStats(foeBase, foeBase, levelNumber, round);
    const targetRows = lineup.map((ally) => {
      const allyBase = { ...ally };
      const allyStats = getStats(allyBase, allyBase, levelNumber, round);
      const moves = bestDamagingMoves(foeBase);
      const damages = moves.map((moveName) => calculateDamage({ attacker: foeBase, attackerSet: foeBase, defender: allyBase, defenderSet: allyBase, level: levelNumber, round, moveName })).filter((x) => !x.unsupported);
      const maxDamage = damages.reduce((best, x) => Math.max(best, x.percentMax || 0), 0);
      const best = damages.reduce((best, x, i) => !best || (x.percentMax || 0) > (best.percentMax || 0) ? { ...x, moveName: moves[i] } : best, null);
      const speed = foeStats.spe > allyStats.spe ? 'faster' : foeStats.spe === allyStats.spe ? 'tie' : 'slower';
      return { ally, maxDamage, best, speed };
    });
    const dangerous = targetRows.filter((r) => r.maxDamage >= 50 || (r.best?.ko && r.best.ko <= 2) || r.speed === 'faster');
    if (dangerous.length) threats.push({ entry, foe, targetRows, dangerousCount: dangerous.length, score: dangerous.reduce((s, r) => s + (r.maxDamage >= 100 ? 4 : r.maxDamage >= 50 ? 2 : 0) + (r.speed === 'faster' ? 1 : 0), 0) });
  }
  return threats.sort((a, b) => b.score - a.score || b.entry.count - a.entry.count).slice(0, 12);
}

export default function DraftDecisionLab({ draft = [], blockedSpecies = [], scientist = {}, levelMode = 'Open Level', battle = 1, revealed = {}, noland = false }) {
  const usable = draft.filter(Boolean);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [saved, setSaved] = useState([]);
  const levelNumber = levelMode === 'Open Level' ? 100 : 50;
  const round = Math.max(1, Math.ceil((Number(battle) || 1) / 7));
  const selected = useMemo(() => selectedKeys.map((k) => usable.find((p) => key(p) === k)).filter(Boolean), [selectedKeys, usable]);

  const toggle = (p) => {
    const k = key(p);
    setAnalysis(null);
    setSelectedKeys((old) => old.includes(k) ? old.filter((x) => x !== k) : old.length < 3 ? [...old, k] : old);
  };

  const runAnalysis = () => {
    if (selected.length !== 3) return;
    const result = analyzeFactoryCandidates({ draft: usable, blockedSpecies, scientist, levelMode, battle, revealed, noland });
    const threats = analyzeThreats(result, selected, levelNumber, round);
    const uncovered = threats.filter((t) => t.dangerousCount >= 2).length;
    const hardThreats = threats.filter((t) => t.targetRows.some((r) => r.maxDamage >= 100 || (r.best?.ko && r.best.ko <= 2)));
    setAnalysis({ result, threats, uncovered, hardThreats, lineup: selected });
  };

  const saveScenario = () => {
    if (selected.length !== 3) return;
    const snapshot = { id: Date.now(), label: `Scenario ${saved.length + 1}`, keys: selectedKeys, names: selected.map((p) => `${p.species} ${p.setId}`) };
    setSaved((old) => [...old, snapshot].slice(-4));
  };

  const loadScenario = (snapshot) => {
    setSelectedKeys(snapshot.keys);
    setAnalysis(null);
  };

  return <View style={st.card}>
    <View style={st.header}><View style={{ flex: 1 }}><Text style={st.label}>DRAFT DECISION LAB</Text><Text style={st.title}>Try the team before locking it</Text></View><Text style={st.badge}>{selected.length}/3</Text></View>
    <Text style={st.help}>Pick any three from the six, preview the threats, run calculations, then change one or more Pokémon and analyze again. Nothing here changes your real team.</Text>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.row}>
      {usable.map((p) => { const on = selectedKeys.includes(key(p)); return <TouchableOpacity key={key(p)} onPress={() => toggle(p)} style={[st.pokemon, on && st.pokemonOn]}><Text style={st.pokeName}>{p.species}</Text><Text style={st.pokeSet}>SET {p.setId}{p.isElevated ? ' • ↑' : ''}</Text><Text style={st.pokeItem}>{p.item || 'Item unknown'}</Text>{on && <Text style={st.check}>✓ IN LINEUP</Text>}</TouchableOpacity>; })}
    </ScrollView>

    <View style={st.actions}><TouchableOpacity disabled={selected.length !== 3} onPress={runAnalysis} style={[st.button, selected.length !== 3 && st.disabled]}><Text style={st.buttonText}>PREVIEW THIS LINEUP</Text></TouchableOpacity><TouchableOpacity disabled={selected.length !== 3} onPress={saveScenario} style={[st.secondary, selected.length !== 3 && st.disabled]}><Text style={st.secondaryText}>SAVE SCENARIO</Text></TouchableOpacity></View>

    {!!saved.length && <View style={st.saved}><Text style={st.small}>YOUR ALTERNATIVES</Text>{saved.map((s) => <TouchableOpacity key={s.id} onPress={() => loadScenario(s)} style={st.savedRow}><Text style={st.savedLabel}>{s.label}</Text><Text style={st.savedNames}>{s.names.join(' • ')}</Text></TouchableOpacity>)}</View>}

    {analysis && <View style={st.results}>
      <Text style={st.resultTitle}>LINEUP PREVIEW</Text>
      <Text style={st.lineup}>{analysis.lineup.map((p) => `${p.species} ${p.setId}`).join('  •  ')}</Text>
      <View style={st.metrics}><View style={st.metric}><Text style={st.metricValue}>{analysis.result.rankedSets.length}</Text><Text style={st.metricLabel}>SURVIVING SETS</Text></View><View style={st.metric}><Text style={st.metricValue}>{analysis.threats.length}</Text><Text style={st.metricLabel}>TOP THREATS</Text></View><View style={st.metric}><Text style={st.metricValue}>{analysis.hardThreats.length}</Text><Text style={st.metricLabel}>2HKO / OHKO RISKS</Text></View></View>
      <Text style={st.note}>Threats are a practical screening of surviving sets against this hypothetical lineup, not a Factory probability or an overall team score.</Text>

      <Text style={st.sectionTitle}>BIGGEST THREATS TO THIS LINEUP</Text>
      {analysis.threats.map((t, i) => <View key={`${key(t.foe)}-${i}`} style={st.threat}><View style={st.threatHead}><Text style={st.rank}>{i + 1}</Text><View style={{ flex: 1 }}><Text style={st.foe}>{t.foe.species} {t.foe.id ?? t.foe.setId ?? ''}</Text><Text style={st.frequency}>{(t.entry.frequency * 100).toFixed(1)}% of surviving candidate teams</Text></View><Text style={st.score}>RISK {t.score}</Text></View>{t.targetRows.map((r, j) => <View key={`${key(r.ally)}-${j}`} style={st.target}><Text style={st.targetName}>{r.ally.species} {r.ally.setId}</Text><Text style={st.targetInfo}>{r.speed}{r.best ? ` • ${r.best.moveName} ${r.best.percentMin.toFixed(1)}–${r.best.percentMax.toFixed(1)}%` : ''}</Text></View>)}</View>)}
      {!analysis.threats.length && <Text style={st.empty}>No high-priority threats found in the screened surviving sets.</Text>}
    </View>}
  </View>;
}

const st = StyleSheet.create({
  card:{backgroundColor:'#101c20',borderWidth:1,borderColor:'#29403c',borderRadius:17,padding:13,marginBottom:11},
  header:{flexDirection:'row',alignItems:'flex-start'}, label:{color:'#6ed0b0',fontSize:9,fontWeight:'900',letterSpacing:1.3,marginBottom:4}, title:{color:'#f3faf7',fontSize:18,fontWeight:'900'}, badge:{backgroundColor:'#17382f',color:'#70d4af',fontWeight:'900',paddingHorizontal:9,paddingVertical:6,borderRadius:10},
  help:{color:'#78928b',fontSize:10,lineHeight:15,marginTop:6,marginBottom:9}, row:{gap:7,paddingBottom:5}, pokemon:{width:132,minHeight:88,borderWidth:1,borderColor:'#29403c',backgroundColor:'#08110f',borderRadius:11,padding:9}, pokemonOn:{borderColor:'#70d4af',backgroundColor:'#14362b'}, pokeName:{color:'#e5f2ee',fontSize:11,fontWeight:'900'}, pokeSet:{color:'#70d4af',fontSize:8,fontWeight:'900',marginTop:3}, pokeItem:{color:'#688078',fontSize:8,marginTop:4}, check:{color:'#a7e5d0',fontSize:7,fontWeight:'900',marginTop:6},
  actions:{flexDirection:'row',gap:7,marginTop:7}, button:{flex:1,backgroundColor:'#23634f',borderRadius:10,padding:12,alignItems:'center'}, buttonText:{color:'#f0fff9',fontSize:9,fontWeight:'900'}, secondary:{flex:1,borderWidth:1,borderColor:'#315047',borderRadius:10,padding:12,alignItems:'center'}, secondaryText:{color:'#a9c2ba',fontSize:9,fontWeight:'900'}, disabled:{opacity:.35},
  saved:{marginTop:10,borderTopWidth:1,borderTopColor:'#29403c',paddingTop:8}, small:{color:'#688078',fontSize:8,fontWeight:'900',letterSpacing:1}, savedRow:{backgroundColor:'#0b1714',borderRadius:8,padding:8,marginTop:5}, savedLabel:{color:'#70d4af',fontSize:9,fontWeight:'900'}, savedNames:{color:'#9bb2ab',fontSize:8,marginTop:2},
  results:{marginTop:11,borderTopWidth:1,borderTopColor:'#29403c',paddingTop:10}, resultTitle:{color:'#6ed0b0',fontSize:9,fontWeight:'900',letterSpacing:1.2}, lineup:{color:'#eef8f5',fontSize:13,fontWeight:'900',marginTop:4}, metrics:{flexDirection:'row',gap:6,marginTop:9}, metric:{flex:1,backgroundColor:'#0b1714',borderRadius:9,padding:8}, metricValue:{color:'#70d4af',fontSize:16,fontWeight:'900'}, metricLabel:{color:'#688078',fontSize:7,fontWeight:'900',marginTop:2}, note:{color:'#627a72',fontSize:8,lineHeight:13,marginTop:7}, sectionTitle:{color:'#a8beb7',fontSize:9,fontWeight:'900',letterSpacing:1,marginTop:12,marginBottom:5}, threat:{backgroundColor:'#0b1714',borderRadius:10,padding:9,marginTop:6}, threatHead:{flexDirection:'row',alignItems:'center'}, rank:{width:23,height:23,borderRadius:12,backgroundColor:'#203a32',color:'#e6f4ef',textAlign:'center',paddingTop:5,fontSize:9,fontWeight:'900',marginRight:7}, foe:{color:'#e7f4ef',fontSize:11,fontWeight:'900'}, frequency:{color:'#688078',fontSize:7,marginTop:2}, score:{color:'#8fb5a8',fontSize:8,fontWeight:'900'}, target:{flexDirection:'row',justifyContent:'space-between',borderTopWidth:1,borderTopColor:'#1d302b',paddingTop:5,marginTop:5}, targetName:{color:'#b9cbc5',fontSize:8,fontWeight:'800'}, targetInfo:{color:'#70d4af',fontSize:8,fontWeight:'800'}, empty:{color:'#6f8982',fontSize:10,paddingVertical:10}
});
