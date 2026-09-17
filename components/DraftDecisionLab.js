import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { analyzeFactoryCandidates } from '../data/candidateEngine';
import { calculateDamage, getStats, getEffectiveSpeed, bestDamagingMoves } from '../data/damageCalc';

const norm = (v) => String(v || '').trim().toLowerCase();
const key = (p) => `${norm(p?.species)}#${p?.setId ?? ''}`;
const STATUS_ORDER = ['healthy', 'paralyzed', 'burned', 'poisoned', 'asleep'];
const STATUS_LABELS = {
  healthy: 'HEALTHY',
  paralyzed: 'PARALYZED',
  burned: 'BURNED',
  poisoned: 'POISONED',
  asleep: 'ASLEEP',
};
const STATUS_ICONS = { healthy: '○', paralyzed: '⚡', burned: '🔥', poisoned: '☠', asleep: 'Zz' };
const statusLabel = (status) => STATUS_LABELS[status] || 'HEALTHY';

function nextStatus(status) {
  const index = STATUS_ORDER.indexOf(status || 'healthy');
  return STATUS_ORDER[(index + 1) % STATUS_ORDER.length];
}

function analyzeThreats(candidateResult, lineup, levelNumber, round, statuses) {
  const threats = [];
  const sets = candidateResult?.rankedSets || [];
  for (const entry of sets.slice(0, 120)) {
    const foe = entry.set;
    const foeBase = { ...foe };
    const foeStats = getStats(foeBase, foeBase, levelNumber, round);
    const foeSpeed = getEffectiveSpeed(foeStats, 'healthy');
    const targetRows = lineup.map((ally) => {
      const allyBase = { ...ally };
      const allyStatus = statuses[key(ally)] || 'healthy';
      const allyStats = getStats(allyBase, allyBase, levelNumber, round);
      const allySpeed = getEffectiveSpeed(allyStats, allyStatus);
      const moves = bestDamagingMoves(foeBase);
      const damages = moves.map((moveName) => calculateDamage({
        attacker: foeBase,
        attackerSet: foeBase,
        defender: allyBase,
        defenderSet: allyBase,
        level: levelNumber,
        round,
        moveName,
        defenderStatus: allyStatus,
      })).filter((x) => !x.unsupported);
      const maxDamage = damages.reduce((best, x) => Math.max(best, x.percentMax || 0), 0);
      const best = damages.reduce((best, x, i) => !best || (x.percentMax || 0) > (best.percentMax || 0) ? { ...x, moveName: moves[i] } : best, null);
      const speed = foeSpeed > allySpeed ? 'faster' : foeSpeed === allySpeed ? 'tie' : 'slower';
      return { ally, allyStatus, allySpeed, rawSpeed: allyStats.spe, maxDamage, best, speed };
    });
    const dangerous = targetRows.filter((r) => r.maxDamage >= 50 || (r.best?.ko && r.best.ko <= 2) || r.speed === 'faster');
    if (dangerous.length) threats.push({ entry, foe, targetRows, dangerousCount: dangerous.length, score: dangerous.reduce((s, r) => s + (r.maxDamage >= 100 ? 4 : r.maxDamage >= 50 ? 2 : 0) + (r.speed === 'faster' ? 1 : 0), 0) });
  }
  return threats.sort((a, b) => b.score - a.score || b.entry.count - a.entry.count).slice(0, 12);
}

