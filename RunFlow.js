import React, { useMemo, useRef, useState } from 'react';
import { Animated, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getPokemon } from './data/factoryData';
import { createRun, completeBattle } from './data/runProgress';

const LEVELS = ['Open Level', 'Level 50'];

function Card({ eyebrow, title, children }) {
  return <View style={s.card}>{eyebrow ? <Text style={s.eyebrow}>{eyebrow}</Text> : null}<Text style={s.title}>{title}</Text>{children}</View>;
}

function Button({ label, sub, onPress, secondary = false, disabled = false }) {
  return <TouchableOpacity disabled={disabled} onPress={onPress} activeOpacity={0.82} style={[s.button, secondary && s.buttonSecondary, disabled && s.buttonDisabled]}><Text style={s.buttonText}>{label}</Text>{sub ? <Text style={s.buttonSub}>{sub}</Text> : null}</TouchableOpacity>;
}

function PartyCard({ pokemon, selected, onPress }) {
  const name = pokemon?.species || pokemon?.name || String(pokemon || '');
  return <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[s.partyCard, selected && s.partySelected]}><View style={s.sprite}><Text style={s.spriteText}>{name.slice(0, 1)}</Text></View><Text style={s.partyName}>{name}</Text><Text style={s.partyMeta}>{pokemon?.id ? `Set ${pokemon.id}` : 'Pokémon'}</Text></TouchableOpacity>;
}

function parseTeam(values) {
  return values.map(getPokemon).filter(Boolean);
}

