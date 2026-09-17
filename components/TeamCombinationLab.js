import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getDraftSetPools } from '../data/factoryPools';
import { analyzeOpponentDraft } from './OpponentDraftLab';
import { scenarioMatchup } from '../data/scenarioDamage';

const norm = (v) => String(v || '').trim().toLowerCase();
const empty = [];
const elevationToSwaps = (elevation) => [0, 15, 22, 29, 36, 43][Math.max(0, Math.min(5, Number(elevation) || 0))];
const withDraftStats = (set, draftEntry, level, round) => ({ ...set, species: set.species || draftEntry?.species, setId: set.id ?? set.setId, factoryIV: draftEntry?.factoryIV, isElevated: draftEntry?.isElevated, level, round });
const setOptionsForSlot = (draftEntry, slotIndex, pool) => { if (!draftEntry || !pool?.supported) return empty; const source = slotIndex < pool.elevation ? pool.upgradedPool : pool.regularPool; return source.filter((set) => norm(set.species) === norm(draftEntry.species)); };
const combinations = (items) => { const out = []; for (let a = 0; a < items.length; a += 1) for (let b = a + 1; b < items.length; b += 1) for (let c = b + 1; c < items.length; c += 1) out.push([items[a], items[b], items[c]]); return out; };

function evaluateCombination(combo, draft, optionsBySlot, level, round, scenario) {
  const comboIndices = combo.map((entry) => entry.index);
  const leftBehind = draft.map((p, i) => ({ p, index: i })).filter((entry) => !comboIndices.includes(entry.index));
  const variantLists = combo.map((entry) => optionsBySlot[entry.index] || []);
  const variants = [];
  const walk = (depth, chosen) => { if (variants.length >= 180) return; if (depth === variantLists.length) { variants.push(chosen); return; } for (const set of variantLists[depth]) walk(depth + 1, [...chosen, set]); };
  walk(0, []);
  let pressureHits = 0; let speedHits = 0; let hardHits = 0; let defensiveGaps = 0;
  const targetSummaries = leftBehind.map(({ p, index }) => ({ species: p.species, index, pressureSets: 0, speedSets: 0, hardSets: 0, examples: [] }));
  variants.forEach((sets) => {
    const chosenSets = sets.map((set, i) => withDraftStats(set, combo[i].p, level, round));
    leftBehind.forEach(({ p }, targetIndex) => {
      const target = withDraftStats(p, p, level, round); let targetPressure = false; let targetSpeed = false; let targetHard = false;
      chosenSets.forEach((attacker) => {
        const result = scenarioMatchup(attacker, target, level, round, scenario);
        const faster = result.speed === 'faster';
        if (result.hitBack?.percentMax >= 50 || faster) targetPressure = true;
        if (faster) targetSpeed = true;
        if (result.guaranteedTwoHKO || result.guaranteedOHKO) targetHard = true;
        if (result.hitBack && targetSummaries[targetIndex].examples.length < 3) targetSummaries[targetIndex].examples.push(`${attacker.species} ${attacker.setId}: ${result.hitBack.moveName} ${result.hitBack.percentMin.toFixed(1)}–${result.hitBack.percentMax.toFixed(1)}%${faster ? ' • faster' : ''}`);
      });
      if (targetPressure) { pressureHits += 1; targetSummaries[targetIndex].pressureSets += 1; }
      if (targetSpeed) { speedHits += 1; targetSummaries[targetIndex].speedSets += 1; }
      if (targetHard) { hardHits += 1; targetSummaries[targetIndex].hardSets += 1; }
    });
  });
  leftBehind.forEach(({ p }) => {
    const target = withDraftStats(p, p, level, round);
    const hasAnswer = combo.some((entry) => {
      const source = withDraftStats(entry.p, entry.p, level, round);
      const result = scenarioMatchup(target, source, level, round, scenario);
      return result.hitBack?.percentMax < 50 && result.speed !== 'faster';
    });
    if (!hasAnswer) defensiveGaps += 1;
  });
  const variantCount = Math.max(1, variants.length); const denominator = variantCount * Math.max(1, leftBehind.length);
  const pressureCoverage = pressureHits / denominator; const speedCoverage = speedHits / denominator; const hardCoverage = hardHits / denominator;
  return { combo, variantCount, leftBehind, targetSummaries, pressureCoverage, speedCoverage, hardCoverage, defensiveGaps, coverageScore: Math.round(pressureCoverage * 100) + Math.round(speedCoverage * 40) + Math.round(hardCoverage * 60) - defensiveGaps * 8 };
}

