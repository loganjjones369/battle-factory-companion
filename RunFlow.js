import React, { useMemo, useRef, useState } from 'react';
import { Animated, Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getPokemon } from './data/factoryData';
import { createRun, completeBattle } from './data/runProgress';
import { getDraftSlotInfo } from './data/factoryPools';
import { getFactorySets, getFactorySet, makeSwapReplacement, makeTeamPokemon } from './data/setIdentity';

const LEVELS = ['Open Level', 'Level 50'];
const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const norm = (v) => String(v || '').trim().toLowerCase();

function Card({ eyebrow, title, children, compact = false }) {
  return <View style={[s.card, compact && s.cardCompact]}>{eyebrow ? <Text style={s.eyebrow}>{eyebrow}</Text> : null}<Text style={s.title}>{title}</Text>{children}</View>;
}

function Button({ label, sub, onPress, secondary = false, disabled = false }) {
  return <TouchableOpacity disabled={disabled} onPress={onPress} activeOpacity={0.82} style={[s.button, secondary && s.buttonSecondary, disabled && s.buttonDisabled]}><Text style={s.buttonText}>{label}</Text>{sub ? <Text style={s.buttonSub}>{sub}</Text> : null}</TouchableOpacity>;
}

function spriteId(pokemon) { return pokemon?.id || pokemon?.nationalDexId || null; }

function PixelSprite({ pokemon, size = 62 }) {
  const id = spriteId(pokemon);
  if (!id) return <View style={[s.spriteFallback, { width: size, height: size }]}><Text style={s.spriteFallbackText}>?</Text></View>;
  return <View style={[s.spriteFrame, { width: size, height: size }]}><Image source={{ uri: `${SPRITE_BASE}${id}.png` }} style={{ width: size, height: size }} resizeMode="contain" /></View>;
}

function Pokeball({ pokemon, elevated, slotNumber, onPress, selected }) {
  const name = pokemon?.species || '';
  return <TouchableOpacity onPress={onPress} activeOpacity={0.84} style={[s.ballSlot, selected && s.ballSelected]}>
    <View style={s.ballBackdrop}><View style={s.ballTop} /><View style={s.ballBand} /><View style={s.ballBottom} /><View style={s.ballButton} /></View>
    {pokemon ? <View style={s.ballPokemon}><PixelSprite pokemon={pokemon} size={78} /></View> : <Text style={s.ballPlus}>+</Text>}
    <View style={s.ballNumber}><Text style={s.ballNumberText}>{slotNumber}</Text></View>
    {elevated ? <View style={s.elevationBadge}><Text style={s.elevationArrow}>↑</Text></View> : null}
    {pokemon ? <Text numberOfLines={1} style={s.ballName}>{name}</Text> : <Text style={s.ballEmpty}>EMPTY</Text>}
    {pokemon ? <Text style={[s.ballIV, elevated && s.ballIVElevated]}>SET {pokemon.setId ?? pokemon.id}{elevated ? ' • UP' : ''}</Text> : null}
  </TouchableOpacity>;
}

function PartyChip({ pokemon, selected, onPress }) {
  const name = pokemon?.species || pokemon?.name || String(pokemon || '');
  return <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={[s.partyChip, selected && s.partyChipSelected]}>
    <PixelSprite pokemon={pokemon} size={42} />
    <View style={s.partyChipText}><Text numberOfLines={1} style={s.partyChipName}>{name}</Text><Text style={s.partyChipMeta}>{pokemon?.setId ? `Set ${pokemon.setId}` : pokemon?.factoryIV ? `IV ${pokemon.factoryIV}` : 'Pokémon'}</Text></View>
    {pokemon?.isElevated ? <Text style={s.miniUp}>↑</Text> : null}
  </TouchableOpacity>;
}

