import React, { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getFactorySets, getFactorySet } from '../data/setIdentity';
import { getStats, getNatureEffect } from '../data/damageCalc';

const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

function Sprite({ pokemon, size = 104 }) {
  const id = pokemon?.id || pokemon?.nationalDexId;
  return id ? <Image source={{ uri: `${SPRITES}${id}.png` }} style={{ width: size, height: size }} resizeMode="contain" /> : <Text style={styles.q}>?</Text>;
}

function statRows(pokemon, set, level, round) {
  if (!pokemon) return [];
  const source = set || pokemon;
  const stats = getStats(pokemon, source, level, round);
  return [['HP','hp',stats.hp],['Attack','atk',stats.atk],['Defense','def',stats.def],['Sp. Atk','spa',stats.spa],['Sp. Def','spd',stats.spd],['Speed','spe',stats.spe]];
}

function possibleSets(pokemon) {
  return getFactorySets(pokemon?.species || pokemon?.name);
}

function SetDetails({ set, pokemon, level, round }) {
  const source = set || pokemon;
  const stats = source ? getStats(source, source, level, round) : {};
  const evs = source?.evs || {};
  const moves = Array.isArray(source?.moves) ? source.moves : [];
  return <View style={styles.setCard}>
    <Text style={styles.setTitle}>{source?.species || pokemon?.species || 'UNKNOWN'} • SET {source?.id ?? source?.setId ?? '?'}</Text>
    <Text style={styles.setMeta}>Item: {source?.item || '???'}   Ability: {source?.ability || '???'}   Nature: {source?.nature || '???'}</Text>
    <Text style={styles.section}>MOVES</Text>
    <Text style={styles.body}>{moves.length ? moves.map((m) => m || '???').join('  •  ') : '???  •  ???  •  ???  •  ???'}</Text>
    <Text style={styles.section}>STATS</Text>
    <Text style={styles.body}>HP {stats.hp ?? '???'}  •  ATK {stats.atk ?? '???'}  •  DEF {stats.def ?? '???'}  •  SPA {stats.spa ?? '???'}  •  SPD {stats.spd ?? '???'}  •  SPE {stats.spe ?? '???'}</Text>
    <Text style={styles.section}>IVs / EVs</Text>
    <Text style={styles.body}>IVs: {source?.ivs ? JSON.stringify(source.ivs) : '???'}  •  EVs: {Object.keys(evs).length ? JSON.stringify(evs) : '???'}</Text>
  </View>;
}

function SummaryPage({ page, pokemon, level, round }) {
  const palette = [styles.pageOverview, styles.pageMoves, styles.pageStats, styles.pageIVs, styles.pageEVs, styles.pageSets][page];
  const sets = possibleSets(pokemon);
  const selectedSet = pokemon?.setId != null ? getFactorySet(pokemon.species, pokemon.setId) : null;
  const stats = statRows(pokemon, selectedSet, level, round);
  return <View style={[styles.page, palette]}>
    {page === 0 && <><View style={styles.hero}><Sprite pokemon={pokemon} size={128}/><View style={{ flex: 1 }}><Text style={styles.name}>{pokemon?.species || 'UNKNOWN'}</Text><Text style={styles.role}>{pokemon?.isElevated ? 'ELEVATED PICK' : 'POKÉMON SUMMARY'}</Text><Text style={styles.meta}>{pokemon?.type1 || pokemon?.types?.join(' / ') || '???'}{pokemon?.type2 ? ` / ${pokemon.type2}` : ''}</Text><Text style={styles.meta}>Level {pokemon?.level || level} • HP {stats[0]?.[2] ?? '???'}</Text></View></View><Text style={styles.section}>FACTORY SET</Text><Text style={styles.bigValue}>{selectedSet ? `SET ${selectedSet.id} — CONFIRMED` : `${sets.length || '?'} POSSIBLE SETS`}</Text><Text style={styles.body}>Item: {pokemon?.item || '???'}   Ability: {pokemon?.ability || '???'}   Nature: {pokemon?.nature || '???'}</Text></>}
    {page === 1 && <><Text style={styles.pageTitle}>MOVES</Text>{(selectedSet?.moves || pokemon?.moves || ['???','???','???','???']).map((move, i) => <View key={i} style={styles.moveRow}><Text style={styles.moveName}>{move || '???'}</Text><Text style={styles.qmark}>{move ? 'KNOWN' : '???'}</Text></View>)}</>}
    {page === 2 && <><Text style={styles.pageTitle}>BATTLE STATS</Text>{stats.map(([label, key, value]) => { const effect=getNatureEffect(selectedSet?.nature,key); return <View key={label} style={styles.statRow}><Text style={styles.statName}>{label}</Text><Text style={[styles.statValue,effect==='up'&&styles.statUp,effect==='down'&&styles.statDown]}>{value ?? '???'} {effect==='up'?'↑':effect==='down'?'↓':''}</Text></View>; })}</>}
    {page === 3 && <><Text style={styles.pageTitle}>INDIVIDUAL VALUES</Text>{['hp','atk','def','spa','spd','spe'].map((key) => <View key={key} style={styles.statRow}><Text style={styles.statName}>{key.toUpperCase()}</Text><Text style={styles.statValue}>{selectedSet?.ivs?.[key] ?? '???'}</Text></View>)}</>}
    {page === 4 && <><Text style={styles.pageTitle}>EFFORT VALUES</Text>{['hp','atk','def','spa','spd','spe'].map((key) => <View key={key} style={styles.statRow}><Text style={styles.statName}>{key.toUpperCase()}</Text><Text style={styles.statValue}>{selectedSet?.evs?.[key] ?? selectedSet?.evs?.[key.toUpperCase()] ?? '???'}</Text></View>)}</>}
    {page === 5 && <><Text style={styles.pageTitle}>FACTORY SETS</Text><Text style={styles.body}>Each remaining set is a separate possibility. Nothing here is averaged.</Text>{sets.map((set) => <SetDetails key={set.id} set={set} pokemon={pokemon} level={level} round={round}/>)}</>}
  </View>;
}

