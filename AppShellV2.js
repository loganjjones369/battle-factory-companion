import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getPokemon } from './data/factoryData';
import { analyzeFactoryCandidates } from './data/candidateEngine';
import ScientistClueReference from './components/ScientistClueReference';

const LEVELS = ['Open Level', 'Level 50'];
const TYPES = ['Any', 'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel'];
const STYLES = [[-1, 'Any'], [0, 'Free-spirited'], [1, 'Total preparation'], [2, 'Slow and steady'], [3, 'Endurance'], [4, 'High risk'], [5, 'Weakening'], [6, 'Unpredictable'], [7, 'Battle flow'], [8, 'Adaptable']];

function Choice({ label, selected, onPress }) { return <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[s.choice, selected && s.choiceSelected]}><Text style={[s.choiceText, selected && s.choiceTextSelected]}>{label}</Text></TouchableOpacity>; }
function Card({ eyebrow, title, children }) { return <View style={s.card}>{eyebrow && <Text style={s.eyebrow}>{eyebrow}</Text>}<Text style={s.title}>{title}</Text>{children}</View>; }
function SetRow({ set, possible = true, reason }) { return <View style={[s.setRow, !possible && s.eliminated]}><View style={s.row}><Text style={s.setName}>{set.species} {set.id}</Text><Text style={possible ? s.possible : s.reason}>{possible ? 'POSSIBLE' : 'ELIMINATED'}</Text></View><Text style={s.meta}>{set.item} • {set.nature} • {set.ability}</Text><Text style={s.meta}>{set.moves.join(' • ')}</Text>{!possible && <Text style={s.reasonText}>{reason}</Text>}</View>; }