function SetPicker({ species, value, onChange, compact = false }) {
  const sets = getFactorySets(species);
  if (!species || !sets.length) return null;
  return <View style={[s.setPicker, compact && s.setPickerCompact]}>
    <Text style={s.setPickerLabel}>FACTORY SET</Text>
    <View style={s.setRow}>{sets.map((set) => <TouchableOpacity key={set.id} onPress={() => onChange(set.id)} style={[s.setButton, Number(value) === Number(set.id) && s.setButtonSelected]}><Text style={[s.setButtonText, Number(value) === Number(set.id) && s.setButtonTextSelected]}>{set.id}</Text></TouchableOpacity>)}</View>
    {value ? <Text numberOfLines={1} style={s.setSummary}>{species} {value} • {getFactorySet(species, value)?.item || 'Factory set'}</Text> : <Text style={s.setSummary}>Choose the exact set before continuing.</Text>}
  </View>;
}

function getSelectedSet(species, setId) {
  const base = getFactorySet(species, setId);
  if (!base) return null;
  const entry = getPokemon(species);
  return { ...entry, ...base, id: entry?.id || entry?.nationalDexId, species, setId: base.id, factorySetId: base.id };
}

function parseTeam(values) { return values.map(getPokemon).filter(Boolean); }

export default function RunFlow() {
  const [level, setLevel] = useState('Level 50');
  const [startBattle, setStartBattle] = useState('1');
  const [startSwaps, setStartSwaps] = useState('0');
  const [draftText, setDraftText] = useState(['', '', '', '', '', '']);
  const [draftSetIds, setDraftSetIds] = useState([null, null, null, null, null, null]);
  const [currentText, setCurrentText] = useState(['', '', '']);
  const [currentSetIds, setCurrentSetIds] = useState([null, null, null]);
  const [previousText, setPreviousText] = useState(['', '', '']);
  const [previousSetIds, setPreviousSetIds] = useState([null, null, null]);
  const [state, setState] = useState(null);
  const [phase, setPhase] = useState('setup');
  const [defeated, setDefeated] = useState([]);
  const [defeatedSetIds, setDefeatedSetIds] = useState([null, null, null]);
  const [swapChoice, setSwapChoice] = useState(null);
  const [replaceChoice, setReplaceChoice] = useState(null);
  const [celebration, setCelebration] = useState(null);
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const battleForDraft = state?.battle || Math.max(1, Number(startBattle) || 1);
  const swapsForDraft = state?.swaps ?? Math.max(0, Number(startSwaps) || 0);

  const draft = useMemo(() => draftText.map((value, index) => {
    const species = String(value || '').trim();
    if (!species) return null;
    const p = getSelectedSet(species, draftSetIds[index]);
    if (!p) return null;
    const slot = getDraftSlotInfo({ levelMode: level, battle: battleForDraft, swaps: swapsForDraft, slotIndex: index });
    return makeTeamPokemon({ ...p, draftSlot: index, isElevated: slot.isElevated, factoryIV: slot.iv, poolBucket: slot.poolBucket }, { draftSlot: index, isElevated: slot.isElevated, factoryIV: slot.iv, setId: draftSetIds[index] });
  }), [draftText, draftSetIds, level, battleForDraft, swapsForDraft]);

  const current = useMemo(() => currentText.map((value, index) => {
    const species = String(value || '').trim();
    if (!species) return null;
    const fromDraft = draft.find((p) => norm(p.species) === norm(species) && Number(p.setId) === Number(currentSetIds[index]));
    if (fromDraft) return { ...fromDraft, teamSlot: index };
    const p = getSelectedSet(species, currentSetIds[index]);
    return p ? makeTeamPokemon(p, { teamSlot: index, isElevated: false, draftSlot: null }) : null;
  }).filter(Boolean), [currentText, currentSetIds, draft]);

  const previous = useMemo(() => previousText.map((value, index) => {
    const species = String(value || '').trim();
    if (!species) return null;
    const p = getSelectedSet(species, previousSetIds[index]);
    return p ? makeTeamPokemon(p, { teamSlot: index, isElevated: false, draftSlot: null }) : null;
  }).filter(Boolean), [previousText, previousSetIds]);

  const draftLeft = useMemo(() => draft.filter((p) => !current.some((c) => norm(c.species) === norm(p.species) && Number(c.setId) === Number(p.setId))), [draft, current]);
  const setSlot = (setter, index, value) => setter((old) => old.map((x, i) => i === index ? value : x));
  const setDraftSpecies = (index, value) => { setSlot(setDraftText, index, value); setSlot(setDraftSetIds, index, null); };

  const begin = () => {
    const battle = Math.max(1, Number(startBattle) || 1);
    const swaps = Math.max(0, Number(startSwaps) || 0);
    const selected = current.length === 3 ? current : draft.slice(0, 3);
    if (selected.length !== 3 || new Set(selected.map((p) => norm(p.species))).size !== 3) return;
    const normalized = selected.map((p, index) => ({ ...p, teamSlot: index }));
    const next = createRun({ level, battle, swaps, currentTeam: normalized, previousOpponent: previous, draft, draftSlots: draft.map((p, index) => ({ index, species: p.species, setId: p.setId, setKey: p.setKey, isElevated: p.isElevated, factoryIV: p.factoryIV, poolBucket: p.poolBucket })) });
    setState(next);
    setCurrentText(normalized.map((p) => p.species));
    setCurrentSetIds(normalized.map((p) => p.setId));
    setPhase('research');
  };

  const celebrate = (info) => {
    setCelebration(info); scale.setValue(0.7); opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 12 }),
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start(() => setTimeout(() => Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setCelebration(null)), Math.max(300, info.durationMs - 340)));
  };

  const finishBattle = () => {
    if (!state || current.length !== 3 || defeated.length !== 3) return;
    let nextTeam = current;
    if (swapChoice && replaceChoice) {
      nextTeam = current.map((p, index) => index === (swapChoice.teamSlot ?? current.indexOf(swapChoice)) ? makeSwapReplacement(replaceChoice, index) : { ...p, teamSlot: index });
    }
    const result = completeBattle(state, { won: true, nextCurrentTeam: nextTeam, defeatedOpponent: defeated });
    if (result.state.progressionError) return;
    setState(result.state);
    setCurrentText(nextTeam.map((p) => p.species));
    setCurrentSetIds(nextTeam.map((p) => p.setId));
    setPreviousText(defeated.map((p) => p.species));
    setPreviousSetIds(defeated.map((p) => p.setId));
    setDefeated([]); setDefeatedSetIds([null, null, null]); setSwapChoice(null); setReplaceChoice(null); setPhase('research');
    celebrate(result.celebration);
  };

  const battle = state?.battle ?? battleForDraft;
  const round = state?.round ?? Math.max(1, Math.ceil(battleForDraft / 7));
  const elevation = state?.swapElevation ?? getDraftSlotInfo({ levelMode: level, battle, swaps: swapsForDraft }).elevationCount;
  const majorMilestone = [28, 35, 42].includes(Math.max(1, battle - 1));
  const draftElevation = getDraftSlotInfo({ levelMode: level, battle: battleForDraft, swaps: swapsForDraft }).elevationCount;
  const canStart = draft.length >= 3 && draft.slice(0, 3).every(Boolean) && new Set(draft.slice(0, 3).map((p) => norm(p.species))).size === 3;

  if (phase === 'setup') return <SafeAreaView style={s.safe}><StatusBar style="light" /><ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
    <Header title="DRAFT" sub="Six balls. Six possibilities. Every Pokémon gets an exact Factory set identity before it enters the run." />
    <Card eyebrow="FACTORY FORMAT" title="Choose your level"><View style={s.wrap}>{LEVELS.map((x) => <TouchableOpacity key={x} onPress={() => setLevel(x)} style={[s.choice, level === x && s.choiceSelected]}><Text style={s.choiceText}>{x}</Text></TouchableOpacity>)}</View></Card>
    <Card eyebrow="SAVE STATE" title="Starting position"><Text style={s.label}>Starting battle</Text><TextInput value={startBattle} onChangeText={setStartBattle} keyboardType="number-pad" style={s.input} /><Text style={s.helper}>You can start at Battle 28, 35, 42, or any other battle.</Text><Text style={s.label}>Starting swap count</Text><TextInput value={startSwaps} onChangeText={setStartSwaps} keyboardType="number-pad" style={s.input} /><Text style={s.helper}>This drives the elevated draft slots automatically.</Text></Card>
    <Card eyebrow="DRAFT SCREEN" title={`${draftElevation} elevated slots`}>
      <View style={s.draftHeader}><Text style={s.draftHeaderText}>BATTLE {Math.max(1, Number(startBattle) || 1)} • {Math.max(0, Number(startSwaps) || 0)} SWAPS</Text><Text style={s.draftHeaderAccent}>{draftElevation} ↑</Text></View>
      <View style={s.ballGrid}>{[0,1,2,3,4,5].map((i) => { const slot = getDraftSlotInfo({ levelMode: level, battle: battleForDraft, swaps: swapsForDraft, slotIndex: i }); return <View key={i} style={s.ballEditCell}><Pokeball slotNumber={i + 1} pokemon={draft[i]} elevated={slot.isElevated} /><TextInput value={draftText[i]} onChangeText={(v) => setDraftSpecies(i, v)} placeholder="Pokémon" placeholderTextColor="#637481" style={s.ballInput} /><SetPicker species={draftText[i]} value={draftSetIds[i]} onChange={(id) => setSlot(setDraftSetIds, i, id)} compact /></View>; })}</View>
      <Text style={s.elevationHelp}>{draftElevation ? '↑ marks upgraded positions. Elevation belongs to this draft slot only; it will not transfer through a later swap.' : 'No elevated draft positions at this swap count.'}</Text>
    </Card>
    <Card eyebrow="OPTIONAL SAVE-STATE DATA" title="Current party"><Text style={s.helper}>Use this only when loading a run that already has a team. Select the exact set for each Pokémon.</Text>{currentText.map((x, i) => <View key={i}><TextInput value={x} onChangeText={(v) => { setSlot(setCurrentText, i, v); setSlot(setCurrentSetIds, i, null); }} placeholder={`Current Pokémon ${i + 1}`} placeholderTextColor="#647383" style={s.input} /><SetPicker species={x} value={currentSetIds[i]} onChange={(id) => setSlot(setCurrentSetIds, i, id)} compact /></View>)}</Card>
    <Card eyebrow="OPTIONAL HISTORY" title="Previous opponent">{previousText.map((x, i) => <View key={i}><TextInput value={x} onChangeText={(v) => { setSlot(setPreviousText, i, v); setSlot(setPreviousSetIds, i, null); }} placeholder={`Previous opponent ${i + 1}`} placeholderTextColor="#647383" style={s.input} /><SetPicker species={x} value={previousSetIds[i]} onChange={(id) => setSlot(setPreviousSetIds, i, id)} compact /></View>)}</Card>
    <Button label="START RUN" sub={canStart ? 'Lock the exact set identities into the battle state' : 'Choose Pokémon + exact sets for at least the first three slots'} onPress={begin} disabled={!canStart} />
    <Text style={s.footer}>Battle Factory Companion • Emerald draft UI v0.10.0</Text>
  </ScrollView></SafeAreaView>;

  return <SafeAreaView style={s.safe}><StatusBar style="light" /><ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
    <Header title={`BATTLE ${battle}`} sub={`Round ${round} • ${level} • ${state?.swaps ?? 0} swaps • ${elevation} elevated`} />
    <View style={s.partyDock}><View style={s.dockLabel}><Text style={s.dockLabelTop}>YOUR PARTY</Text><Text style={s.dockLabelBottom}>team slots stay fixed through swaps</Text></View>{current.map((p, i) => <PartyChip key={`${p.species}-${p.setId}-${i}`} pokemon={p} selected={phase === 'swap' && swapChoice?.teamSlot === i} onPress={() => phase === 'swap' && setSwapChoice(p)} />)}</View>
    <View style={s.leftBehind}><View><Text style={s.leftBehindTitle}>DRAFT LEFT BEHIND</Text><Text style={s.leftBehindSub}>exact set identities remain available for reference</Text></View><View style={s.leftBehindRow}>{draftLeft.map((p, i) => <View key={`${p.species}-${p.setId}-${i}`} style={s.leftBehindChip}><PixelSprite pokemon={p} size={34}/><View><Text numberOfLines={1} style={s.leftBehindName}>{p.species} {p.setId}</Text>{p.isElevated ? <Text style={s.leftBehindUp}>↑ ELEVATED</Text> : <Text style={s.leftBehindSet}>NORMAL</Text>}</View></View>)}</View></View>
    {majorMilestone ? <View style={s.milestone}><Text style={s.milestoneStars}>✦ ↑ ✦</Text><Text style={s.milestoneTitle}>MAJOR FACTORY MILESTONE</Text><Text style={s.milestoneSub}>Battle {battle - 1} completed — new round research begins.</Text></View> : null}
    <Card eyebrow="RUN STATUS" title="Factory memory" compact><View style={s.statusGrid}><Stat label="BATTLE" value={battle} /><Stat label="ROUND" value={round} /><Stat label="SWAPS" value={state?.swaps ?? 0} /><Stat label="ELEVATION" value={elevation} /></View><Text style={s.helper}>Blocked species: {state?.blockedSpecies?.length ? state.blockedSpecies.join(', ') : 'none recorded yet'}</Text></Card>
    {phase === 'research' && <Card eyebrow="RESEARCH PHASE" title="Record the opponent"><Text style={s.helper}>Enter the three opponent species you just fought and select the exact set for each. They become the previous-opponent block for the next battle.</Text>{[0,1,2].map((i) => <View key={i}><TextInput value={defeated[i]?.species || ''} onChangeText={(v) => { const p = getSelectedSet(v, null); setDefeated((old) => { const next = [...old]; next[i] = p ? makeTeamPokemon(p, { teamSlot: i, isElevated: false, draftSlot: null }) : { species: v, teamSlot: i }; return next; }); setSlot(setDefeatedSetIds, i, null); }} placeholder={`Opponent ${i + 1}`} placeholderTextColor="#647383" style={s.input} /><SetPicker species={defeated[i]?.species} value={defeatedSetIds[i]} onChange={(id) => setDefeated((old) => { const next = [...old]; const p = getSelectedSet(next[i]?.species, id); next[i] = p ? makeTeamPokemon(p, { teamSlot: i, isElevated: false, draftSlot: null }) : next[i]; return next; }) || setSlot(setDefeatedSetIds, i, id)} compact /></View>)}<Button label="I WON — CHOOSE TEAM" sub="One swap maximum" onPress={() => setPhase('swap')} disabled={defeated.length !== 3 || defeated.some((p) => !p?.species || !p?.setId)} /></Card>}
    {phase === 'swap' && <Card eyebrow="POST-BATTLE" title="Keep team or swap one"><Text style={s.helper}>Tap one party Pokémon, then one defeated Pokémon. The replacement takes the exact same team slot. It is a fresh team identity and can never inherit the outgoing Pokémon's elevation.</Text><View style={s.swapBanner}><Text style={s.swapBannerTitle}>{swapChoice && replaceChoice ? 'ONE SWAP SELECTED' : 'OPTIONAL SWAP'}</Text><Text style={s.swapBannerText}>{swapChoice && replaceChoice ? `SLOT ${(swapChoice.teamSlot ?? 0) + 1}: ${swapChoice.species} ${swapChoice.setId} → ${replaceChoice.species} ${replaceChoice.setId}` : 'No swap selected'}</Text></View><Text style={s.label}>Opponent Pokémon to take</Text><View style={s.partyRow}>{defeated.map((p, i) => <PartyChip key={`${p.species}-${p.setId}-${i}`} pokemon={p} selected={replaceChoice?.teamSlot === i} onPress={() => setReplaceChoice(p)} />)}</View><Button label="KEEP TEAM" sub="No swap this battle" secondary onPress={() => { setSwapChoice(null); setReplaceChoice(null); finishBattle(); }} /><Button label="CONFIRM ONE SWAP" sub={swapChoice && replaceChoice ? `Replace slot ${(swapChoice.teamSlot ?? 0) + 1}` : 'Select both Pokémon first'} onPress={finishBattle} disabled={!swapChoice || !replaceChoice} /></Card>}
    <Card eyebrow="NEXT BATTLE" title="Automatic memory"><Row n="1" text="Battle number advances by one" /><Row n="2" text="Swap count changes only when one Pokémon is swapped" /><Row n="3" text="The replacement keeps the outgoing Pokémon's team slot" /><Row n="4" text="The replacement's draftSlot/elevation are cleared" /><Row n="5" text="Defeated opponent becomes the previous-opponent block" /><Row n="6" text="Elevation recalculates only from the persistent swap count" /></Card>
    <Button label="RESET / START ANOTHER RUN" secondary onPress={() => { setPhase('setup'); setState(null); setDefeated([]); setDefeatedSetIds([null, null, null]); setSwapChoice(null); setReplaceChoice(null); }} />
    <Text style={s.footer}>Battle Factory Companion • Emerald draft UI v0.10.0</Text>
  </ScrollView>{celebration && <Animated.View pointerEvents="none" style={[s.overlay, { opacity, transform: [{ scale }] }]}><Text style={s.confetti}>✦ ✧ ↑ ✧ ✦</Text><Text style={s.winTitle}>{celebration.intensity === 'major' ? 'ROUND COMPLETE!' : 'BATTLE WON!'}</Text><Text style={s.winSub}>ON TO BATTLE {celebration.nextBattle}</Text><Text style={s.confetti}>✧ ✦ ↑ ✦ ✧</Text></Animated.View>}</SafeAreaView>;
}

