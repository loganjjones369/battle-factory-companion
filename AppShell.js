import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getPokemon } from './data/factoryData';
import { bestDamagingMoves, calculateDamage, getFactoryIV, getStats } from './data/damageCalc';
import ScientistClueReference from './components/ScientistClueReference';

const LEVELS = ['Open Level', 'Level 50'];
const WEATHER = [['none', 'None'], ['sun', 'Sun'], ['rain', 'Rain'], ['hail', 'Hail']];
const STATUS = [['healthy', 'Healthy'], ['burned', 'Burned']];
const QUICK = ['Heracross', 'Regice', 'Moltres', 'Gardevoir', 'Metagross', 'Swampert'];

function Choice({ label, selected, onPress }) {
  return <TouchableOpacity onPress={onPress} style={[s.choice, selected && s.choiceSelected]} activeOpacity={0.82}><Text style={[s.choiceText, selected && s.choiceTextSelected]}>{label}</Text></TouchableOpacity>;
}
function Section({ eyebrow, title, children }) {
  return <View style={s.card}>{eyebrow && <Text style={s.eyebrow}>{eyebrow}</Text>}<Text style={s.sectionTitle}>{title}</Text>{children}</View>;
}
function SetCard({ pokemon, set, level, round }) {
  const stats = getStats(pokemon, set, level, round);
  const evs = Object.entries(set.evs || {}).filter(([, v]) => v).map(([k, v]) => `${v} ${k.toUpperCase()}`).join(' / ') || 'none listed';
  return <View style={s.setCard}><View style={s.rowBetween}><Text style={s.setTitle}>{pokemon.name} Set {set.id}</Text><Text style={s.speedPill}>SPD {stats.spe}</Text></View><Text style={s.meta}>{set.nature} • {set.item} • {set.ability}</Text><Text style={s.meta}>HP {stats.hp} • Atk {stats.atk} • Def {stats.def} • SpA {stats.spa} • SpD {stats.spd}</Text><Text style={s.meta}>EVs: {evs}</Text><View style={s.wrap}>{set.moves.map((move) => <View key={move} style={s.moveChip}><Text style={s.moveText}>{move}</Text></View>)}</View></View>;
}