export default function RunFlow() {
  const [level, setLevel] = useState('Level 50');
  const [startBattle, setStartBattle] = useState('1');
  const [startSwaps, setStartSwaps] = useState('0');
  const [draftText, setDraftText] = useState(['', '', '', '', '', '']);
  const [currentText, setCurrentText] = useState(['', '', '']);
  const [previousText, setPreviousText] = useState(['', '', '']);
  const [state, setState] = useState(null);
  const [phase, setPhase] = useState('setup');
  const [defeated, setDefeated] = useState([]);
  const [swapChoice, setSwapChoice] = useState(null);
  const [replaceChoice, setReplaceChoice] = useState(null);
  const [celebration, setCelebration] = useState(null);
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const draft = useMemo(() => parseTeam(draftText), [draftText]);
  const current = useMemo(() => parseTeam(currentText), [currentText]);
  const previous = useMemo(() => parseTeam(previousText), [previousText]);

  const setSlot = (setter, index, value) => setter((old) => old.map((x, i) => i === index ? value : x));

  const begin = () => {
    const battle = Math.max(1, Number(startBattle) || 1);
    const swaps = Math.max(0, Number(startSwaps) || 0);
    const initialTeam = current.length === 3 ? current : draft.slice(0, 3);
    const next = createRun({ level, battle, swaps, currentTeam: initialTeam, previousOpponent: previous, draft });
    setState(next);
    setCurrentText(initialTeam.map((p) => p.species || p.name));
    setPhase('research');
  };

  const celebrate = (info) => {
    setCelebration(info);
    scale.setValue(0.7);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 12 }),
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start(() => setTimeout(() => Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setCelebration(null)), info.durationMs - 340));
  };

  const finishBattle = () => {
    if (!state || current.length !== 3 || defeated.length !== 3) return;
    let nextTeam = current;
    if (swapChoice && replaceChoice) {
      nextTeam = current.map((p) => p.species === swapChoice.species ? replaceChoice : p);
    }
    const result = completeBattle(state, { won: true, nextCurrentTeam: nextTeam, defeatedOpponent: defeated });
    if (result.state.progressionError) return;
    setState(result.state);
    setCurrentText(nextTeam.map((p) => p.species || p.name));
    setPreviousText(defeated.map((p) => p.species || p.name));
    setDefeated([]);
    setSwapChoice(null);
    setReplaceChoice(null);
    setPhase('research');
    celebrate(result.celebration);
  };

  const swapElevation = state?.swapElevation ?? 0;
  const round = state?.round ?? 1;
  const battle = state?.battle ?? 1;
  const milestone = battle > 1 && (battle - 1) % 7 === 0;

  if (phase === 'setup') {
    return <SafeAreaView style={s.safe}><StatusBar style="light" /><ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled"><Header title="START A FACTORY RUN" sub="Save-state friendly. Start at any battle and any swap count." />
      <Card eyebrow="LEVEL" title="Battle format"><View style={s.wrap}>{LEVELS.map((x) => <TouchableOpacity key={x} onPress={() => setLevel(x)} style={[s.choice, level === x && s.choiceSelected]}><Text style={s.choiceText}>{x}</Text></TouchableOpacity>)}</View></Card>
      <Card eyebrow="CONTINUE A SAVE STATE" title="Starting position"><Text style={s.label}>Starting battle</Text><TextInput value={startBattle} onChangeText={setStartBattle} keyboardType="number-pad" style={s.input} /><Text style={s.helper}>This can be 1, 28, 35, 42, or any other battle number.</Text><Text style={s.label}>Starting swap count</Text><TextInput value={startSwaps} onChangeText={setStartSwaps} keyboardType="number-pad" style={s.input} /><Text style={s.helper}>The app uses this to determine the current swap elevation.</Text></Card>
      <Card eyebrow="CURRENT TEAM" title="Optional save-state team">{currentText.map((x, i) => <TextInput key={i} value={x} onChangeText={(v) => setSlot(setCurrentText, i, v)} placeholder={`Current Pokémon ${i + 1}`} placeholderTextColor="#647383" style={s.input} />)}</Card>
      <Card eyebrow="PREVIOUS OPPONENT" title="Optional save-state history">{previousText.map((x, i) => <TextInput key={i} value={x} onChangeText={(v) => setSlot(setPreviousText, i, v)} placeholder={`Previous opponent ${i + 1}`} placeholderTextColor="#647383" style={s.input} />)}</Card>
      <Card eyebrow="DRAFT" title="Six Pokémon seen">{draftText.map((x, i) => <View key={i} style={s.inputRow}><Text style={s.slot}>{i + 1}</Text><TextInput value={x} onChangeText={(v) => setSlot(setDraftText, i, v)} placeholder="Pokémon" placeholderTextColor="#647383" style={s.input} /></View>)}</Card>
      <Button label="START RUN" sub="Build the exact battle-state object" onPress={begin} />
      <Text style={s.footer}>Battle Factory Companion • run engine v0.8.0</Text>
    </ScrollView></SafeAreaView>;
  }

  return <SafeAreaView style={s.safe}><StatusBar style="light" /><ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled"><Header title={`BATTLE ${battle}`} sub={`Round ${round} • ${level} • ${state?.swaps ?? 0} swaps • elevation ${swapElevation}`} />
    {milestone ? <View style={s.milestone}><Text style={s.milestoneStars}>✦ ✧ ✦</Text><Text style={s.milestoneTitle}>ROUND COMPLETE</Text><Text style={s.milestoneSub}>Battle {battle - 1} finished — research for the next round.</Text></View> : null}
    <Card eyebrow="RUN STATUS" title="Factory memory"><View style={s.statusGrid}><Stat label="BATTLE" value={battle} /><Stat label="ROUND" value={round} /><Stat label="SWAPS" value={state?.swaps ?? 0} /><Stat label="ELEVATION" value={swapElevation} /></View><Text style={s.helper}>Blocked species: {state?.blockedSpecies?.length ? state.blockedSpecies.join(', ') : 'none recorded yet'}</Text></Card>
    <Card eyebrow="YOUR TEAM" title="Active party"><View style={s.partyRow}>{current.map((p, i) => <PartyCard key={`${p.species}-${i}`} pokemon={p} selected={swapChoice?.species === p.species} onPress={() => phase === 'swap' && setSwapChoice(p)} />)}</View></Card>
    {phase === 'research' && <Card eyebrow="RESEARCH PHASE" title="Record the opponent"><Text style={s.helper}>Enter the three opponent species you just fought. This becomes the previous-opponent block for the next battle.</Text>{[0,1,2].map((i) => <TextInput key={i} value={defeated[i]?.species || ''} onChangeText={(v) => setDefeated((old) => { const next = [...old]; next[i] = getPokemon(v) || { species: v }; return next; })} placeholder={`Opponent ${i + 1}`} placeholderTextColor="#647383" style={s.input} />)}<Button label="I WON — CHOOSE TEAM" sub="One swap maximum" onPress={() => setPhase('swap')} disabled={defeated.length !== 3 || defeated.some((p) => !p?.species)} /></Card>}
    {phase === 'swap' && <Card eyebrow="POST-BATTLE" title="Keep team or swap one"><Text style={s.helper}>Choose KEEP TEAM, or tap one current Pokémon and one defeated opponent to perform exactly one swap.</Text><View style={s.swapBanner}><Text style={s.swapBannerTitle}>{swapChoice && replaceChoice ? 'ONE SWAP SELECTED' : 'OPTIONAL SWAP'}</Text><Text style={s.swapBannerText}>{swapChoice && replaceChoice ? `${swapChoice.species} → ${replaceChoice.species}` : 'No swap selected'}</Text></View><Text style={s.label}>Your Pokémon to replace</Text><View style={s.partyRow}>{current.map((p, i) => <PartyCard key={`${p.species}-${i}`} pokemon={p} selected={swapChoice?.species === p.species} onPress={() => setSwapChoice(p)} />)}</View><Text style={s.label}>Opponent Pokémon to take</Text><View style={s.partyRow}>{defeated.map((p, i) => <PartyCard key={`${p.species}-${i}`} pokemon={p} selected={replaceChoice?.species === p.species} onPress={() => setReplaceChoice(p)} />)}</View><Button label="KEEP TEAM" sub="No swap this battle" secondary onPress={() => { setSwapChoice(null); setReplaceChoice(null); finishBattle(); }} /><Button label="CONFIRM ONE SWAP" sub={swapChoice && replaceChoice ? `${swapChoice.species} → ${replaceChoice.species}` : 'Select both Pokémon first'} onPress={finishBattle} disabled={!swapChoice || !replaceChoice} /></Card>}
    <Card eyebrow="NEXT BATTLE" title="What updates automatically?"><Row n="1" text="Battle number advances by exactly 1" /><Row n="2" text="Swap count increases only if you actually swapped" /><Row n="3" text="Current team becomes the new three Pokémon" /><Row n="4" text="Previous opponent becomes the six-slot block with your team" /><Row n="5" text="Swap elevation is recalculated from the new total" /></Card>
    <Button label="RESET / START ANOTHER RUN" secondary onPress={() => { setPhase('setup'); setState(null); setDefeated([]); setSwapChoice(null); setReplaceChoice(null); }} />
    <Text style={s.footer}>Battle Factory Companion • run engine v0.8.0</Text>
  </ScrollView>{celebration && <Animated.View pointerEvents="none" style={[s.overlay, { opacity, transform: [{ scale }] }]}><Text style={s.confetti}>✦ ✧ ✦</Text><Text style={s.winTitle}>{celebration.intensity === 'major' ? 'ROUND COMPLETE!' : 'BATTLE WON!'}</Text><Text style={s.winSub}>ON TO BATTLE {celebration.nextBattle}</Text><Text style={s.confetti}>✧ ✦ ✧</Text></Animated.View>}</SafeAreaView>;
}