function Header({ title, sub }) { return <View style={s.header}><Text style={s.brand}>POKÉMON EMERALD • BATTLE FACTORY</Text><Text style={s.hero}>{title}</Text><Text style={s.subhero}>{sub}</Text></View>; }
function Stat({ label, value }) { return <View style={s.stat}><Text style={s.statValue}>{value}</Text><Text style={s.statLabel}>{label}</Text></View>; }
function Row({ n, text }) { return <View style={s.phaseRow}><View style={s.phaseDot}><Text style={s.phaseDotText}>{n}</Text></View><Text style={s.phaseText}>{text}</Text></View>; }

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:'#071018'},container:{padding:14,paddingBottom:50},header:{paddingTop:8,paddingBottom:13},brand:{color:'#72d1b4',fontSize:9,fontWeight:'900',letterSpacing:1.7},hero:{color:'#f5fbf8',fontSize:27,fontWeight:'900',marginTop:6},subhero:{color:'#9fb9b2',fontSize:12,fontWeight:'700',marginTop:4,lineHeight:18},card:{backgroundColor:'#101c20',borderRadius:18,padding:14,marginBottom:11,borderWidth:1,borderColor:'#29403c'},cardCompact:{paddingVertical:12},eyebrow:{color:'#6ed0b0',fontSize:9,fontWeight:'900',letterSpacing:1.6,marginBottom:4},title:{color:'#f3faf7',fontSize:18,fontWeight:'900',marginBottom:10},label:{color:'#a7bcb6',fontSize:11,fontWeight:'800',marginTop:9,marginBottom:6},helper:{color:'#7f9992',fontSize:11,lineHeight:17,marginBottom:6},wrap:{flexDirection:'row',flexWrap:'wrap',gap:8},choice:{backgroundColor:'#091310',borderWidth:1,borderColor:'#2d4640',borderRadius:11,paddingVertical:9,paddingHorizontal:12},choiceSelected:{backgroundColor:'#164235',borderColor:'#6ed0b0'},choiceText:{color:'#c9ddd7',fontSize:12,fontWeight:'800'},input:{backgroundColor:'#08110f',borderWidth:1,borderColor:'#29403a',borderRadius:11,color:'#f3faf7',paddingHorizontal:11,paddingVertical:9,fontSize:13,fontWeight:'700',marginBottom:7},button:{backgroundColor:'#187457',borderRadius:16,padding:15,marginBottom:10,borderWidth:1,borderColor:'#62cba7'},buttonSecondary:{backgroundColor:'#11201c',borderColor:'#35524a'},buttonDisabled:{opacity:0.42},buttonText:{color:'#fff',fontSize:12,fontWeight:'900',letterSpacing:1},buttonSub:{color:'#bfe9db',fontSize:10,marginTop:3},draftHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8},draftHeaderText:{color:'#78928b',fontSize:9,fontWeight:'900',letterSpacing:1.1},draftHeaderAccent:{color:'#74d8b7',fontSize:13,fontWeight:'900'},ballGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between'},ballEditCell:{width:'31.8%',alignItems:'center',marginBottom:8},ballSlot:{height:142,width:'100%',alignItems:'center',justifyContent:'flex-start',paddingTop:3,borderRadius:14,borderWidth:1,borderColor:'#203832',backgroundColor:'#0a1512',position:'relative',overflow:'hidden'},ballSelected:{borderColor:'#78dabc',backgroundColor:'#10251f'},ballBackdrop:{position:'absolute',width:72,height:72,top:10,borderRadius:36,overflow:'hidden',opacity:0.7},ballTop:{height:35,backgroundColor:'#314e46'},ballBand:{height:4,backgroundColor:'#9db8af'},ballBottom:{flex:1,backgroundColor:'#d3ded9'},ballButton:{position:'absolute',width:14,height:14,borderRadius:7,backgroundColor:'#f4fbf8',borderWidth:3,borderColor:'#29413a',left:29,top:29},ballPokemon:{zIndex:2,marginTop:0},ballPlus:{fontSize:38,color:'#6d8a81',marginTop:20},ballNumber:{position:'absolute',left:5,top:5,width:18,height:18,borderRadius:9,backgroundColor:'#07110f',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#52756b'},ballNumberText:{color:'#a7c7be',fontSize:9,fontWeight:'900'},elevationBadge:{position:'absolute',right:5,top:4,width:20,height:20,borderRadius:10,backgroundColor:'#5bc19f',alignItems:'center',justifyContent:'center',zIndex:5,borderWidth:1,borderColor:'#b7f1df'},elevationArrow:{color:'#06251c',fontSize:14,fontWeight:'900'},ballName:{position:'absolute',bottom:21,left:4,right:4,color:'#eff9f5',fontSize:10,fontWeight:'900',textAlign:'center'},ballIV:{position:'absolute',bottom:5,color:'#718b83',fontSize:8,fontWeight:'900'},ballIVElevated:{color:'#67d4ae'},ballEmpty:{position:'absolute',bottom:21,color:'#526b63',fontSize:9,fontWeight:'900'},ballInput:{width:'100%',marginTop:3,textAlign:'center',backgroundColor:'#08110f',borderWidth:1,borderColor:'#29403a',borderRadius:9,color:'#f3faf7',paddingHorizontal:5,paddingVertical:7,fontSize:10,fontWeight:'700'},setPicker:{width:'100%',marginTop:2,marginBottom:4},setPickerCompact:{marginBottom:6},setPickerLabel:{color:'#5f8177',fontSize:7,fontWeight:'900',letterSpacing:1,marginBottom:3},setRow:{flexDirection:'row',flexWrap:'wrap',gap:3},setButton:{minWidth:24,height:22,borderRadius:6,borderWidth:1,borderColor:'#28453c',backgroundColor:'#08110f',alignItems:'center',justifyContent:'center',paddingHorizontal:6},setButtonSelected:{backgroundColor:'#1c5845',borderColor:'#72d5b5'},setButtonText:{color:'#718d84',fontSize:9,fontWeight:'900'},setButtonTextSelected:{color:'#eafff8'},setSummary:{color:'#59766c',fontSize:7,fontWeight:'800',marginTop:3},elevationHelp:{color:'#78938a',fontSize:10,lineHeight:15,marginTop:2},partyDock:{backgroundColor:'#0e1b18',borderWidth:1,borderColor:'#2c4a40',borderRadius:15,padding:8,marginBottom:8},dockLabel:{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',paddingHorizontal:3,marginBottom:5},dockLabelTop:{color:'#70d1b0',fontSize:9,fontWeight:'900',letterSpacing:1.3},dockLabelBottom:{color:'#607970',fontSize:8,fontWeight:'700'},partyChip:{flexDirection:'row',alignItems:'center',flex:1,minWidth:98,backgroundColor:'#091310',borderWidth:1,borderColor:'#243d36',borderRadius:12,padding:5,margin:2},partyChipSelected:{borderColor:'#72d5b5',backgroundColor:'#15352b'},partyChipText:{flex:1,marginLeft:4},partyChipName:{color:'#eff8f5',fontSize:10,fontWeight:'900'},partyChipMeta:{color:'#6f8b82',fontSize:8,marginTop:1},miniUp:{color:'#70d4af',fontSize:14,fontWeight:'900',marginRight:4},spriteFrame:{alignItems:'center',justifyContent:'center',overflow:'visible'},spriteFallback:{borderRadius:12,backgroundColor:'#172b25',alignItems:'center',justifyContent:'center'},spriteFallbackText:{color:'#73b8a0',fontSize:22,fontWeight:'900'},leftBehind:{backgroundColor:'#0b1613',borderRadius:13,borderWidth:1,borderColor:'#213a32',padding:8,marginBottom:11},leftBehindTitle:{color:'#718b82',fontSize:8,fontWeight:'900',letterSpacing:1.2},leftBehindSub:{color:'#4f675f',fontSize:8,marginTop:2},leftBehindRow:{flexDirection:'row',flexWrap:'wrap',marginTop:5},leftBehindChip:{flexDirection:'row',alignItems:'center',backgroundColor:'#0a120f',borderRadius:9,borderWidth:1,borderColor:'#1c3029',paddingRight:7,paddingLeft:2,marginRight:4,marginBottom:3,maxWidth:170},leftBehindName:{color:'#a7bbb5',fontSize:8,fontWeight:'800',maxWidth:90},leftBehindSet:{color:'#4f675f',fontSize:7,fontWeight:'800'},leftBehindUp:{color:'#5fc49f',fontSize:7,fontWeight:'900'},statusGrid:{flexDirection:'row',gap:7,marginBottom:9},stat:{flex:1,backgroundColor:'#091310',borderRadius:11,padding:8,borderWidth:1,borderColor:'#203831'},statValue:{color:'#f4fbf8',fontSize:18,fontWeight:'900'},statLabel:{color:'#688078',fontSize:7,fontWeight:'900',marginTop:1,letterSpacing:1},partyRow:{flexDirection:'row',flexWrap:'wrap'},swapBanner:{backgroundColor:'#091310',borderRadius:12,padding:10,borderWidth:1,borderColor:'#31574b',marginVertical:8},swapBannerTitle:{color:'#70d2ae',fontSize:9,fontWeight:'900',letterSpacing:1.3},swapBannerText:{color:'#f4fbf8',fontSize:13,fontWeight:'900',marginTop:3},phaseRow:{flexDirection:'row',alignItems:'center',gap:9,marginVertical:6},phaseDot:{width:24,height:24,borderRadius:12,backgroundColor:'#17342b',alignItems:'center',justifyContent:'center'},phaseDotText:{color:'#9bd9c3',fontSize:10,fontWeight:'900'},phaseText:{color:'#b6cac4',fontSize:11,flex:1},milestone:{backgroundColor:'#143d32',borderWidth:1,borderColor:'#65c9a7',borderRadius:17,padding:15,marginBottom:11,alignItems:'center'},milestoneStars:{color:'#b7f1dd',fontSize:18},milestoneTitle:{color:'#fff',fontSize:17,fontWeight:'900',marginTop:3},milestoneSub:{color:'#b1d8ca',fontSize:10,marginTop:3,textAlign:'center'},overlay:{position:'absolute',left:14,right:14,top:'34%',backgroundColor:'#0f2d25',borderRadius:22,borderWidth:1,borderColor:'#71d5b2',padding:22,alignItems:'center',shadowOpacity:0.45,shadowRadius:18,elevation:12},confetti:{color:'#b9f3df',fontSize:21,letterSpacing:4},winTitle:{color:'#fff',fontSize:25,fontWeight:'900',marginVertical:6,textAlign:'center'},winSub:{color:'#a9d8ca',fontSize:12,fontWeight:'800'},footer:{color:'#425a52',fontSize:9,textAlign:'center',marginTop:9}
});