export default function AppShell() {
  const [levelMode, setLevelMode] = useState('Open Level');
  const [round, setRound] = useState('1');
  const [draft, setDraft] = useState(['', '', '']);
  const [scientistStyle, setScientistStyle] = useState(0);
  const [started, setStarted] = useState(false);
  const [attackerName, setAttackerName] = useState('Heracross');
  const [defenderName, setDefenderName] = useState('Regice');
  const [attackerSetIndex, setAttackerSetIndex] = useState(0);
  const [defenderSetIndex, setDefenderSetIndex] = useState(0);
  const [moveName, setMoveName] = useState('Megahorn');
  const [weather, setWeather] = useState('none');
  const [attackerStatus, setAttackerStatus] = useState('healthy');
  const [calculatorOpen, setCalculatorOpen] = useState(true);

  const level = levelMode === 'Level 50' ? 50 : 100;
  const recognized = useMemo(() => draft.map(getPokemon).filter(Boolean), [draft]);
  const attacker = getPokemon(attackerName);
  const defender = getPokemon(defenderName);
  const attackerSet = attacker?.sets[attackerSetIndex] || attacker?.sets[0];
  const defenderSet = defender?.sets[defenderSetIndex] || defender?.sets[0];
  const moves = attackerSet ? bestDamagingMoves(attackerSet) : [];

  const speedSummary = useMemo(() => {
    if (recognized.length !== 2) return null;
    const [a, b] = recognized;
    const speedList = (mon) => mon.sets.map((set) => getStats(mon, set, level, round).spe);
    const aSpeeds = speedList(a); const bSpeeds = speedList(b);
    return { a, b, aSpeeds, bSpeeds, aMatchups: aSpeeds.map((x) => bSpeeds.filter((y) => x > y).length), bMatchups: bSpeeds.map((x) => aSpeeds.filter((y) => x > y).length) };
  }, [recognized, level, round]);

  const selectedDamage = useMemo(() => attacker && defender && attackerSet && defenderSet && moveName ? calculateDamage({ attacker, attackerSet, defender, defenderSet, level, round, moveName, weather, attackerStatus }) : null, [attacker, defender, attackerSet, defenderSet, level, round, moveName, weather, attackerStatus]);
  const allDefenderResults = useMemo(() => !attacker || !defender || !attackerSet || !moveName ? [] : defender.sets.map((set) => ({ set, damage: calculateDamage({ attacker, attackerSet, defender, defenderSet: set, level, round, moveName, weather, attackerStatus }) })), [attacker, defender, attackerSet, level, round, moveName, weather, attackerStatus]);

  const setDraft = (index, value) => setDraftState(setDraft, index, value);
  const selectAttacker = (name) => { const mon = getPokemon(name); setAttackerName(name); setAttackerSetIndex(0); setMoveName(bestDamagingMoves(mon?.sets?.[0] || {})[0] || ''); };

  return <SafeAreaView style={s.safe}>
    <StatusBar style="light" />
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <View style={s.header}><Text style={s.brand}>POKÉMON EMERALD</Text><Text style={s.title}>Battle Factory</Text><Text style={s.subtitle}>Companion</Text><Text style={s.headerCopy}>Offline Factory clues, set data, speed checks and Gen III damage calculations.</Text></View>

      <Section eyebrow="FACTORY" title="1. Battle setup"><Text style={s.label}>Battle level</Text><View style={s.wrap}>{LEVELS.map((x) => <Choice key={x} label={x} selected={levelMode === x} onPress={() => setLevelMode(x)} />)}</View><Text style={s.label}>Current round</Text><TextInput value={round} onChangeText={setRound} keyboardType="number-pad" maxLength={2} style={s.input} /><Text style={s.helper}>Rental IV reference: {getFactoryIV(round)}</Text></Section>

      <Section eyebrow="DRAFT" title="2. Your draft"><Text style={s.helper}>Enter the Pokémon you are evaluating. Calculations remain available directly below.</Text>{draft.map((name, index) => <View key={index} style={s.inputRow}><View style={s.slot}><Text style={s.slotText}>{index + 1}</Text></View><TextInput value={name} onChangeText={(v) => setDraft((current) => current.map((x, i) => i === index ? v : x))} placeholder="Enter Pokémon" placeholderTextColor="#657383" autoCapitalize="words" style={s.pokemonInput} /></View>)}<Text style={s.smallLabel}>Quick test names</Text><View style={s.wrap}>{QUICK.map((name) => <TouchableOpacity key={name} onPress={() => { const empty = draft.findIndex((x) => !x); setDraft((current) => current.map((x, i) => i === (empty === -1 ? 0 : empty) ? name : x)); }} style={s.quick}><Text style={s.quickText}>{name}</Text></TouchableOpacity>)}</View></Section>

      <Section eyebrow="SCIENTIST" title="3. Cryptic clue"><Text style={s.helper}>Choose the phrase you were given. Tap ! when you need the associated move markers as a quick reminder.</Text><ScientistClueReference value={scientistStyle} onChange={setScientistStyle} /></Section>

      <TouchableOpacity style={s.primary} onPress={() => setStarted(true)} activeOpacity={0.86}><Text style={s.primaryText}>START FACTORY ANALYSIS</Text><Text style={s.primarySub}>{recognized.length}/3 recognized • {scientistStyle ? 'Scientist clue recorded' : 'No Scientist style selected'}</Text></TouchableOpacity>

      {started && <View style={s.analysis}><Text style={s.eyebrow}>LIVE WORKSPACE</Text><Text style={s.analysisTitle}>Draft analysis</Text><Text style={s.analysisCopy}>{levelMode} • Round {round || '1'} • Scientist style {scientistStyle || '—'}</Text>{speedSummary && <View style={s.feature}><Text style={s.featureTitle}>SPEED CHECK</Text><Text style={s.featureText}>{speedSummary.a.name}: {speedSummary.aMatchups.map((n, i) => `Set ${i + 1} beats ${n}/${speedSummary.b.sets.length}`).join(' • ')}</Text><Text style={s.featureText}>{speedSummary.b.name}: {speedSummary.bMatchups.map((n, i) => `Set ${i + 1} beats ${n}/${speedSummary.a.sets.length}`).join(' • ')}</Text><Text style={s.featureDetail}>{speedSummary.a.name} [{speedSummary.aSpeeds.join(', ')}] • {speedSummary.b.name} [{speedSummary.bSpeeds.join(', ')}]</Text></View>}{recognized.map((mon) => <View key={mon.name}><Text style={s.setSection}>{mon.name} — Factory sets</Text>{mon.sets.map((set) => <SetCard key={`${mon.name}-${set.id}`} pokemon={mon} set={set} level={level} round={round} />)}</View>)}</View>}

      <View style={s.calculator}><TouchableOpacity style={s.calcHeader} onPress={() => setCalculatorOpen((x) => !x)} activeOpacity={0.8}><View><Text style={s.eyebrow}>GEN III ENGINE</Text><Text style={s.calcTitle}>Damage & matchup calculator</Text></View><Text style={s.expand}>{calculatorOpen ? '−' : '+'}</Text></TouchableOpacity>{calculatorOpen && <><Text style={s.helper}>Damage is displayed as a range and checked against every loaded defender set.</Text><Text style={s.label}>Attacker</Text><View style={s.wrap}>{QUICK.map((name) => <TouchableOpacity key={name} onPress={() => selectAttacker(name)} style={[s.quick, attackerName === name && s.quickSelected]}><Text style={s.quickText}>{name}</Text></TouchableOpacity>)}</View>{attacker && <><Text style={s.label}>Attacker set</Text><View style={s.wrap}>{attacker.sets.map((set, index) => <Choice key={set.id} label={`Set ${set.id}`} selected={attackerSetIndex === index} onPress={() => { setAttackerSetIndex(index); setMoveName(bestDamagingMoves(set)[0] || ''); }} />)}</View></>}<Text style={s.label}>Move</Text><View style={s.wrap}>{moves.map((move) => <TouchableOpacity key={move} onPress={() => setMoveName(move)} style={[s.moveChip, moveName === move && s.moveSelected]}><Text style={s.moveText}>{move}</Text></TouchableOpacity>)}</View><Text style={s.label}>Defender</Text><View style={s.wrap}>{QUICK.map((name) => <TouchableOpacity key={name} onPress={() => { setDefenderName(name); setDefenderSetIndex(0); }} style={[s.quick, defenderName === name && s.quickSelected]}><Text style={s.quickText}>{name}</Text></TouchableOpacity>)}</View>{defender && <><Text style={s.label}>Defender set</Text><View style={s.wrap}>{defender.sets.map((set, index) => <Choice key={set.id} label={`Set ${set.id}`} selected={defenderSetIndex === index} onPress={() => setDefenderSetIndex(index)} />)}</View></>}<Text style={s.label}>Weather</Text><View style={s.wrap}>{WEATHER.map(([v, label]) => <Choice key={v} label={label} selected={weather === v} onPress={() => setWeather(v)} />)}</View><Text style={s.label}>Attacker status</Text><View style={s.wrap}>{STATUS.map(([v, label]) => <Choice key={v} label={label} selected={attackerStatus === v} onPress={() => setAttackerStatus(v)} />)}</View>{selectedDamage && <View style={s.result}><Text style={s.resultTitle}>{attacker.name} Set {attackerSet.id} → {defender.name} Set {defenderSet.id}</Text><Text style={s.resultMove}>{moveName} • {weather === 'none' ? 'No weather' : weather} • {attackerStatus}</Text>{selectedDamage.effectiveness === 0 ? <Text style={s.immune}>NO EFFECT</Text> : <><Text style={s.damage}>{selectedDamage.percentMin}%–{selectedDamage.percentMax}%</Text><Text style={s.damageSub}>{selectedDamage.min}–{selectedDamage.max} HP • {selectedDamage.ko}HKO at minimum damage</Text></>}</View>}<Text style={s.setSection}>All {defenderName} sets</Text>{allDefenderResults.map(({ set, damage }) => <View key={set.id} style={s.mini}><View style={s.rowBetween}><Text style={s.setTitle}>Set {set.id} • {set.item}</Text><Text style={s.speedPill}>{damage.effectiveness === 0 ? 'IMMUNE' : `${damage.percentMin}–${damage.percentMax}%`}</Text></View>{damage.effectiveness !== 0 && <Text style={s.meta}>{damage.min}–{damage.max} damage • {damage.ko}HKO minimum</Text>}</View>)}</>}</View>
      <Text style={s.footer}>Battle Factory Companion • v0.4.0</Text>
    </ScrollView>
  </SafeAreaView>;
}