export default function AppShellV2() {
  const [levelMode, setLevelMode] = useState('Open Level');
  const [round, setRound] = useState('1');
  const [draft, setDraft] = useState(['', '', '', '', '', '']);
  const [scientistStyle, setScientistStyle] = useState(-1);
  const [scientistType, setScientistType] = useState('Any');
  const [observedSpecies, setObservedSpecies] = useState('');
  const [observedItem, setObservedItem] = useState('');
  const [observedMoves, setObservedMoves] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [busy, setBusy] = useState(false);

  const recognizedDraft = useMemo(() => draft.map(getPokemon).filter(Boolean), [draft]);
  const setDraftSlot = (index, value) => setDraft((current) => current.map((x, i) => i === index ? value : x));
  const clue = { type: scientistType === 'Any' ? undefined : scientistType, style: scientistStyle < 0 ? undefined : scientistStyle };

  const runAnalysis = () => {
    setBusy(true);
    setTimeout(() => {
      const result = analyzeFactoryCandidates({
        draft: recognizedDraft,
        scientist: clue,
        levelMode,
        round,
        revealed: observedSpecies ? { species: observedSpecies, item: observedItem, moves: observedMoves.split(',').map((x) => x.trim()).filter(Boolean) } : {},
      });
      setAnalysis(result);
      setSelectedSpecies(result.possibleSpecies[0]?.pokemon?.name || null);
      setBusy(false);
    }, 30);
  };

  const selected = analysis?.possibleSpecies.find((x) => x.pokemon.name === selectedSpecies);

  return <SafeAreaView style={s.safe}><StatusBar style="light" /><ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
    <View style={s.header}><Text style={s.brand}>POKÉMON EMERALD</Text><Text style={s.hero}>BATTLE FACTORY</Text><Text style={s.subhero}>COMPANION</Text><Text style={s.copy}>Exact set-level Factory analysis, built to work offline.</Text></View>

    <Card eyebrow="SETUP" title="Battle setup"><Text style={s.label}>Level</Text><View style={s.wrap}>{LEVELS.map((x) => <Choice key={x} label={x} selected={levelMode === x} onPress={() => setLevelMode(x)} />)}</View><Text style={s.label}>Current round</Text><TextInput value={round} onChangeText={setRound} keyboardType="number-pad" style={s.input} /></Card>

    <Card eyebrow="YOUR SIX" title="Draft / blocked Pokémon"><Text style={s.helper}>For the first battle, these six species are unavailable to the opponent. Later we will switch this automatically to your current 3 + the previous opponent's 3.</Text>{draft.map((name, i) => <View style={s.inputRow} key={i}><Text style={s.slot}>{i + 1}</Text><TextInput value={name} onChangeText={(v) => setDraftSlot(i, v)} placeholder="Pokémon" placeholderTextColor="#647383" autoCapitalize="words" style={s.input} /></View>)}</Card>

    <Card eyebrow="SCIENTIST" title="Trainer clue"><Text style={s.label}>Preferred type</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horizontal}>{TYPES.map((x) => <Choice key={x} label={x} selected={scientistType === x} onPress={() => setScientistType(x)} />)}</ScrollView><Text style={s.label}>Battle style</Text><View style={s.wrap}>{STYLES.map(([id, label]) => <Choice key={id} label={label} selected={scientistStyle === id} onPress={() => setScientistStyle(id)} />)}</View><View style={s.reference}><ScientistClueReference value={scientistStyle < 0 ? 0 : scientistStyle} onChange={setScientistStyle} /></View></Card>

    <Card eyebrow="BATTLE EVIDENCE" title="What have you seen?"><Text style={s.helper}>Enter an observed opponent to narrow the exact sets. Item Clause will then eliminate that held item from its teammates.</Text><Text style={s.label}>Observed Pokémon</Text><TextInput value={observedSpecies} onChangeText={setObservedSpecies} placeholder="e.g. Suicune" placeholderTextColor="#647383" autoCapitalize="words" style={s.input} /><Text style={s.label}>Observed item</Text><TextInput value={observedItem} onChangeText={setObservedItem} placeholder="e.g. Lum Berry" placeholderTextColor="#647383" autoCapitalize="words" style={s.input} /><Text style={s.label}>Observed moves</Text><TextInput value={observedMoves} onChangeText={setObservedMoves} placeholder="e.g. Surf, Calm Mind" placeholderTextColor="#647383" style={s.input} /><Text style={s.helper}>Separate multiple moves with commas.</Text></Card>

    <TouchableOpacity style={s.primary} onPress={runAnalysis} disabled={busy} activeOpacity={0.85}><Text style={s.primaryText}>{busy ? 'ANALYZING FACTORY...' : 'FIND WHAT CAN STILL BE AHEAD'}</Text><Text style={s.primarySub}>{recognizedDraft.length}/6 draft slots recognized</Text></TouchableOpacity>

    {analysis && <Card eyebrow="FACTORY INTELLIGENCE" title="What can still be ahead?"><View style={s.summary}><Text style={s.summaryBig}>{analysis.possibleSpecies.length}</Text><Text style={s.summaryLabel}>possible species</Text><Text style={s.summarySmall}>{analysis.matchingTeams.toLocaleString()} legal teams match the current clues and evidence.</Text><Text style={s.summarySmall}>Round bucket {analysis.roundBucket} • Exact possibility search</Text></View><Text style={s.label}>Possible Pokémon</Text><View style={s.wrap}>{analysis.possibleSpecies.map((row) => <TouchableOpacity key={row.pokemon.name} onPress={() => setSelectedSpecies(row.pokemon.name)} style={[s.speciesChip, selectedSpecies === row.pokemon.name && s.speciesSelected]}><Text style={s.speciesName}>{row.pokemon.name}</Text><Text style={s.speciesCount}>{row.possible.length} sets</Text></TouchableOpacity>)}</View>{selected && <View style={s.details}><View style={s.row}><Text style={s.detailTitle}>{selected.pokemon.name}</Text><Text style={s.detailCount}>{selected.possible.length} possible</Text></View><Text style={s.helper}>Tap a Pokémon above to inspect its remaining sets.</Text>{selected.possible.map((set) => <SetRow key={`${set.species}-${set.id}`} set={set} />)}{selected.eliminated.length > 0 && <><Text style={s.elimHeader}>Eliminated sets</Text>{selected.eliminated.map(({ set, reason }) => <SetRow key={`e-${set.species}-${set.id}`} set={set} possible={false} reason={reason} />)}</>}</View>}</Card>}

    <Text style={s.footer}>Battle Factory Companion • exact candidate engine v0.6.0</Text>
  </ScrollView></SafeAreaView>;
}

