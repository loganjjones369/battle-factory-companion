import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getPokemon } from './data/factoryData';
import { bestDamagingMoves, calculateDamage, getFactoryIV, getStats } from './data/damageCalc';

const LEVELS = ['Open Level', 'Level 50'];
const WEATHER = [['none', 'None'], ['sun', 'Sun'], ['rain', 'Rain'], ['hail', 'Hail']];
const STATUS = [['healthy', 'Healthy'], ['burned', 'Burned']];
const STARTER_POKEMON = ['Heracross', 'Regice', 'Moltres', 'Gardevoir', 'Metagross', 'Swampert'];
const SPEED_NATURES = { Timid: 1.1, Jolly: 1.1, Hasty: 1.1, Naive: 1.1, Brave: 0.9, Quiet: 0.9, Relaxed: 0.9, Sassy: 0.9 };

function ChoiceButton({ label, selected, onPress }) {
  return <TouchableOpacity style={[styles.choice, selected && styles.choiceSelected]} onPress={onPress} activeOpacity={0.8}><Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text></TouchableOpacity>;
}

function PokemonInput({ value, onChangeText, index }) {
  return <View style={styles.pokemonRow}><View style={styles.slotBadge}><Text style={styles.slotText}>{index + 1}</Text></View><TextInput value={value} onChangeText={onChangeText} placeholder="Enter Pokémon" placeholderTextColor="#718096" autoCapitalize="words" style={styles.pokemonInput} /></View>;
}

function SetCard({ pokemon, set, levelMode, round }) {
  const level = levelMode === 'Level 50' ? 50 : 100;
  const stats = getStats(pokemon, set, level, round);
  const evText = Object.entries(set.evs).map(([stat, value]) => `${value} ${stat.toUpperCase()}`).join(' / ');
  return <View style={styles.setCard}>
    <View style={styles.setHeader}><Text style={styles.setName}>{pokemon.name} {set.id}</Text><Text style={styles.setSpeed}>Speed {stats.spe}</Text></View>
    <Text style={styles.setMeta}>{set.nature} • {set.item}</Text>
    <Text style={styles.setMeta}>HP {stats.hp} • Atk {stats.atk} • Def {stats.def} • SpA {stats.spa} • SpD {stats.spd}</Text>
    <Text style={styles.setMeta}>EVs: {evText || 'none listed'}</Text>
    <View style={styles.moveWrap}>{set.moves.map((move) => <View key={move} style={styles.moveChip}><Text style={styles.moveText}>{move}</Text></View>)}</View>
  </View>;
}