export default function PokemonInfoPanel({ visible, pokemon, kind = 'YOUR POKÉMON', level = 50, round = 1, onClose, history = false }) {
  const [summary, setSummary] = useState(false);
  const [page, setPage] = useState(0);
  const pages = 6;
  const title = pokemon?.species || 'UNKNOWN';
  const setCount = useMemo(() => possibleSets(pokemon).length, [pokemon]);
  if (!visible || !pokemon) return null;
  const previous = () => setPage(p => Math.max(0, p - 1));
  const next = () => setPage(p => Math.min(pages - 1, p + 1));
  return <View style={styles.overlay} pointerEvents="box-none">
    <View style={[styles.panel, history ? styles.panelPurple : kind.includes('OPPONENT') ? styles.panelRed : styles.panelBlue]}>
      <View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.kicker}>{kind}</Text><Text style={styles.title}>{title}</Text><Text style={styles.quickMeta}>{pokemon?.isElevated ? '↑ ELEVATED • ' : ''}{pokemon?.setId != null ? `SET ${pokemon.setId} • ` : ''}{setCount || '?'} POSSIBLE SETS</Text></View><TouchableOpacity onPress={onClose} style={styles.close}><Text style={styles.closeText}>×</Text></TouchableOpacity></View>
      {!summary ? <><View style={styles.quick}><Sprite pokemon={pokemon} size={112}/><View style={styles.quickInfo}><Text style={styles.quickLine}>Type: {pokemon?.type1 || pokemon?.types?.join(' / ') || '???'}{pokemon?.type2 ? ` / ${pokemon.type2}` : ''}</Text><Text style={styles.quickLine}>Level: {pokemon?.level || level}</Text><Text style={styles.quickLine}>HP: {pokemon?.hp ?? '???'}</Text><Text style={styles.quickLine}>Status: {pokemon?.status || 'Healthy'}</Text><Text style={styles.quickLine}>Set: {pokemon?.setId != null ? `SET ${pokemon.setId}` : '???'}</Text></View></View><View style={styles.toolRow}><TouchableOpacity onPress={() => setSummary(true)} style={styles.tool}><Text style={styles.toolText}>📋 SUMMARY</Text></TouchableOpacity><TouchableOpacity onPress={onClose} style={styles.tool}><Text style={styles.toolText}>{history ? 'REFERENCE' : 'CLOSE'}</Text></TouchableOpacity></View></> :
      <><View style={styles.summaryHead}><TouchableOpacity onPress={previous}><Text style={styles.arrow}>‹</Text></TouchableOpacity><Text style={styles.pageIndicator}>{page + 1} / {pages}</Text><TouchableOpacity onPress={next}><Text style={styles.arrow}>›</Text></TouchableOpacity></View><ScrollView showsVerticalScrollIndicator={false}><SummaryPage page={page} pokemon={pokemon} level={level} round={round}/></ScrollView><TouchableOpacity onPress={() => setSummary(false)} style={styles.back}><Text style={styles.backText}>‹ QUICK INFO</Text></TouchableOpacity></>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  overlay:{position:'absolute',top:0,left:0,right:0,bottom:0,zIndex:50,justifyContent:'center',alignItems:'flex-start',padding:10},
  panel:{width:'94%',maxHeight:'92%',borderRadius:20,borderWidth:1,padding:14,shadowOpacity:.35,shadowRadius:18,shadowOffset:{width:0,height:8},elevation:18},
  panelBlue:{backgroundColor:'#102f4a',borderColor:'#4f9bd1'},panelRed:{backgroundColor:'#4a2027',borderColor:'#d66a72'},panelPurple:{backgroundColor:'#33244a',borderColor:'#9b72c9'},
  header:{flexDirection:'row',alignItems:'center',marginBottom:8},kicker:{fontSize:9,fontWeight:'900',letterSpacing:1.4,color:'#c6d7de'},title:{fontSize:25,fontWeight:'900',color:'#fff'},quickMeta:{fontSize:9,fontWeight:'800',color:'#b9d4d0',marginTop:2},close:{width:34,height:34,borderRadius:17,backgroundColor:'rgba(0,0,0,.22)',alignItems:'center',justifyContent:'center'},closeText:{fontSize:25,color:'#fff',lineHeight:28},
  quick:{flexDirection:'row',alignItems:'center',backgroundColor:'rgba(0,0,0,.16)',borderRadius:15,padding:10},quickInfo:{flex:1,gap:5},quickLine:{fontSize:11,fontWeight:'800',color:'#f4fbf8'},toolRow:{flexDirection:'row',gap:8,marginTop:10},tool:{flex:1,borderWidth:1,borderColor:'rgba(255,255,255,.24)',borderRadius:11,padding:11,alignItems:'center'},toolText:{fontSize:10,fontWeight:'900',color:'#fff'},
  summaryHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:3},arrow:{fontSize:34,color:'#fff',paddingHorizontal:14},pageIndicator:{fontSize:10,fontWeight:'900',color:'#d9eee8',letterSpacing:1},
  page:{borderRadius:15,padding:14,minHeight:330},pageOverview:{backgroundColor:'#173b32'},pageMoves:{backgroundColor:'#31456b'},pageStats:{backgroundColor:'#5b5360'},pageIVs:{backgroundColor:'#6b536b'},pageEVs:{backgroundColor:'#72563d'},pageSets:{backgroundColor:'#3f4c3e'},
  hero:{flexDirection:'row',alignItems:'center',gap:10},name:{fontSize:24,fontWeight:'900',color:'#fff'},role:{fontSize:8,fontWeight:'900',letterSpacing:1,color:'#b9e4d4',marginTop:3},meta:{fontSize:10,color:'#d5e8e2',marginTop:3},section:{fontSize:8,fontWeight:'900',letterSpacing:1.3,color:'#b7d9ce',marginTop:14,marginBottom:4},bigValue:{fontSize:16,fontWeight:'900',color:'#fff'},body:{fontSize:10.5,lineHeight:16,color:'#e2eee9'},pageTitle:{fontSize:19,fontWeight:'900',color:'#fff',letterSpacing:.7,marginBottom:10},moveRow:{flexDirection:'row',justifyContent:'space-between',paddingVertical:11,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,.18)'},moveName:{fontSize:13,fontWeight:'900',color:'#fff'},qmark:{fontSize:8,fontWeight:'900',color:'#d7e5df'},statRow:{flexDirection:'row',justifyContent:'space-between',paddingVertical:9,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,.18)'},statName:{fontSize:11,fontWeight:'900',color:'#eef7f4'},statValue:{fontSize:14,fontWeight:'900',color:'#fff'},setCard:{backgroundColor:'rgba(0,0,0,.18)',borderRadius:11,padding:9,marginTop:8},setTitle:{fontSize:11,fontWeight:'900',color:'#fff'},setMeta:{fontSize:8.5,color:'#d5e6df',marginTop:3},back:{marginTop:8,alignItems:'center',padding:8},backText:{fontSize:9,fontWeight:'900',color:'#d9eee8'},q:{fontSize:40,color:'#fff'}
});