const s = StyleSheet.create({ safe:{flex:1,backgroundColor:'#071018'}, container:{padding:16,paddingBottom:48}, header:{paddingTop:18,paddingBottom:20}, brand:{color:'#77c9f2',fontSize:11,fontWeight:'900',letterSpacing:2}, hero:{color:'#f6fbff',fontSize:31,fontWeight:'900',marginTop:6}, subhero:{color:'#a9bfd0',fontSize:19,fontWeight:'800'}, copy:{color:'#7e91a2',fontSize:13,lineHeight:19,marginTop:9}, card:{backgroundColor:'#111b25',borderRadius:20,padding:16,marginBottom:13,borderWidth:1,borderColor:'#253441'}, eyebrow:{color:'#63b7e8',fontSize:10,fontWeight:'900',letterSpacing:1.7,marginBottom:5}, title:{color:'#f5f8fb',fontSize:19,fontWeight:'900',marginBottom:12}, label:{color:'#a9b7c4',fontSize:12,fontWeight:'800',marginTop:12,marginBottom:7}, helper:{color:'#7f8f9e',fontSize:12,lineHeight:18}, wrap:{flexDirection:'row',flexWrap:'wrap',gap:7}, horizontal:{gap:7,paddingBottom:3}, choice:{backgroundColor:'#0b141c',borderWidth:1,borderColor:'#2a3947',borderRadius:12,paddingVertical:9,paddingHorizontal:11}, choiceSelected:{backgroundColor:'#1e4053',borderColor:'#70c8f2'}, choiceText:{color:'#94a5b4',fontSize:11,fontWeight:'800'}, choiceTextSelected:{color:'#f4fbff'}, inputRow:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8}, slot:{width:30,height:42,borderRadius:10,backgroundColor:'#203342',color:'#a9dbf4',textAlign:'center',textAlignVertical:'center',paddingTop:11,fontWeight:'900'}, input:{flex:1,backgroundColor:'#09131b',borderWidth:1,borderColor:'#293947',borderRadius:12,color:'#f5f8fb',paddingHorizontal:12,paddingVertical:10,fontSize:14,fontWeight:'700'}, reference:{marginTop:12}, primary:{backgroundColor:'#1e718f',borderRadius:18,padding:16,marginBottom:13,borderWidth:1,borderColor:'#65c5e8'}, primaryText:{color:'#fff',fontSize:13,fontWeight:'900',letterSpacing:1}, primarySub:{color:'#c2e9f6',fontSize:11,marginTop:4}, summary:{backgroundColor:'#0b141c',borderRadius:15,padding:14,borderWidth:1,borderColor:'#293846'}, summaryBig:{color:'#f7fbff',fontSize:30,fontWeight:'900'}, summaryLabel:{color:'#9fb2c2',fontSize:12,fontWeight:'800'}, summarySmall:{color:'#728393',fontSize:11,marginTop:6,lineHeight:16}, speciesChip:{backgroundColor:'#162530',borderWidth:1,borderColor:'#2b3d4a',borderRadius:14,paddingVertical:9,paddingHorizontal:11,minWidth:90}, speciesSelected:{backgroundColor:'#23475a',borderColor:'#73c9ee'}, speciesName:{color:'#eaf4fa',fontWeight:'900',fontSize:12}, speciesCount:{color:'#8ca1b0',fontSize:10,marginTop:2}, details:{marginTop:15}, detailTitle:{color:'#f5f8fb',fontSize:18,fontWeight:'900'}, detailCount:{color:'#75c9ed',fontSize:12,fontWeight:'900'}, row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}, setRow:{backgroundColor:'#0b141c',borderRadius:13,padding:12,marginTop:8,borderWidth:1,borderColor:'#253542'}, eliminated:{opacity:0.7,borderColor:'#51373a'}, setName:{color:'#eef7fb',fontSize:13,fontWeight:'900'}, possible:{color:'#74d6a2',fontSize:9,fontWeight:'900'}, reason:{color:'#d59b9b',fontSize:9,fontWeight:'900'}, meta:{color:'#8496a5',fontSize:10,lineHeight:16,marginTop:4}, reasonText:{color:'#b98282',fontSize:10,lineHeight:15,marginTop:6}, elimHeader:{color:'#b7c1ca',fontSize:11,fontWeight:'900',marginTop:18,letterSpacing:1}, footer:{color:'#536575',fontSize:10,textAlign:'center',marginTop:8}
});
