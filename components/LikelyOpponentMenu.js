import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { analyzeFactoryCandidates } from '../data/candidateEngine';
import { getStats } from '../data/damageCalc';
import { getPokemon } from '../data/factoryData';
import { explainSetAgainstScientist } from '../data/scientistContribution';

const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const norm = (v) => String(v || '').trim().toLowerCase();
const setKey = (set) => `${norm(set?.species)}#${set?.id ?? set?.setId ?? set?.sourceId ?? ''}`;
const moveNames = (set) => (set?.moves || []).map((m) => typeof m === 'string' ? m : m?.name).filter(Boolean);
const spriteIdForSpecies = (species) => getPokemon(species)?.id || getPokemon(species)?.nationalDexId || 0;
function percent(value) { return `${Math.max(0, Math.min(100, value)).toFixed(value >= 10 ? 0 : 1)}%`; }
function observationFingerprint(observations = []) { return observations.map((o) => `${norm(o?.species)}|${norm(o?.item)}|${(o?.moves || []).map(norm).join(',')}`).join('||'); }

function scientistInsight(set, scientist, rankedSets, matchingTeams) {
  if (!set || !scientist || scientist.style == null) return null;
  return explainSetAgainstScientist(set, scientist, rankedSets.map((entry) => entry.set), matchingTeams || []);
}
function scientistLine(set, scientist, rankedSets, matchingTeams) {
  const insight = scientistInsight(set, scientist, rankedSets, matchingTeams);
  if (!insight?.text) return null;
  if (insight.status === 'contributor') return `Scientist: direct ${insight.contribution.target.count}/${insight.contribution.target.required} contribution.`;
  if (insight.status === 'needs-partners') return `Scientist: survives with ${insight.teamEvidence.partnerPairCount} compatible partner pair${insight.teamEvidence.partnerPairCount === 1 ? '' : 's'}.`;
  if (insight.status === 'surviving-team') return 'Scientist: survives through complete-team evidence.';
  return `Scientist: ${insight.text}`;
}
function scientistDetail(insight) {
  if (!insight) return null;
  if (insight.status === 'contributor') return `DIRECT CONTRIBUTOR • ${insight.contribution.target.count}/${insight.contribution.target.required} moves support the Scientist style.`;
  if (insight.status === 'needs-partners') return `NEEDS PARTNERS • ${insight.teamEvidence.partnerPairCount} compatible partner pair${insight.teamEvidence.partnerPairCount === 1 ? '' : 's'} keep this set alive.`;
  if (insight.status === 'surviving-team') return `COMPLETE-TEAM SURVIVOR • ${insight.teamEvidence.compatibleTeamCount} Scientist-compatible team${insight.teamEvidence.compatibleTeamCount === 1 ? '' : 's'} contain this set.`;
  if (insight.status === 'neutral') return 'NEUTRAL • The Scientist clue does not narrow this set directly.';
  return `SCIENTIST EVIDENCE • ${insight.text}`;
}