export default function App() {
  const [levelMode, setLevelMode] = useState('Open Level');
  const [round, setRound] = useState('1');
  const [pokemon, setPokemon] = useState(['', '', '']);
  const [scientist, setScientist] = useState('');
  const [started, setStarted] = useState(false);
  const [attackerName, setAttackerName] = useState('Heracross');
  const [defenderName, setDefenderName] = useState('Regice');
  const [attackerSetIndex, setAttackerSetIndex] = useState(0);
  const [defenderSetIndex, setDefenderSetIndex] = useState(0);
  const [moveName, setMoveName] = useState('Megahorn');
  const [weather, setWeather] = useState('none');
  const [attackerStatus, setAttackerStatus] = useState('healthy');
  const [calculatorOpen, setCalculatorOpen] = useState(true);

  const knownPokemon = useMemo(() => pokemon.filter(Boolean).length, [pokemon]);
  const recognizedPokemon = useMemo(() => pokemon.map((name) => getPokemon(name)).filter(Boolean), [pokemon]);
  const attacker = getPokemon(attackerName);
  const defender = getPokemon(defenderName);
  const attackerSet = attacker?.sets[attackerSetIndex] || attacker?.sets[0];
  const defenderSet = defender?.sets[defenderSetIndex] || defender?.sets[0];
  const damagingMoves = attackerSet ? bestDamagingMoves(attackerSet) : [];
  const level = levelMode === 'Level 50' ? 50 : 100;

  const speedSummary = useMemo(() => {
    if (recognizedPokemon.length !== 2) return null;
    const [a, b] = recognizedPokemon;
    const speeds = (mon) => mon.sets.map((set) => Math.floor(getStats(mon, set, level, round).spe * (SPEED_NATURES[set.nature] || 1)));
    const aSpeeds = speeds(a); const bSpeeds = speeds(b);
    return { a, b, aSpeeds, bSpeeds, aFaster: aSpeeds.filter((v) => v > Math.max(...bSpeeds)).length, bFaster: bSpeeds.filter((v) => v > Math.max(...aSpeeds)).length };
  }, [recognizedPokemon, level, round]);

  const selectedDamage = useMemo(() => {
    if (!attacker || !defender || !attackerSet || !defenderSet || !moveName) return null;
    return calculateDamage({ attacker, attackerSet, defender, defenderSet, level, round, moveName, weather, attackerStatus });
  }, [attacker, defender, attackerSet, defenderSet, moveName, level, round, weather, attackerStatus]);

  const allDefenderResults = useMemo(() => {
    if (!attacker || !defender || !attackerSet || !moveName) return [];
    return defender.sets.map((set) => ({ set, damage: calculateDamage({ attacker, attackerSet, defender, defenderSet: set, level, round, moveName, weather, attackerStatus }) }));
  }, [attacker, defender, attackerSet, moveName, level, round, weather, attackerStatus]);

  const updatePokemon = (index, value) => setPokemon((current) => current.map((name, i) => i === index ? value : name));
  const selectAttacker = (name) => { const mon = getPokemon(name); setAttackerName(name); setAttackerSetIndex(0); setMoveName(bestDamagingMoves(mon?.sets?.[0] || {})[0] || ''); };

  return <SafeAreaView style={styles.safeArea}>
    <StatusBar style="light" />
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}><Text style={styles.eyebrow}>POKÉMON EMERALD</Text><Text style={styles.title}>Battle Factory</Text><Text style={styles.subtitle}>Companion</Text><Text style={styles.headerCopy}>Offline drafting, Factory sets, speed checks and Gen III damage calculations.</Text></View>

      <View style={styles.card}><Text style={styles.sectionTitle}>1. Factory setup</Text><Text style={styles.label}>Battle level</Text><View style={styles.choiceGrid}>{LEVELS.map((item) => <ChoiceButton key={item} label={item} selected={levelMode === item} onPress={() => setLevelMode(item)} />)}</View><Text style={styles.label}>Current round</Text><TextInput value={round} onChangeText={setRound} keyboardType="number-pad" maxLength={2} style={styles.roundInput} /><Text style={styles.ivText}>Rental IVs for this round: {getFactoryIV(round)}</Text></View>

      <View style={styles.card}><Text style={styles.sectionTitle}>2. Your draft</Text><Text style={styles.helper}>Enter the three Pokémon currently available. The local data pack powers the analysis without an internet connection.</Text>{pokemon.map((name, index) => <PokemonInput key={index} index={index} value={name} onChangeText={(value) => updatePokemon(index, value)} />)}<Text style={styles.quickTitle}>Quick test names</Text><View style={styles.quickWrap}>{STARTER_POKEMON.map((name) => <TouchableOpacity key={name} onPress={() => { const empty = pokemon.findIndex((item) => !item); updatePokemon(empty === -1 ? 0 : empty, name); }} style={styles.quickChip}><Text style={styles.quickText}>{name}</Text></TouchableOpacity>)}</View></View>

      <View style={styles.card}><Text style={styles.sectionTitle}>3. Scientist information</Text><TextInput value={scientist} onChangeText={setScientist} placeholder="Enter notes / information" placeholderTextColor="#718096" multiline style={styles.notesInput} /></View>
      <TouchableOpacity style={styles.primaryButton} onPress={() => setStarted(true)} activeOpacity={0.85}><Text style={styles.primaryButtonText}>Start Factory Analysis</Text><Text style={styles.primaryButtonSubtext}>{knownPokemon}/3 Pokémon entered</Text></TouchableOpacity>

      {started && <View style={styles.analysisCard}><Text style={styles.analysisEyebrow}>LIVE FACTORY DATA</Text><Text style={styles.analysisTitle}>Draft analysis workspace</Text><Text style={styles.analysisCopy}>{levelMode} • Round {round || '1'} • Rental IVs {getFactoryIV(round)}</Text>{speedSummary && <View style={styles.speedSummary}><Text style={styles.featureTitle}>SPEED CHECK</Text><Text style={styles.summaryText}>{speedSummary.aFaster ? `${speedSummary.aFaster}/4 ${speedSummary.a.name} sets are faster than every ${speedSummary.b.name} set.` : `No ${speedSummary.a.name} set is faster than every ${speedSummary.b.name} set.`}</Text><Text style={styles.summaryText}>{speedSummary.bFaster ? `${speedSummary.bFaster}/4 ${speedSummary.b.name} sets are faster than every ${speedSummary.a.name} set.` : `No ${speedSummary.b.name} set is faster than every ${speedSummary.a.name} set.`}</Text><Text style={styles.summaryDetail}>Set speeds: {speedSummary.a.name} [{speedSummary.aSpeeds.join(', ')}] • {speedSummary.b.name} [{speedSummary.bSpeeds.join(', ')}]</Text></View>}{recognizedPokemon.map((mon) => <View key={mon.name} style={styles.pokemonSets}><Text style={styles.setSectionTitle}>{mon.name} — loaded Factory sets</Text>{mon.sets.map((set) => <SetCard key={`${mon.name}-${set.id}`} pokemon={mon} set={set} levelMode={levelMode} round={round} />)}</View>)}</View>}

      <View style={styles.calculatorCard}>
        <TouchableOpacity onPress={() => setCalculatorOpen((open) => !open)} style={styles.calcHeader} activeOpacity={0.8}><View><Text style={styles.analysisEyebrow}>GEN III ENGINE</Text><Text style={styles.calcTitle}>Damage & matchup calculator</Text></View><Text style={styles.expand}>{calculatorOpen ? '−' : '+'}</Text></TouchableOpacity>
        {calculatorOpen && <>
          <Text style={styles.helper}>Run a real matchup directly from the draft screen. The result shows the damage roll and compares the same attack against every loaded defender set.</Text>
          <Text style={styles.label}>Attacker</Text><View style={styles.quickWrap}>{STARTER_POKEMON.map((name) => <TouchableOpacity key={name} onPress={() => selectAttacker(name)} style={[styles.quickChip, attackerName === name && styles.quickChipSelected]}><Text style={styles.quickText}>{name}</Text></TouchableOpacity>)}</View>
          {attacker && <><Text style={styles.label}>Attacker set</Text><View style={styles.quickWrap}>{attacker.sets.map((set, index) => <TouchableOpacity key={set.id} onPress={() => { setAttackerSetIndex(index); setMoveName(bestDamagingMoves(set)[0] || ''); }} style={[styles.quickChip, attackerSetIndex === index && styles.quickChipSelected]}><Text style={styles.quickText}>Set {set.id}</Text></TouchableOpacity>)}</View></>}
          <Text style={styles.label}>Move</Text><View style={styles.moveWrap}>{damagingMoves.map((move) => <TouchableOpacity key={move} onPress={() => setMoveName(move)} style={[styles.moveChip, moveName === move && styles.moveChipSelected]}><Text style={styles.moveText}>{move}</Text></TouchableOpacity>)}</View>
          <Text style={styles.label}>Defender</Text><View style={styles.quickWrap}>{STARTER_POKEMON.map((name) => <TouchableOpacity key={name} onPress={() => { setDefenderName(name); setDefenderSetIndex(0); }} style={[styles.quickChip, defenderName === name && styles.quickChipSelected]}><Text style={styles.quickText}>{name}</Text></TouchableOpacity>)}</View>
          {defender && <><Text style={styles.label}>Defender set</Text><View style={styles.quickWrap}>{defender.sets.map((set, index) => <TouchableOpacity key={set.id} onPress={() => setDefenderSetIndex(index)} style={[styles.quickChip, defenderSetIndex === index && styles.quickChipSelected]}><Text style={styles.quickText}>Set {set.id}</Text></TouchableOpacity>)}</View></>}
          <Text style={styles.label}>Weather</Text><View style={styles.choiceGrid}>{WEATHER.map(([value, label]) => <ChoiceButton key={value} label={label} selected={weather === value} onPress={() => setWeather(value)} />)}</View>
          <Text style={styles.label}>Attacker status</Text><View style={styles.choiceGrid}>{STATUS.map(([value, label]) => <ChoiceButton key={value} label={label} selected={attackerStatus === value} onPress={() => setAttackerStatus(value)} />)}</View>
          {selectedDamage && <View style={styles.resultCard}><Text style={styles.resultTitle}>{attacker.name} Set {attackerSet.id} → {defender.name} Set {defenderSet.id}</Text><Text style={styles.resultMove}>{moveName} • {weather === 'none' ? 'No weather' : weather} • {attackerStatus}</Text>{selectedDamage.effectiveness === 0 ? <Text style={styles.immune}>No effect.</Text> : <><Text style={styles.damageBig}>{selectedDamage.min}–{selectedDamage.max} HP damage</Text><Text style={styles.damagePercent}>{selectedDamage.percentMin}%–{selectedDamage.percentMax}% of {selectedDamage.hp} HP</Text><Text style={styles.koText}>Guaranteed minimum-damage KO: {selectedDamage.ko} hit{selectedDamage.ko === 1 ? '' : 's'}</Text></>}</View>}
          <Text style={styles.setSectionTitle}>All known {defenderName} sets</Text>{allDefenderResults.map(({ set, damage }) => <View key={set.id} style={styles.miniResult}><View style={styles.setHeader}><Text style={styles.setName}>Set {set.id} • {set.nature} • {set.item}</Text><Text style={styles.setSpeed}>{damage.effectiveness === 0 ? 'IMMUNE' : `${damage.percentMin}–${damage.percentMax}%`}</Text></View>{damage.effectiveness !== 0 && <Text style={styles.setMeta}>{damage.min}–{damage.max} damage • {damage.ko}HKO at minimum damage</Text>}</View>)}
        </>}
      </View>
      <Text style={styles.footer}>Battle Factory Companion • v0.3.0</Text>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0b1016' }, container: { padding: 20, paddingBottom: 40 }, header: { paddingTop: 18, paddingBottom: 24 }, eyebrow: { color: '#8dd3ff', fontSize: 12, fontWeight: '800', letterSpacing: 2 }, title: { color: '#f7fafc', fontSize: 34, fontWeight: '900', marginTop: 5 }, subtitle: { color: '#cbd5e0', fontSize: 22, fontWeight: '700', marginTop: -3 }, headerCopy: { color: '#8a99aa', fontSize: 14, lineHeight: 21, marginTop: 12 },
  card: { backgroundColor: '#141b24', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#222c38' }, sectionTitle: { color: '#f7fafc', fontSize: 18, fontWeight: '800', marginBottom: 16 }, label: { color: '#9eabb9', fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 12 }, choiceGrid: { flexDirection: 'row', gap: 8, marginBottom: 10 }, choice: { flex: 1, borderRadius: 10, paddingVertical: 11, borderWidth: 1, borderColor: '#344152', alignItems: 'center', backgroundColor: '#10161e', marginBottom: 6 }, choiceSelected: { borderColor: '#8dd3ff', backgroundColor: '#173047' }, choiceText: { color: '#9eabb9', fontWeight: '700', fontSize: 12 }, choiceTextSelected: { color: '#dff4ff' }, roundInput: { backgroundColor: '#0e141c', borderRadius: 12, borderWidth: 1, borderColor: '#344152', color: '#fff', paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 }, ivText: { color: '#7f91a2', fontSize: 12, marginTop: 8 }, helper: { color: '#8492a3', fontSize: 13, lineHeight: 19, marginTop: -3, marginBottom: 10 },
  pokemonRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 }, slotBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#263343', alignItems: 'center', justifyContent: 'center', marginRight: 10 }, slotText: { color: '#d9e2ec', fontWeight: '800' }, pokemonInput: { flex: 1, backgroundColor: '#0e141c', borderRadius: 12, borderWidth: 1, borderColor: '#344152', color: '#fff', paddingHorizontal: 14, paddingVertical: 11, fontSize: 16 }, quickTitle: { color: '#6f7f91', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 9, marginTop: 8 }, quickWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, quickChip: { borderRadius: 20, backgroundColor: '#1b2633', paddingHorizontal: 11, paddingVertical: 7 }, quickChipSelected: { backgroundColor: '#24516a', borderWidth: 1, borderColor: '#7dd3fc' }, quickText: { color: '#b8c5d3', fontSize: 12, fontWeight: '700' }, notesInput: { minHeight: 92, backgroundColor: '#0e141c', borderRadius: 12, borderWidth: 1, borderColor: '#344152', color: '#fff', paddingHorizontal: 14, paddingVertical: 12, textAlignVertical: 'top', fontSize: 15 },
  primaryButton: { backgroundColor: '#2d8cff', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginBottom: 14 }, primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '900' }, primaryButtonSubtext: { color: '#d9edff', fontSize: 11, fontWeight: '700', marginTop: 3 }, analysisCard: { backgroundColor: '#10202b', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#24516a', marginBottom: 14 }, analysisEyebrow: { color: '#7dd3fc', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 }, analysisTitle: { color: '#f7fafc', fontSize: 20, fontWeight: '900', marginTop: 4 }, analysisCopy: { color: '#9fb2c4', marginTop: 4 }, speedSummary: { backgroundColor: '#152b39', borderRadius: 12, padding: 12, marginTop: 15, marginBottom: 15 }, featureTitle: { color: '#7dd3fc', fontSize: 10, fontWeight: '900' }, summaryText: { color: '#e3edf5', fontSize: 13, lineHeight: 19, marginTop: 5 }, summaryDetail: { color: '#8298aa', fontSize: 11, lineHeight: 17, marginTop: 8 }, pokemonSets: { marginTop: 8 }, setSectionTitle: { color: '#dceaf5', fontSize: 15, fontWeight: '900', marginBottom: 8, marginTop: 14 }, setCard: { backgroundColor: '#141f29', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#263847' }, setHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, setName: { color: '#fff', fontSize: 14, fontWeight: '900', flex: 1 }, setSpeed: { color: '#7dd3fc', fontSize: 12, fontWeight: '800' }, setMeta: { color: '#8fa2b3', fontSize: 11, lineHeight: 17, marginTop: 3 }, moveWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }, moveChip: { borderRadius: 14, backgroundColor: '#1b2a36', paddingHorizontal: 9, paddingVertical: 5 }, moveChipSelected: { backgroundColor: '#24516a', borderWidth: 1, borderColor: '#7dd3fc' }, moveText: { color: '#c6d5e1', fontSize: 11, fontWeight: '700' },
  calculatorCard: { backgroundColor: '#141b24', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#344152' }, calcHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, calcTitle: { color: '#f7fafc', fontSize: 20, fontWeight: '900', marginTop: 3 }, expand: { color: '#7dd3fc', fontSize: 28, fontWeight: '300' }, resultCard: { backgroundColor: '#10202b', borderRadius: 14, padding: 14, marginTop: 16, borderWidth: 1, borderColor: '#24516a' }, resultTitle: { color: '#fff', fontSize: 15, fontWeight: '900' }, resultMove: { color: '#8faabd', fontSize: 11, marginTop: 4 }, damageBig: { color: '#7dd3fc', fontSize: 22, fontWeight: '900', marginTop: 12 }, damagePercent: { color: '#d9e7f0', fontSize: 14, marginTop: 3 }, koText: { color: '#b6c8d5', fontSize: 12, marginTop: 8 }, immune: { color: '#ffb4b4', fontSize: 17, fontWeight: '900', marginTop: 12 }, miniResult: { backgroundColor: '#0e151d', borderRadius: 10, padding: 11, marginBottom: 7, borderWidth: 1, borderColor: '#273544' }, footer: { textAlign: 'center', color: '#4f5d6b', fontSize: 11, marginTop: 8 },
});