export function analyzeDraftCombinations({ draft = [], levelMode = 'Open Level', battle = 1, swaps = null, scenario = {} } = {}) {
  const usable = draft.filter(Boolean); if (usable.length < 3) return { supported: false, reason: 'Enter at least three draft Pokémon first.', rows: [] };
  const level = levelMode === 'Open Level' ? 100 : 50; const round = Math.max(1, Math.ceil((Number(battle) || 1) / 7)); const inferredElevation = usable.filter((p) => p?.isElevated).length; const effectiveSwaps = swaps == null ? elevationToSwaps(inferredElevation) : Math.max(0, Number(swaps) || 0); const pool = getDraftSetPools({ levelMode, battle, swaps: effectiveSwaps });
  if (!pool.supported) return { supported: false, reason: pool.reason, rows: [] };
  const entries = usable.map((p, index) => ({ p, index })); const optionsBySlot = {}; entries.forEach(({ p, index }) => { optionsBySlot[index] = setOptionsForSlot(p, index, pool); });
  const rows = combinations(entries).map((combo) => evaluateCombination(combo, usable, optionsBySlot, level, round, scenario)).sort((a, b) => b.coverageScore - a.coverageScore || b.hardCoverage - a.hardCoverage || b.speedCoverage - a.speedCoverage);
  return { supported: true, levelMode, battle: Number(battle) || 1, swaps: effectiveSwaps, elevation: pool.elevation, rows };
}