function Header({ title, sub }) { return <View style={s.header}><Text style={s.brand}>POKÉMON EMERALD • BATTLE FACTORY</Text><Text style={s.hero}>{title}</Text><Text style={s.subhero}>{sub}</Text></View>; }
function Stat({ label, value }) { return <View style={s.stat}><Text style={s.statValue}>{value}</Text><Text style={s.statLabel}>{label}</Text></View>; }
function Row({ n, text }) { return <View style={s.phaseRow}><View style={s.phaseDot}><Text style={s.phaseDotText}>{n}</Text></View><Text style={s.phaseText}>{text}</Text></View>; }

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:'#071018'},container:{padding:16,paddingBottom:50},header:{paddingTop:10,paddingBottom:18},brand:{color:'#68bde9',fontSize:10,fontWeight:'900',letterSpacing:1.6},hero:{color:'#f6fbff',fontSize:27,fontWeight:'900',marginTop:7},subhero:{color:'#9eb5c6',fontSize:13,fontWeight:'700',marginTop:5,lineHeight:19},card:{backgroundColor:'#111b25',borderRadius:20,padding:16,marginBottom:13,borderWidth:1,borderColor:'#263642'},eyebrow:{color:'#63b7e8',fontSize:10,fontWeight:'900',letterSpacing:1.6,marginBottom:5},title:{color:'#f5f8fb',fontSize:19,fontWeight:'900',marginBottom:12},label:{color:'#a9b7c4',fontSize:12,fontWeight:'800',marginTop:12,marginBottom:7},helper:{color:'#7f919f',fontSize:12,lineHeight:18,marginBottom:7},wrap:{flexDirection:'row',flexWrap:'wrap',gap:8},choice:{backgroundColor:'#0b141c',borderWidth:1,borderColor:'#2b3c49',borderRadius:12,paddingVertical:10,paddingHorizontal:12},choiceSelected:{backgroundColor:'#1e4053',borderColor:'#70c8f2'},choiceText:{color:'#c5d2dc',fontSize:12,fontWeight:'800'},input:{backgroundColor:'#09131b',borderWidth:1,borderColor:'#293947',borderRadius:12,color:'#f5f8fb',paddingHorizontal:12,paddingVertical:10,fontSize:14,fontWeight:'700',marginBottom:8},inputRow:{flexDirection:'row',alignItems:'center',gap:8},slot:{width:30,height:42,borderRadius:10,backgroundColor:'#203342',color:'#a9dbf4',textAlign:'center',textAlignVertical:'center',paddingTop:11,fontWeight:'900'},button:{backgroundColor:'#1e718f',borderRadius:18,padding:16,marginBottom:12,borderWidth:1,borderColor:'#65c5e8'},buttonSecondary:{backgroundColor:'#13222c',borderColor:'#304553'},buttonDisabled:{opacity:0.45},buttonText:{color:'#fff',fontSize:13,fontWeight:'900',letterSpacing:1},buttonSub:{color:'#c2e9f6',fontSize:11,marginTop:4},partyRow:{flexDirection:'row',gap:8,flexWrap:'wrap'},partyCard:{width:'30%',minWidth:92,backgroundColor:'#0a141c',borderRadius:14,padding:10,borderWidth:1,borderColor:'#263946'},partySelected:{borderColor:'#75cff4',backgroundColor:'#163344'},sprite:{height:54,borderRadius:12,backgroundColor:'#1b2d3a',alignItems:'center',justifyContent:'center',marginBottom:7},spriteText:{color:'#9ddcf6',fontSize:25,fontWeight:'900'},partyName:{color:'#eef7fb',fontSize:12,fontWeight:'900'},partyMeta:{color:'#718695',fontSize:9,marginTop:2},statusGrid:{flexDirection:'row',gap:8,marginBottom:12},stat:{flex:1,backgroundColor:'#0a141c',borderRadius:13,padding:10,borderWidth:1,borderColor:'#253844'},statValue:{color:'#f7fbff',fontSize:20,fontWeight:'900'},statLabel:{color:'#738896',fontSize:8,fontWeight:'900',marginTop:2,letterSpacing:1},swapBanner:{backgroundColor:'#0a141c',borderRadius:14,padding:12,borderWidth:1,borderColor:'#315163',marginVertical:10},swapBannerTitle:{color:'#72c9ef',fontSize:10,fontWeight:'900',letterSpacing:1.4},swapBannerText:{color:'#f4fbff',fontSize:15,fontWeight:'900',marginTop:4},phaseRow:{flexDirection:'row',alignItems:'center',gap:10,marginVertical:7},phaseDot:{width:25,height:25,borderRadius:13,backgroundColor:'#203a49',alignItems:'center',justifyContent:'center'},phaseDotText:{color:'#9fdcf4',fontSize:11,fontWeight:'900'},phaseText:{color:'#b9c8d2',fontSize:12,flex:1},milestone:{backgroundColor:'#163d4b',borderWidth:1,borderColor:'#70c8f2',borderRadius:20,padding:18,marginBottom:13,alignItems:'center'},milestoneStars:{color:'#bceeff',fontSize:20},milestoneTitle:{color:'#fff',fontSize:20,fontWeight:'900',marginTop:4},milestoneSub:{color:'#b9d9e7',fontSize:11,marginTop:4,textAlign:'center'},overlay:{position:'absolute',left:16,right:16,top:'35%',backgroundColor:'#102633',borderRadius:24,borderWidth:1,borderColor:'#72cff5',padding:24,alignItems:'center',shadowOpacity:0.4,shadowRadius:20,elevation:12},confetti:{color:'#bceeff',fontSize:24,letterSpacing:5},winTitle:{color:'#fff',fontSize:26,fontWeight:'900',marginVertical:7,textAlign:'center'},winSub:{color:'#a9d8e9',fontSize:13,fontWeight:'800'},footer:{color:'#4f6472',fontSize:10,textAlign:'center',marginTop:12}
});