export default function DraftDecisionLab({ draft = [], blockedSpecies = [], scientist = {}, levelMode = 'Open Level', battle = 1, revealed = {}, noland = false }) {
  const usable = draft.filter(Boolean);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [statuses, setStatuses] = useState({});
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

  const cycleStatus = (p) => {
    const k = key(p);
    setAnalysis(null);
    setStatuses((old) => {
      const current = old[k] || 'healthy';
      const next = nextStatus(current);
      const copy = { ...old };
      if (next === 'healthy') delete copy[k];
      else copy[k] = next;
      return copy;
    });
  };

  const runAnalysis = () => {
    if (selected.length !== 3) return;
    const result = analyzeFactoryCandidates({ draft: usable, blockedSpecies, scientist, levelMode, battle, revealed, noland });
    const threats = analyzeThreats(result, selected, levelNumber, round, statuses);
    const uncovered = threats.filter((t) => t.dangerousCount >= 2).length;
    const hardThreats = threats.filter((t) => t.targetRows.some((r) => r.maxDamage >= 100 || (r.best?.ko && r.best.ko <= 2)));
    setAnalysis({ result, threats, uncovered, hardThreats, lineup: selected, statuses: { ...statuses } });
  };

  const saveScenario = () => {
    if (selected.length !== 3) return;
    const snapshot = { id: Date.now(), label: `Scenario ${saved.length + 1}`, keys: selectedKeys, statuses: { ...statuses }, names: selected.map((p) => `${p.species} ${p.setId}`) };
    setSaved((old) => [...old, snapshot].slice(-4));
  };

  const loadScenario = (snapshot) => {
    setSelectedKeys(snapshot.keys);
    setStatuses(snapshot.statuses || {});
    setAnalysis(null);
  };

  return <View style={st.card}>
    <View style={st.header}><View style={{ flex: 1 }}><Text style={st.label}>DRAFT DECISION LAB</Text><Text style={st.title}>Try the team before locking it</Text></View><Text style={st.badge}>{selected.length}/3</Text></View>
    <Text style={st.help}>Pick any three from the six. Tap the status button under a Pokémon to cycle through healthy, paralysis, burn, poison and sleep. The condition stays attached to this scenario until you cycle back to healthy.</Text>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.row}>
      {usable.map((p) => {
        const on = selectedKeys.includes(key(p));
        const status = statuses[key(p)] || 'healthy';
        return <View key={key(p)} style={st.slot}>
          <TouchableOpacity onPress={() => toggle(p)} style={[st.pokemon, on && st.pokemonOn]}>
            <Text style={st.pokeName}>{p.species}</Text>
            <Text style={st.pokeSet}>SET {p.setId}{p.isElevated ? ' • ↑' : ''}</Text>
            <Text style={st.pokeItem}>{p.item || 'Item unknown'}</Text>
            {on && <Text style={st.check}>✓ IN LINEUP</Text>}
          </TouchableOpacity>
          {on && <TouchableOpacity onPress={() => cycleStatus(p)} style={[st.statusButton, status !== 'healthy' && st.statusOn]}>
            <Text style={st.statusText}>{STATUS_ICONS[status]} {statusLabel(status)}</Text>
          </TouchableOpacity>}
        </View>;
      })}
    </ScrollView>

    <Text style={st.statusLegend}>Gen III effects: paralysis = ¼ Speed • burn = physical damage reduction • poison/sleep = no stat change</Text>

    <View style={st.actions}><TouchableOpacity disabled={selected.length !== 3} onPress={runAnalysis} style={[st.button, selected.length !== 3 && st.disabled]}><Text style={st.buttonText}>PREVIEW THIS LINEUP</Text></TouchableOpacity><TouchableOpacity disabled={selected.length !== 3} onPress={saveScenario} style={[st.secondary, selected.length !== 3 && st.disabled]}><Text style={st.secondaryText}>SAVE SCENARIO</Text></TouchableOpacity></View>

    {!!saved.length && <View style={st.saved}><Text style={st.small}>YOUR ALTERNATIVES</Text>{saved.map((s) => <TouchableOpacity key={s.id} onPress={() => loadScenario(s)} style={st.savedRow}><Text style={st.savedLabel}>{s.label}</Text><Text style={st.savedNames}>{s.names.join(' • ')}{Object.values(s.statuses || {}).filter((x) => x !== 'healthy').length ? ' • status test' : ''}</Text></TouchableOpacity>)}</View>}

    {analysis && <View style={st.results}>
      <Text style={st.resultTitle}>LINEUP PREVIEW</Text>
      <Text style={st.lineup}>{analysis.lineup.map((p) => `${p.species} ${p.setId}`).join('  •  ')}</Text>
      <View style={st.statusSummary}>{analysis.lineup.map((p) => {
        const k = key(p);
        const s = analysis.statuses[k] || 'healthy';
        const raw = getStats(p, p, levelNumber, round).spe;
        const effective = getEffectiveSpeed({ spe: raw }, s);
        const statusEffect = s === 'paralyzed' ? `Speed ${effective} (normal ${raw})` : s === 'burned' ? 'physical damage reduced when attacking' : s === 'poisoned' ? 'no stat change' : s === 'asleep' ? 'no stat change' : 'normal battle stats';
        return <View key={k} style={st.statusRow}><Text style={st.statusName}>{p.species} {p.setId}</Text><Text style={st.speedText}>{statusLabel(s)} • {statusEffect}</Text></View>;
      })}</View>
      <View style={st.metrics}><View style={st.metric}><Text style={st.metricValue}>{analysis.result.rankedSets.length}</Text><Text style={st.metricLabel}>SURVIVING SETS</Text></View><View style={st.metric}><Text style={st.metricValue}>{analysis.threats.length}</Text><Text style={st.metricLabel}>TOP THREATS</Text></View><View style={st.metric}><Text style={st.metricValue}>{analysis.hardThreats.length}</Text><Text style={st.metricLabel}>2HKO / OHKO RISKS</Text></View></View>
      <Text style={st.note}>Statuses are scenario conditions, not changes to the stored base stats. Paralysis changes Speed comparisons; burn is passed into damage calculations when that Pokémon attacks; poison and sleep do not change the damage formula or Speed.</Text>

      <Text style={st.sectionTitle}>BIGGEST THREATS TO THIS LINEUP</Text>
      {analysis.threats.map((t, i) => <View key={`${key(t.foe)}-${i}`} style={st.threat}><View style={st.threatHead}><Text style={st.rank}>{i + 1}</Text><View style={{ flex: 1 }}><Text style={st.foe}>{t.foe.species} {t.foe.id ?? t.foe.setId ?? ''}</Text><Text style={st.frequency}>{(t.entry.frequency * 100).toFixed(1)}% of surviving candidate teams</Text></View><Text style={st.score}>RISK {t.score}</Text></View>{t.targetRows.map((r, j) => <View key={`${key(r.ally)}-${j}`} style={st.target}><View><Text style={st.targetName}>{r.ally.species} {r.ally.setId}</Text><Text style={st.statusMini}>{statusLabel(r.allyStatus)} • {r.allySpeed} Speed{r.allyStatus === 'paralyzed' ? ` (normal ${r.rawSpeed})` : ''}</Text></View><Text style={st.targetInfo}>{r.speed}{r.best ? ` • ${r.best.moveName} ${r.best.percentMin.toFixed(1)}–${r.best.percentMax.toFixed(1)}%` : ''}</Text></View>)}</View>)}
      {!analysis.threats.length && <Text style={st.empty}>No high-priority threats found in the screened surviving sets.</Text>}
    </View>}
  </View>;
}