export default function TeamCombinationLab({ draft = [], levelMode = 'Open Level', battle = 1, swaps = null, scientist = {}, blockedSpecies = [], revealed = {}, currentTeam = [], previousOpponent = [], noland = false, scenario = {} }) {
  const [open, setOpen] = useState(null);
  const result = useMemo(() => analyzeDraftCombinations({ draft, levelMode, battle, swaps, scenario }), [draft, levelMode, battle, swaps, scenario]);
  const threatGuide = useMemo(() => analyzeOpponentDraft({ draft, scientist, levelMode, battle, blockedSpecies, revealed, currentTeam, previousOpponent, noland, scenario }), [draft, scientist, levelMode, battle, blockedSpecies, revealed, currentTeam, previousOpponent, noland, scenario]);
  const rows = result.rows || []; const top = rows.slice(0, 3); const threatRows = (threatGuide.rows || []).slice(0, 3);
  return <View style={st.card}>
    <View style={st.header}><View style={{ flex: 1 }}><Text style={st.label}>AUTOMATIC TEAM SELECTION</Text><Text style={st.title}>Which three fit together?</Text></View><Text style={st.badge}>{rows.length}</Text></View>
    <Text style={st.help}>Exact Factory sets are tested under the current scenario: {scenario.weather || 'clear'} weather, selected abilities, statuses, and stat stages. This is coverage analysis, not a prediction.</Text>
    {!result.supported ? <Text style={st.empty}>{result.reason}</Text> : <>
      <View style={st.autoBox}><Text style={st.autoTitle}>AUTO TEAM GUIDE</Text>{top.map((row, index) => <TouchableOpacity key={`top-${index}`} onPress={() => setOpen(rows.indexOf(row))} style={st.autoRow}><View style={st.autoRank}><Text style={st.autoRankText}>{index + 1}</Text></View><View style={{ flex: 1 }}><Text style={st.autoTeam}>{row.combo.map((entry) => entry.p.species).join(' • ')}</Text><Text style={st.autoMeta}>{Math.round(row.pressureCoverage * 100)}% pressure • {Math.round(row.speedCoverage * 100)}% speed • {Math.round(row.hardCoverage * 100)}% hard pressure • {row.defensiveGaps} gap flags</Text></View></TouchableOpacity>)}</View>
      {threatGuide.supported && threatRows.length > 0 && <View style={st.threatBox}><Text style={st.threatTitle}>REMAINING-POOL THREAT GUIDE</Text><Text style={st.threatText}>{threatGuide.screenedTeams} clue-compatible Factory team combinations screened with the same scenario assumptions.</Text>{threatRows.map((row, index) => <View key={`threat-${index}`} style={st.threatRow}><Text style={st.threatRank}>{index + 1}</Text><View style={{ flex: 1 }}><Text style={st.threatTeam}>{row.combo.map((p) => `${p.species} ${p.setId ?? ''}`).join(' • ')}</Text><Text style={st.threatMeta}>{Math.round(row.dangerousShare * 100)}% direct pressure • {Math.round(row.hardShare * 100)}% 2HKO+ threat • {Math.round(row.speedShare * 100)}% faster threat</Text></View></View>)}</View>}
      <Text style={st.section}>ALL TEAM OPTIONS</Text>
      <ScrollView>{rows.map((row, index) => { const openRow = open === index; return <View key={`row-${index}`} style={st.row}><TouchableOpacity onPress={() => setOpen(openRow ? null : index)} style={st.rowButton}><View style={{ flex: 1 }}><Text style={st.rankText}>OPTION #{index + 1} • {row.combo.map((entry) => `${entry.p.species} ${entry.p.setId}`).join(' • ')}</Text><Text style={st.meta}>{row.variantCount} exact-set combinations • {Math.round(row.pressureCoverage * 100)}% pressure • {Math.round(row.speedCoverage * 100)}% speed</Text></View><Text>{openRow ? '▲' : '▼'}</Text></TouchableOpacity>{openRow && <View style={st.details}>{row.targetSummaries.map((target) => <View key={`${target.species}-${target.index}`} style={st.target}><Text style={st.targetName}>Against {target.species}</Text><Text style={st.targetMeta}>{target.pressureSets}/{row.variantCount} pressure • {target.speedSets}/{row.variantCount} faster answers • {target.hardSets}/{row.variantCount} 2HKO+ answers</Text>{target.examples.map((x) => <Text key={x} style={st.example}>• {x}</Text>)}</View>)}</View>}</View>; })}</ScrollView>
    </>}
  </View>;
}

const st = StyleSheet.create({ card:{backgroundColor:'#10231f',borderRadius:18,padding:14,marginTop:12,borderWidth:1,borderColor:'#29443d'},header:{flexDirection:'row',alignItems:'center',marginBottom:8},label:{color:'#83a69d',fontSize:10,fontWeight:'800',letterSpacing:1.2},title:{color:'#f2f7f4',fontSize:18,fontWeight:'900',marginTop:3},badge:{minWidth:32,padding:7,borderRadius:12,backgroundColor:'#1c3831',color:'#d9efe8',textAlign:'center',fontWeight:'900'},help:{color:'#a9c0ba',fontSize:12,lineHeight:18,marginBottom:10},empty:{color:'#d8b98c',fontSize:12},autoBox:{backgroundColor:'#0c1a17',borderRadius:13,padding:10,marginBottom:10},autoTitle:{color:'#9fe2c8',fontSize:11,fontWeight:'900'},autoRow:{flexDirection:'row',alignItems:'center',borderTopWidth:1,borderTopColor:'#213a34',paddingVertical:9},autoRank:{width:28,height:28,borderRadius:14,backgroundColor:'#1c3831',alignItems:'center',justifyContent:'center',marginRight:8},autoRankText:{color:'#d9efe8',fontWeight:'900'},autoTeam:{color:'#edf6f2',fontSize:12,fontWeight:'900'},autoMeta:{color:'#87aaa1',fontSize:10,lineHeight:15,marginTop:2},threatBox:{backgroundColor:'#1a2420',borderRadius:13,padding:10,marginBottom:10},threatTitle:{color:'#e6c58e',fontSize:11,fontWeight:'900'},threatText:{color:'#bdb5a2',fontSize:11,lineHeight:16,marginBottom:6},threatRow:{flexDirection:'row',paddingVertical:8,borderTopWidth:1,borderTopColor:'#3c3930'},threatRank:{color:'#f1dfb9',fontWeight:'900',width:24},threatTeam:{color:'#f0eee7',fontSize:12,fontWeight:'900'},threatMeta:{color:'#b8aa91',fontSize:10,lineHeight:15},section:{color:'#83a69d',fontSize:9,fontWeight:'900',marginTop:4},row:{borderTopWidth:1,borderTopColor:'#27423a'},rowButton:{minHeight:60,flexDirection:'row',alignItems:'center',paddingVertical:9},rankText:{color:'#edf6f2',fontSize:12,fontWeight:'800'},meta:{color:'#87aaa1',fontSize:10,marginTop:3},details:{backgroundColor:'#0c1a17',borderRadius:12,padding:10,marginBottom:8},target:{paddingVertical:6,borderTopWidth:1,borderTopColor:'#213a34'},targetName:{color:'#f0f7f4',fontWeight:'800'},targetMeta:{color:'#a7beb8',fontSize:10,lineHeight:15},example:{color:'#8bd3bb',fontSize:10,marginTop:2}});