export default function LikelyOpponentMenu({ draft = [], scientist = {}, levelMode = 'Open Level', battle = 1, blockedSpecies = [], observations = [], currentTeam = [], previousOpponent = [], noland = false }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [selectedSet, setSelectedSet] = useState(null);
  const [radarUpdated, setRadarUpdated] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;
  const firstFingerprint = useRef(null);
  const fingerprint = observationFingerprint(observations);
  const result = useMemo(() => analyzeFactoryCandidates({ draft, scientist, levelMode, battle, blockedSpecies, revealed: { observations }, currentTeam, previousOpponent, noland }), [draft, scientist, levelMode, battle, blockedSpecies, observations, currentTeam, previousOpponent, noland]);

  useEffect(() => {
    if (firstFingerprint.current === null) { firstFingerprint.current = fingerprint; return; }
    if (firstFingerprint.current === fingerprint) return;
    firstFingerprint.current = fingerprint;
    setRadarUpdated(true);
    pulse.setValue(1.08);
    Animated.sequence([
      Animated.timing(pulse, { toValue: 0.94, duration: 90, useNativeDriver: true }),
      Animated.spring(pulse, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(() => setRadarUpdated(false), 1200);
    return () => clearTimeout(timer);
  }, [fingerprint, pulse]);

  const likely = useMemo(() => {
    const entries = result.rankedSets || [];
    const total = entries.reduce((sum, entry) => sum + (Number(entry.frequency) || 0), 0) || 1;
    const bySpecies = new Map();
    entries.forEach((entry) => {
      const set = entry.set;
      const species = set?.species;
      if (!species) return;
      const key = norm(species);
      if (!bySpecies.has(key)) bySpecies.set(key, { species, sets: [], weight: 0 });
      const group = bySpecies.get(key);
      group.sets.push(entry);
      group.weight += Number(entry.frequency) || 0;
    });
    return [...bySpecies.values()]
      .sort((a, b) => b.weight - a.weight)
      .map((group) => ({ ...group, share: (group.weight / total) * 100, sets: group.sets.sort((a, b) => (Number(b.frequency) || 0) - (Number(a.frequency) || 0)) }));
  }, [result.rankedSets]);

  if (!observations.length || !result.supported || !likely.length) return null;
  const top = likely.slice(0, 3);
  const selectedGroup = selectedSpecies ? likely.find((group) => norm(group.species) === norm(selectedSpecies)) : null;
  const detailSet = selectedSet?.set;
  const detailPokemon = detailSet ? getPokemon(detailSet.species) : null;
  const detailRound = Math.max(1, Math.ceil(Number(battle) / 7));
  const detailLevel = Number(detailSet?.level || (levelMode === 'Open Level' ? 100 : 50));
  const detail = detailSet && detailPokemon?.baseStats && detailSet?.evs ? getStats(detailPokemon, detailSet, detailLevel, detailRound) : null;
  const detailScientist = scientistInsight(detailSet, scientist, result.rankedSets || [], result.matchingTeams || []);
  const detailScientistText = scientistDetail(detailScientist);

  return <>
    <Animated.View style={[styles.card, { transform: [{ scale: pulse }] }]}>
      <Pressable onPress={() => setExpanded((value) => !value)} style={styles.compact}>
        <View style={styles.kickerBox}><View style={styles.kickerRow}><Text style={styles.kicker}>LIKELY NEXT</Text>{radarUpdated && <View style={styles.liveDot} />}</View><Text style={styles.sub}>{radarUpdated ? 'RADAR UPDATED' : 'tap to expand'}</Text></View>
        <View style={styles.topRow}>{top.map((group) => <Pressable key={norm(group.species)} onPress={(event) => { event.stopPropagation?.(); setSelectedSpecies(group.species); }} style={styles.topPokemon}><View style={styles.spriteCircle}><Image source={{ uri: `${SPRITES}${spriteIdForSpecies(group.species)}.png` }} style={styles.sprite} /></View><Text numberOfLines={1} style={styles.name}>{group.species}</Text></Pressable>)}</View>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>
      {expanded && <View style={styles.expanded}>
        <Text style={styles.title}>MOST LIKELY REMAINING</Text>
        <Text style={styles.note}>Updates automatically whenever a new species, item, or move clue is entered. Share = surviving candidate-set frequency, not a guaranteed in-game probability.</Text>
        <ScrollView style={styles.list} nestedScrollEnabled>{likely.map((group) => <Pressable key={norm(group.species)} onPress={() => setSelectedSpecies(group.species)} style={styles.row}>
          <Image source={{ uri: `${SPRITES}${spriteIdForSpecies(group.species)}.png` }} style={styles.listSprite} />
          <View style={styles.info}><Text style={styles.species}>{group.species}</Text><View style={styles.setLine}>{group.sets.slice(0, 8).map((entry) => <Text key={setKey(entry.set)} style={styles.setNumber}>{entry.set?.id}</Text>)}{group.sets.length > 8 && <Text style={styles.more}>+{group.sets.length - 8}</Text>}</View></View>
          <Text style={styles.percent}>{percent(group.share)}</Text>
        </Pressable>)}</ScrollView>
      </View>}
    </Animated.View>

    <Modal visible={!!selectedSpecies && !selectedSet} transparent animationType="fade" onRequestClose={() => setSelectedSpecies(null)}>
      <Pressable style={styles.modalBackdrop} onPress={() => setSelectedSpecies(null)}><Pressable style={styles.modal} onPress={() => {}}>
        <View style={styles.modalHeader}><View style={{ flex: 1 }}><Text style={styles.kicker}>SURVIVING SETS</Text><Text style={styles.modalTitle}>{selectedGroup?.species}</Text></View><Pressable onPress={() => setSelectedSpecies(null)} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable></View>
        <View style={styles.speciesHero}><Image source={{ uri: `${SPRITES}${spriteIdForSpecies(selectedGroup?.species)}.png` }} style={styles.heroSprite} /><View style={{ flex: 1 }}><Text style={styles.heroCount}>{selectedGroup?.sets.length || 0} possible sets remain</Text><Text style={styles.inspectMeta}>{percent(selectedGroup?.share || 0)} of the surviving ranked candidates</Text></View></View>
        <Text style={styles.movesTitle}>TAP A SET TO INSPECT</Text>
        <ScrollView style={styles.setList}>{(selectedGroup?.sets || []).map((entry) => { const line = scientistLine(entry.set, scientist, result.rankedSets || [], result.matchingTeams || []); return <Pressable key={setKey(entry.set)} onPress={() => setSelectedSet(entry)} style={styles.setRow}><View style={styles.setBadge}><Text style={styles.setBadgeText}>{entry.set?.id}</Text></View><View style={{ flex: 1 }}><Text style={styles.setName}>{entry.set?.species} {entry.set?.id}</Text><Text style={styles.setMeta}>{entry.set?.item || 'Unknown item'} • {entry.set?.nature || 'Nature unknown'} • {moveNames(entry.set).slice(0, 2).join(', ')}{moveNames(entry.set).length > 2 ? '…' : ''}</Text>{line && <Text style={styles.scientistLine}>{line}</Text>}</View><Text style={styles.setArrow}>›</Text></Pressable>; })}</ScrollView>
        <Pressable onPress={() => setSelectedSpecies(null)} style={styles.done}><Text style={styles.doneText}>BACK TO BATTLE</Text></Pressable>
      </Pressable></Pressable>
    </Modal>

    <Modal visible={!!selectedSet} transparent animationType="fade" onRequestClose={() => setSelectedSet(null)}>
      <Pressable style={styles.modalBackdrop} onPress={() => setSelectedSet(null)}><Pressable style={styles.modal} onPress={() => {}}>
        <View style={styles.modalHeader}><View style={{ flex: 1 }}><Text style={styles.kicker}>SET INSPECTOR</Text><Text style={styles.modalTitle}>{detailSet?.species} {detailSet?.id}</Text></View><Pressable onPress={() => setSelectedSet(null)} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable></View>
        <View style={styles.inspectRow}><Image source={{ uri: `${SPRITES}${spriteIdForSpecies(detailSet?.species)}.png` }} style={styles.inspectSprite} /><View style={{ flex: 1 }}><Text style={styles.inspectMeta}>{detailSet?.item || 'Unknown item'}</Text><Text style={styles.inspectMeta}>{detailSet?.nature || 'Nature unknown'} • {detailSet?.ability || 'Ability unknown'}</Text>{detail ? <Text style={styles.inspectMeta}>HP {detail.hp} • Atk {detail.atk} • Def {detail.def} • SpA {detail.spa} • SpD {detail.spd} • Spe {detail.spe}</Text> : null}</View></View>
        {detailScientistText && <View style={styles.scientistBox}><Text style={styles.scientistLabel}>SCIENTIST EVIDENCE</Text><Text style={styles.scientistDetail}>{detailScientistText}</Text></View>}
        <Text style={styles.movesTitle}>MOVES</Text>{moveNames(detailSet).map((move) => <Text key={move} style={styles.move}>• {move}</Text>)}
        <Pressable onPress={() => setSelectedSet(null)} style={styles.done}><Text style={styles.doneText}>BACK TO SETS</Text></Pressable>
      </Pressable></Pressable></Modal>
  </>;
}

const styles = StyleSheet.create({
  card:{backgroundColor:'#11251f',borderRadius:14,borderWidth:1,borderColor:'#35564b',marginTop:9,overflow:'hidden'}, compact:{minHeight:70,padding:8,flexDirection:'row',alignItems:'center'}, kickerBox:{width:92}, kickerRow:{flexDirection:'row',alignItems:'center'}, kicker:{fontSize:8.5,fontWeight:'900',letterSpacing:1,color:'#a9d5c5'}, liveDot:{width:6,height:6,borderRadius:3,backgroundColor:'#9fe2c8',marginLeft:5}, sub:{fontSize:8,color:'#78978e',marginTop:2}, topRow:{flex:1,flexDirection:'row',justifyContent:'center',gap:13}, topPokemon:{alignItems:'center',width:66}, spriteCircle:{width:42,height:42,borderRadius:21,backgroundColor:'#203a32',alignItems:'center',justifyContent:'center'}, sprite:{width:42,height:42}, name:{fontSize:8.5,fontWeight:'800',color:'#dcece6',marginTop:2}, chevron:{width:18,textAlign:'right',fontSize:11,color:'#8db8a9'}, expanded:{paddingHorizontal:9,paddingBottom:9,borderTopWidth:1,borderTopColor:'#29473d'}, title:{fontSize:9,fontWeight:'900',letterSpacing:.9,color:'#b9ddcf',marginTop:8}, note:{fontSize:8.5,color:'#7f9e95',lineHeight:13,marginTop:3}, list:{maxHeight:310,marginTop:5}, row:{minHeight:54,flexDirection:'row',alignItems:'center',borderTopWidth:1,borderTopColor:'#29473d'}, listSprite:{width:46,height:46}, info:{flex:1}, species:{fontSize:12,fontWeight:'900',color:'#edf7f2'}, setLine:{flexDirection:'row',flexWrap:'wrap',gap:4,marginTop:3}, setNumber:{fontSize:8,fontWeight:'900',color:'#c9e4da',backgroundColor:'#29483e',paddingHorizontal:5,paddingVertical:2,borderRadius:5}, more:{fontSize:8,color:'#78978e',paddingTop:2}, percent:{width:42,textAlign:'right',fontSize:11,fontWeight:'900',color:'#a9d5c5'}, modalBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,.72)',justifyContent:'center',padding:16}, modal:{backgroundColor:'#122720',borderRadius:16,borderWidth:1,borderColor:'#47665b',padding:12,maxHeight:'82%'}, modalHeader:{flexDirection:'row',alignItems:'center'}, modalTitle:{fontSize:20,fontWeight:'900',color:'#f0f7f3',marginTop:2}, close:{width:34,height:34,borderRadius:17,backgroundColor:'#29463d',alignItems:'center',justifyContent:'center'}, closeText:{fontSize:24,color:'#d7ebe4',lineHeight:28}, speciesHero:{flexDirection:'row',alignItems:'center',marginTop:8,padding:8,borderRadius:10,backgroundColor:'#1d3930'}, heroSprite:{width:70,height:70}, heroCount:{fontSize:13,fontWeight:'900',color:'#edf7f2'}, inspectRow:{flexDirection:'row',alignItems:'center',marginTop:9,padding:8,borderRadius:10,backgroundColor:'#1d3930'}, inspectSprite:{width:82,height:82}, inspectMeta:{fontSize:10,color:'#bcd2ca',lineHeight:16}, scientistBox:{marginTop:8,padding:8,borderRadius:9,backgroundColor:'#1b352d',borderWidth:1,borderColor:'#36584c'}, scientistLabel:{fontSize:8,fontWeight:'900',letterSpacing:.8,color:'#8fb5a8'}, scientistDetail:{fontSize:9.5,fontWeight:'800',color:'#c5ded5',lineHeight:14,marginTop:2}, movesTitle:{fontSize:9,fontWeight:'900',letterSpacing:.9,color:'#8fb5a8',marginTop:10}, setList:{marginTop:5,maxHeight:300}, setRow:{minHeight:54,flexDirection:'row',alignItems:'center',borderTopWidth:1,borderTopColor:'#29473d',paddingVertical:5}, setBadge:{width:34,height:34,borderRadius:8,backgroundColor:'#31564a',alignItems:'center',justifyContent:'center',marginRight:8}, setBadgeText:{fontSize:12,fontWeight:'900',color:'#eff8f4'}, setName:{fontSize:11.5,fontWeight:'900',color:'#edf7f2'}, setMeta:{fontSize:9.5,color:'#9fbab1',marginTop:2}, scientistLine:{fontSize:8.5,color:'#b9ddcf',marginTop:3,lineHeight:12}, setArrow:{fontSize:22,color:'#78978e',paddingHorizontal:4}, move:{fontSize:11,color:'#e0eee9',marginTop:4}, done:{marginTop:13,backgroundColor:'#31564a',borderRadius:9,paddingVertical:10,alignItems:'center'}, doneText:{fontSize:10,fontWeight:'900',letterSpacing:.7,color:'#eff8f4'},
});
