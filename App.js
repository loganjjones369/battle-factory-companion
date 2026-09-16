import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FACTORY_RULES, getPokemon } from './data/factoryData';

const LEVELS = ['Open Level', 'Level 50'];
const STARTER_POKEMON = ['Heracross', 'Regice', 'Moltres', 'Gardevoir', 'Metagross', 'Swampert'];

const NATURE_SPEED = {
  Timid: 1.1,
  Jolly: 1.1,
  Hasty: 1.1,
  Naive: 1.1,
  Modest: 1,
  Adamant: 1,
  Brave: 0.9,
  Quiet: 0.9,
  Relaxed: 0.9,
  Sassy: 0.9,
};

function ChoiceButton({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.choice, selected && styles.choiceSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function PokemonInput({ value, onChangeText, index }) {
  return (
    <View style={styles.pokemonRow}>
      <View style={styles.slotBadge}>
        <Text style={styles.slotText}>{index + 1}</Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Enter Pokémon"
        placeholderTextColor="#718096"
        autoCapitalize="words"
        style={styles.pokemonInput}
      />
    </View>
  );
}

function getSpeed(pokemon, set, levelMode, round) {
  const level = levelMode === 'Level 50' ? 50 : 100;
  const iv = FACTORY_RULES.rentalIVsByRound[Math.min(Math.max(Number(round) || 1, 1), 7)] || 31;
  const ev = set.evs.spe || 0;
  const base = pokemon.baseStats.spe;
  const raw = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
  return Math.floor(raw * (NATURE_SPEED[set.nature] || 1));
}

function SetCard({ pokemon, set, levelMode, round }) {
  const speed = getSpeed(pokemon, set, levelMode, round);
  const evText = Object.entries(set.evs).map(([stat, value]) => `${value} ${stat.toUpperCase()}`).join(' / ');

  return (
    <View style={styles.setCard}>
      <View style={styles.setHeader}>
        <Text style={styles.setName}>{pokemon.name} {set.id}</Text>
        <Text style={styles.setSpeed}>Speed {speed}</Text>
      </View>
      <Text style={styles.setMeta}>{set.nature} • {set.item}</Text>
      <Text style={styles.setMeta}>EVs: {evText || 'none listed'}</Text>
      <View style={styles.moveWrap}>
        {set.moves.map((move) => (
          <View key={move} style={styles.moveChip}>
            <Text style={styles.moveText}>{move}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function App() {
  const [levelMode, setLevelMode] = useState('Open Level');
  const [round, setRound] = useState('1');
  const [pokemon, setPokemon] = useState(['', '', '']);
  const [scientist, setScientist] = useState('');
  const [started, setStarted] = useState(false);

  const knownPokemon = useMemo(
    () => pokemon.filter(Boolean).length,
    [pokemon]
  );

  const recognizedPokemon = useMemo(
    () => pokemon.map((name) => getPokemon(name)).filter(Boolean),
    [pokemon]
  );

  const updatePokemon = (index, value) => {
    setPokemon((current) => current.map((name, i) => (i === index ? value : name)));
  };

  const speedSummary = useMemo(() => {
    if (recognizedPokemon.length !== 2) return null;
    const [a, b] = recognizedPokemon;
    const aSpeeds = a.sets.map((set) => getSpeed(a, set, levelMode, round));
    const bSpeeds = b.sets.map((set) => getSpeed(b, set, levelMode, round));
    const aFaster = aSpeeds.filter((speed) => speed > Math.max(...bSpeeds)).length;
    const bFaster = bSpeeds.filter((speed) => speed > Math.max(...aSpeeds)).length;
    const aWins = aSpeeds.filter((speed) => bSpeeds.some((other) => speed > other)).length;
    const bWins = bSpeeds.filter((speed) => aSpeeds.some((other) => speed > other)).length;
    return { a, b, aSpeeds, bSpeeds, aFaster, bFaster, aWins, bWins };
  }, [recognizedPokemon, levelMode, round]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>POKÉMON EMERALD</Text>
          <Text style={styles.title}>Battle Factory</Text>
          <Text style={styles.subtitle}>Companion</Text>
          <Text style={styles.headerCopy}>
            Your offline assistant for drafting, matchups, sets, speed and damage.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Factory setup</Text>
          <Text style={styles.label}>Battle level</Text>
          <View style={styles.choiceGrid}>
            {LEVELS.map((level) => (
              <ChoiceButton
                key={level}
                label={level}
                selected={levelMode === level}
                onPress={() => setLevelMode(level)}
              />
            ))}
          </View>

          <Text style={styles.label}>Current round</Text>
          <TextInput
            value={round}
            onChangeText={setRound}
            keyboardType="number-pad"
            maxLength={2}
            style={styles.roundInput}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2. Your draft</Text>
          <Text style={styles.helper}>
            Enter Pokémon names to load their local Emerald Factory sets. The app does not need an internet connection for this data.
          </Text>
          {pokemon.map((name, index) => (
            <PokemonInput
              key={index}
              index={index}
              value={name}
              onChangeText={(value) => updatePokemon(index, value)}
            />
          ))}

          <View style={styles.quickList}>
            <Text style={styles.quickTitle}>Quick test names</Text>
            <View style={styles.quickWrap}>
              {STARTER_POKEMON.map((name) => (
                <TouchableOpacity
                  key={name}
                  onPress={() => {
                    const emptyIndex = pokemon.findIndex((item) => !item);
                    updatePokemon(emptyIndex === -1 ? 0 : emptyIndex, name);
                  }}
                  style={styles.quickChip}
                >
                  <Text style={styles.quickText}>{name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>3. Scientist information</Text>
          <TextInput
            value={scientist}
            onChangeText={setScientist}
            placeholder="Enter notes / information"
            placeholderTextColor="#718096"
            multiline
            style={styles.notesInput}
          />
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setStarted(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Start Factory Analysis</Text>
          <Text style={styles.primaryButtonSubtext}>
            {knownPokemon}/3 Pokémon entered
          </Text>
        </TouchableOpacity>

        {started && (
          <View style={styles.analysisCard}>
            <Text style={styles.analysisEyebrow}>LIVE DATA</Text>
            <Text style={styles.analysisTitle}>Draft analysis workspace</Text>
            <Text style={styles.analysisCopy}>
              {levelMode} • Round {round || '1'} • Rental IVs {FACTORY_RULES.rentalIVsByRound[Math.min(Math.max(Number(round) || 1, 1), 7)] || 31}
            </Text>

            {speedSummary && (
              <View style={styles.speedSummary}>
                <Text style={styles.featureTitle}>SPEED CHECK</Text>
                <Text style={styles.summaryText}>
                  {speedSummary.aFaster > 0
                    ? `${speedSummary.aFaster}/4 ${speedSummary.a.name} sets are faster than every ${speedSummary.b.name} set.`
                    : `No ${speedSummary.a.name} set is faster than every ${speedSummary.b.name} set.`}
                </Text>
                <Text style={styles.summaryText}>
                  {speedSummary.bFaster > 0
                    ? `${speedSummary.bFaster}/4 ${speedSummary.b.name} sets are faster than every ${speedSummary.a.name} set.`
                    : `No ${speedSummary.b.name} set is faster than every ${speedSummary.a.name} set.`}
                </Text>
                <Text style={styles.summaryDetail}>
                  Set speeds: {speedSummary.a.name} [{speedSummary.aSpeeds.join(', ')}] • {speedSummary.b.name} [{speedSummary.bSpeeds.join(', ')}]
                </Text>
              </View>
            )}

            {recognizedPokemon.map((mon) => (
              <View key={mon.name} style={styles.pokemonSets}>
                <Text style={styles.setSectionTitle}>{mon.name} — all known Factory sets</Text>
                {mon.sets.map((set) => (
                  <SetCard key={`${mon.name}-${set.id}`} pokemon={mon} set={set} levelMode={levelMode} round={round} />
                ))}
              </View>
            ))}

            {recognizedPokemon.length === 0 && (
              <Text style={styles.nextText}>
                Enter one of the loaded Pokémon names above to see its real Factory sets. More species will be added to the local data pack next.
              </Text>
            )}
          </View>
        )}

        <Text style={styles.footer}>Battle Factory Companion • v0.2.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0b1016' },
  container: { padding: 20, paddingBottom: 40 },
  header: { paddingTop: 18, paddingBottom: 24 },
  eyebrow: { color: '#8dd3ff', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: '#f7fafc', fontSize: 34, fontWeight: '900', marginTop: 5 },
  subtitle: { color: '#cbd5e0', fontSize: 22, fontWeight: '700', marginTop: -3 },
  headerCopy: { color: '#8a99aa', fontSize: 14, lineHeight: 21, marginTop: 12, maxWidth: 340 },
  card: { backgroundColor: '#141b24', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#222c38' },
  sectionTitle: { color: '#f7fafc', fontSize: 18, fontWeight: '800', marginBottom: 16 },
  label: { color: '#9eabb9', fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 2 },
  choiceGrid: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  choice: { flex: 1, borderRadius: 12, paddingVertical: 13, borderWidth: 1, borderColor: '#344152', alignItems: 'center', backgroundColor: '#10161e' },
  choiceSelected: { borderColor: '#8dd3ff', backgroundColor: '#173047' },
  choiceText: { color: '#9eabb9', fontWeight: '700' },
  choiceTextSelected: { color: '#dff4ff' },
  roundInput: { backgroundColor: '#0e141c', borderRadius: 12, borderWidth: 1, borderColor: '#344152', color: '#fff', paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  helper: { color: '#8492a3', fontSize: 13, lineHeight: 19, marginTop: -7, marginBottom: 14 },
  pokemonRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  slotBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#263343', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  slotText: { color: '#d9e2ec', fontWeight: '800' },
  pokemonInput: { flex: 1, backgroundColor: '#0e141c', borderRadius: 12, borderWidth: 1, borderColor: '#344152', color: '#fff', paddingHorizontal: 14, paddingVertical: 11, fontSize: 16 },
  quickList: { marginTop: 8 },
  quickTitle: { color: '#6f7f91', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 9 },
  quickWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  quickChip: { borderRadius: 20, backgroundColor: '#1b2633', paddingHorizontal: 11, paddingVertical: 7 },
  quickText: { color: '#b8c5d3', fontSize: 12, fontWeight: '700' },
  notesInput: { minHeight: 92, backgroundColor: '#0e141c', borderRadius: 12, borderWidth: 1, borderColor: '#344152', color: '#fff', paddingHorizontal: 14, paddingVertical: 12, textAlignVertical: 'top', fontSize: 15 },
  primaryButton: { backgroundColor: '#2d8cff', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 2, marginBottom: 14 },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  primaryButtonSubtext: { color: '#d9edff', fontSize: 11, fontWeight: '700', marginTop: 3 },
  analysisCard: { backgroundColor: '#10202b', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#24516a', marginBottom: 14 },
  analysisEyebrow: { color: '#7dd3fc', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  analysisTitle: { color: '#f7fafc', fontSize: 20, fontWeight: '900', marginTop: 4 },
  analysisCopy: { color: '#9fb2c4', marginTop: 4 },
  speedSummary: { backgroundColor: '#152b39', borderRadius: 12, padding: 12, marginTop: 15, marginBottom: 15 },
  summaryText: { color: '#e3edf5', fontSize: 13, lineHeight: 19, marginTop: 5 },
  summaryDetail: { color: '#8298aa', fontSize: 11, lineHeight: 17, marginTop: 8 },
  pokemonSets: { marginTop: 8 },
  setSectionTitle: { color: '#dceaf5', fontSize: 15, fontWeight: '900', marginBottom: 8, marginTop: 7 },
  setCard: { backgroundColor: '#141f29', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#263847' },
  setHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  setName: { color: '#fff', fontSize: 14, fontWeight: '900' },
  setSpeed: { color: '#7dd3fc', fontSize: 12, fontWeight: '800' },
  setMeta: { color: '#8ea1b2', fontSize: 11, marginTop: 4 },
  moveWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  moveChip: { backgroundColor: '#1d2a36', borderRadius: 14, paddingHorizontal: 8, paddingVertical: 5 },
  moveText: { color: '#c5d3df', fontSize: 10, fontWeight: '700' },
  featureTitle: { color: '#7dd3fc', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  nextText: { color: '#879aab', fontSize: 12, lineHeight: 18, marginTop: 15 },
  footer: { textAlign: 'center', color: '#4f5d6b', fontSize: 11, marginTop: 8 },
});