const st = StyleSheet.create({
  card:{backgroundColor:'#101c20',borderWidth:1,borderColor:'#29403c',borderRadius:17,padding:13,marginBottom:11},
  header:{flexDirection:'row',alignItems:'flex-start'}, label:{color:'#6ed0b0',fontSize:9,fontWeight:'900',letterSpacing:1.3,marginBottom:4}, title:{color:'#f3faf7',fontSize:18,fontWeight:'900'}, badge:{backgroundColor:'#17382f',color:'#70d4af',fontWeight:'900',paddingHorizontal:9,paddingVertical:6,borderRadius:10},
  help:{color:'#78928b',fontSize:10,lineHeight:15,marginTop:6,marginBottom:9}, row:{gap:7,paddingBottom:5}, slot:{width:132}, pokemon:{width:132,minHeight:88,borderWidth:1,borderColor:'#29403c',backgroundColor:'#08110f',borderRadius:11,padding:9}, pokemonOn:{borderColor:'#70d4af',backgroundColor:'#14362b'}, pokeName:{color:'#e5f2ee',fontSize:11,fontWeight:'900'}, pokeSet:{color:'#70d4af',fontSize:8,fontWeight:'900',marginTop:3}, pokeItem:{color:'#688078',fontSize:8,marginTop:4}, check:{color:'#a7e5d0',fontSize:7,fontWeight:'900',marginTop:6},
  statusButton:{marginTop:4,minHeight:28,borderWidth:1,borderColor:'#304943',borderRadius:8,paddingVertical:6,alignItems:'center',justifyContent:'center'}, statusOn:{borderColor:'#d0b34e',backgroundColor:'#302c17'}, statusText:{color:'#a9c2ba',fontSize:7,fontWeight:'900'}, statusLegend:{color:'#536b64',fontSize:7,lineHeight:11,marginTop:5},
  actions:{flexDirection:'row',gap:7,marginTop:7}, button:{flex:1,backgroundColor:'#23634f',borderRadius:10,padding:12,alignItems:'center'}, buttonText:{color:'#f0fff9',fontSize:9,fontWeight:'900'}, secondary:{flex:1,borderWidth:1,borderColor:'#315047',borderRadius:10,padding:12,alignItems:'center'}, secondaryText:{color:'#a9c2ba',fontSize:9,fontWeight:'900'}, disabled:{opacity:.35},
  saved:{marginTop:10,borderTopWidth:1,borderTopColor:'#29403c',paddingTop:8}, small:{color:'#688078',fontSize:8,fontWeight:'900',letterSpacing:1}, savedRow:{backgroundColor:'#0b1714',borderRadius:8,padding:8,marginTop:5}, savedLabel:{color:'#70d4af',fontSize:9,fontWeight:'900'}, savedNames:{color:'#9bb2ab',fontSize:8,marginTop:2},
  results:{marginTop:11,borderTopWidth:1,borderTopColor:'#29403c',paddingTop:10}, resultTitle:{color:'#6ed0b0',fontSize:9,fontWeight:'900',letterSpacing:1.2}, lineup:{color:'#eef8f5',fontSize:13,fontWeight:'900',marginTop:4}, statusSummary:{marginTop:8,backgroundColor:'#0b1714',borderRadius:9,padding:8}, statusRow:{flexDirection:'row',justifyContent:'space-between',gap:8,paddingVertical:3}, statusName:{color:'#b9cbc5',fontSize:8,fontWeight:'800'}, speedText:{color:'#70d4af',fontSize:8,fontWeight:'900',textAlign:'right',flex:1}, metrics:{flexDirection:'row',gap:6,marginTop:9}, metric:{flex:1,backgroundColor:'#0b1714',borderRadius:9,padding:8}, metricValue:{color:'#70d4af',fontSize:16,fontWeight:'900'}, metricLabel:{color:'#688078',fontSize:7,fontWeight:'900',marginTop:2}, note:{color:'#627a72',fontSize:8,lineHeight:13,marginTop:7}, sectionTitle:{color:'#a8beb7',fontSize:9,fontWeight:'900',letterSpacing:1,marginTop:12,marginBottom:5}, threat:{backgroundColor:'#0b1714',borderRadius:10,padding:9,marginTop:6}, threatHead:{flexDirection:'row',alignItems:'center'}, rank:{width:23,height:23,borderRadius:12,backgroundColor:'#203a32',color:'#e6f4ef',textAlign:'center',paddingTop:5,fontSize:9,fontWeight:'900',marginRight:7}, foe:{color:'#e7f4ef',fontSize:11,fontWeight:'900'}, frequency:{color:'#688078',fontSize:7,marginTop:2}, score:{color:'#8fb5a8',fontSize:8,fontWeight:'900'}, target:{flexDirection:'row',justifyContent:'space-between',borderTopWidth:1,borderTopColor:'#1d302b',paddingTop:5,marginTop:5}, targetName:{color:'#b9cbc5',fontSize:8,fontWeight:'800'}, statusMini:{color:'#688078',fontSize:7,marginTop:2}, targetInfo:{color:'#70d4af',fontSize:8,fontWeight:'800',textAlign:'right'}, empty:{color:'#6f8982',fontSize:10,paddingVertical:10}
});