function setDraftState(setter, index, value) { setter((current) => current.map((x, i) => i === index ? value : x)); }

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#071018' }, container: { padding: 16, paddingBottom: 44 }, header: { paddingTop: 18, paddingBottom: 22 }, brand: { color: '#8dd3ff', fontSize: 11, fontWeight: '900', letterSpacing: 2.2 }, title: { color: '#f7fafc', fontSize: 34, fontWeight: '900', marginTop: 5 }, subtitle: { color: '#b9c7d6', fontSize: 21, fontWeight: '800', marginTop: -2 }, headerCopy: { color: '#8190a0', fontSize: 14, lineHeight: 21, marginTop: 10 }, card: { backgroundColor: '#111b25', borderRadius: 20, padding: 16, marginBottom: 13, borderWidth: 1, borderColor: '#23313e' }, eyebrow: { color: '#63b7e8', fontSize: 10, fontWeight: '900', letterSpacing: 1.8, marginBottom: 5 }, sectionTitle: { color: '#f5f8fb', fontSize: 19, fontWeight: '900', marginBottom: 14 }, label: { color: '#a7b5c3', fontSize: 12, fontWeight: '800', marginTop: 12, marginBottom: 7 }, smallLabel: { color: '#768696', fontSize: 11, fontWeight: '800', marginTop: 14, marginBottom: 7 }, helper: { color: '#7f8e9d', fontSize: 12, lineHeight: 18 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, choice: { backgroundColor: '#0c141c', borderWidth: 1, borderColor: '#2a3947', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 }, choiceSelected: { backgroundColor: '#1d3a4b', borderColor: '#70c8f2' }, choiceText: { color: '#9aa9b8', fontSize: 12, fontWeight: '800' }, choiceTextSelected: { color: '#f4fbff' }, input: { backgroundColor: '#0a131b', borderWidth: 1, borderColor: '#2a3947', color: '#f5f8fb', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, fontSize: 16, fontWeight: '800' }, inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 }, slot: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#203342', alignItems: 'center', justifyContent: 'center', marginRight: 8 }, slotText: { color: '#a9dbf4', fontWeight: '900' }, pokemonInput: { flex: 1, backgroundColor: '#0a131b', borderWidth: 1, borderColor: '#293846', color: '#f5f8fb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 }, quick: { backgroundColor: '#17232e', borderWidth: 1, borderColor: '#2a3947', borderRadius: 13, paddingVertical: 8, paddingHorizontal: 10 }, quickSelected: { backgroundColor: '#23485c', borderColor: '#72c9f1' }, quickText: { color: '#b9c7d5', fontSize: 11, fontWeight: '800' }, primary: { backgroundColor: '#1e566f', borderRadius: 18, paddingVertical: 15, alignItems: 'center', marginBottom: 13, borderWidth: 1, borderColor: '#5ab4df' }, primaryText: { color: '#f5fbff', fontSize: 13, fontWeight: '900', letterSpacing: 1.1 }, primarySub: { color: '#b6d7e8', fontSize: 11, marginTop: 4, fontWeight: '700' }, analysis: { backgroundColor: '#0d1821', borderRadius: 20, padding: 16, marginBottom: 13, borderWidth: 1, borderColor: '#315266' }, analysisTitle: { color: '#f5f8fb', fontSize: 22, fontWeight: '900' }, analysisCopy: { color: '#8091a1', fontSize: 12, marginTop: 4, marginBottom: 14 }, feature: { backgroundColor: '#142532', borderRadius: 16, padding: 13, borderWidth: 1, borderColor: '#315366', marginBottom: 14 }, featureTitle: { color: '#82d0f5', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 7 }, featureText: { color: '#d5e3ec', fontSize: 12, lineHeight: 19 }, featureDetail: { color: '#7e96a7', fontSize: 10, lineHeight: 16, marginTop: 5 }, setSection: { color: '#d7e3eb', fontSize: 15, fontWeight: '900', marginBottom: 8, marginTop: 8 }, setCard: { backgroundColor: '#111b25', borderRadius: 15, padding: 12, borderWidth: 1, borderColor: '#253442', marginBottom: 8 }, rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, setTitle: { color: '#e7eef4', fontSize: 12, fontWeight: '900', flex: 1 }, speedPill: { color: '#8bd1f3', fontSize: 10, fontWeight: '900', backgroundColor: '#142d3b', borderRadius: 9, paddingVertical: 4, paddingHorizontal: 7 }, meta: { color: '#7f8f9e', fontSize: 10, lineHeight: 16, marginTop: 4 }, moveChip: { backgroundColor: '#192631', borderWidth: 1, borderColor: '#2b3b48', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 8 }, moveSelected: { backgroundColor: '#24485a', borderColor: '#6dc5ed' }, moveText: { color: '#b9cad7', fontSize: 10, fontWeight: '800' }, calculator: { backgroundColor: '#101a24', borderRadius: 20, padding: 16, marginBottom: 13, borderWidth: 1, borderColor: '#273745' }, calcHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, calcTitle: { color: '#f5f8fb', fontSize: 18, fontWeight: '900' }, expand: { color: '#8bd1f3', fontSize: 24 }, result: { backgroundColor: '#17303e', borderRadius: 16, padding: 14, marginTop: 14, borderWidth: 1, borderColor: '#4d91b2' }, resultTitle: { color: '#f5fbff', fontSize: 13, fontWeight: '900' }, resultMove: { color: '#8eabbc', fontSize: 10, marginTop: 4 }, damage: { color: '#8dd8ff', fontSize: 27, fontWeight: '900', marginTop: 12 }, damageSub: { color: '#c0d6e2', fontSize: 11, marginTop: 3 }, immune: { color: '#ffb4b4', fontSize: 18, fontWeight: '900', marginTop: 12 }, mini: { backgroundColor: '#0c151d', borderRadius: 12, padding: 10, marginTop: 7, borderWidth: 1, borderColor: '#22313d' }, footer: { color: '#536574', textAlign: 'center', fontSize: 10, marginTop: 4 }
});
