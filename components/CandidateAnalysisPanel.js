import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { analyzeFactoryCandidates } from '../data/candidateEngine';

const norm = (v) => String(v || '').trim().toLowerCase();

function setLabel(set) {
  return `${set.species || set.name || 'Unknown'} ${set.setId ?? set.sourceId ?? ''}`.trim();
}

function moveNames(set) {
  return (set.moves || []).map((move) => typeof move === 'string' ? move : move?.name).filter(Boolean);
}

export default function CandidateAnalysisPanel({
  draft = [],
  blockedSpecies = [],
  scientist = {},
  levelMode = 'Open Level',
  battle = 1,
  revealed = {},
  noland = false,
}) {
  const [result, setResult] = useState(null);
  const [expandedSpecies, setExpandedSpecies] = useState(null);
  const [busy, setBusy] = useState(false);

  const draftNames = useMemo(() => draft.map((p) => p?.species || p?.name).filter(Boolean), [draft]);

  const runAnalysis = () => {
    setBusy(true);
    // Candidate enumeration is intentionally user-triggered. The exact Factory
    // search can be expensive and should never make the draft screen sluggish.
    setTimeout(() => {
      try {
        const analysis = analyzeFactoryCandidates({
          draft,
          blockedSpecies,
          scientist,
          levelMode,
          battle,
          revealed,
          noland,
        });
        setResult(analysis);
        setExpandedSpecies(null);
      } finally {
        setBusy(false);
      }
    }, 0);
  };

  const speciesRows = useMemo(() => {
    if (!result?.matchingTeams) return [];
    const map = new Map();
    result.matchingTeams.forEach((team) => {
      team.forEach((set) => {
        const species = set?.species || set?.name;
        const key = norm(species);
        if (!key) return;
        if (!map.has(key)) map.set(key, { species, sets: new Map() });
        const row = map.get(key);
        const id = set?.setId ?? set?.sourceId ?? set?.id;
        row.sets.set(String(id ?? setLabel(set)), set);
      });
    });
    return [...map.values()].sort((a, b) => String(a.species).localeCompare(String(b.species)));
  }, [result]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>FACTORY INTELLIGENCE</Text>
          <Text style={styles.title}>What can I see next?</Text>
          <Text style={styles.subtitle}>
            Exact remaining opponent sets after the current restrictions and clues.
          </Text>
        </View>
        <View style={styles.roundBadge}>
          <Text style={styles.roundText}>B{Number(battle) || 1}</Text>
        </View>
      </View>

      <Pressable style={styles.analyzeButton} onPress={runAnalysis} disabled={busy}>
        <Text style={styles.analyzeText}>{busy ? 'ANALYZING…' : 'ANALYZE REMAINING SETS'}</Text>
      </Pressable>

      <Text style={styles.contextText}>
        Draft: {draftNames.length ? draftNames.join(' • ') : 'not entered'}
      </Text>

      {result && (
        <View style={styles.resultBox}>
          {!result.supported ? (
            <Text style={styles.warning}>{result.reason || 'This Factory pool is not supported by the current dataset.'}</Text>
          ) : (
            <>
              <View style={styles.statRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>{result.matchingTeams?.length ?? 0}</Text>
                  <Text style={styles.statLabel}>LEGAL TEAMS</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>{speciesRows.length}</Text>
                  <Text style={styles.statLabel}>POSSIBLE SPECIES</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Possible Pokémon</Text>
              <ScrollView style={styles.list} nestedScrollEnabled>
                {speciesRows.map((row) => {
                  const open = expandedSpecies === norm(row.species);
                  const sets = [...row.sets.values()];
                  return (
                    <View key={norm(row.species)} style={styles.speciesBlock}>
                      <Pressable
                        style={styles.speciesRow}
                        onPress={() => setExpandedSpecies(open ? null : norm(row.species))}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.speciesName}>{row.species}</Text>
                          <Text style={styles.setCount}>{sets.length} possible set{sets.length === 1 ? '' : 's'}</Text>
                        </View>
                        <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
                      </Pressable>
                      {open && sets.map((set, index) => (
                        <View key={`${setLabel(set)}-${index}`} style={styles.setCard}>
                          <Text style={styles.setName}>{setLabel(set)}</Text>
                          {!!set.item && <Text style={styles.detail}>Item: {set.item}</Text>}
                          {!!set.nature && <Text style={styles.detail}>Nature: {set.nature}</Text>}
                          {!!set.ability && <Text style={styles.detail}>Ability: {set.ability}</Text>}
                          {!!moveNames(set).length && <Text style={styles.detail}>Moves: {moveNames(set).join(' • ')}</Text>}
                        </View>
                      ))}
                    </View>
                  );
                })}
                {!speciesRows.length && <Text style={styles.empty}>No legal teams remain under the current information.</Text>}
              </ScrollView>
            </>
          )}
        </View>
      )}

      {!!blockedSpecies.length && (
        <Text style={styles.blocked}>
          Blocked by Factory rules: {blockedSpecies.join(' • ')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#e9e9e1', borderWidth: 3, borderColor: '#39423a', borderRadius: 16, padding: 12, marginTop: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4, color: '#536453' },
  title: { fontSize: 21, fontWeight: '900', color: '#263027', marginTop: 2 },
  subtitle: { fontSize: 12, color: '#4b554c', marginTop: 3, lineHeight: 17 },
  roundBadge: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#39423a', alignItems: 'center', justifyContent: 'center', backgroundColor: '#cbd7c6' },
  roundText: { fontWeight: '900', color: '#263027' },
  analyzeButton: { backgroundColor: '#314b38', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  analyzeText: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 0.7 },
  contextText: { color: '#5b625c', fontSize: 11, marginTop: 8 },
  resultBox: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#aeb5ad', paddingTop: 10 },
  warning: { backgroundColor: '#fff2cc', borderRadius: 9, padding: 10, color: '#5c4b1e', fontSize: 12, lineHeight: 17 },
  statRow: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, backgroundColor: '#d5ddd1', borderRadius: 10, padding: 9 },
  statNumber: { fontSize: 22, fontWeight: '900', color: '#263027' },
  statLabel: { fontSize: 9, fontWeight: '900', color: '#5a665b', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#263027', marginTop: 12, marginBottom: 5 },
  list: { maxHeight: 390 },
  speciesBlock: { borderBottomWidth: 1, borderBottomColor: '#c0c6bf' },
  speciesRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  speciesName: { fontSize: 15, fontWeight: '900', color: '#2c362e' },
  setCount: { fontSize: 11, color: '#657066', marginTop: 2 },
  chevron: { fontSize: 12, color: '#526153', paddingHorizontal: 5 },
  setCard: { backgroundColor: '#f5f5ef', borderRadius: 9, padding: 9, marginBottom: 7, borderLeftWidth: 3, borderLeftColor: '#71826f' },
  setName: { fontSize: 12, fontWeight: '900', color: '#303a32' },
  detail: { fontSize: 11, color: '#555e57', marginTop: 3, lineHeight: 15 },
  empty: { color: '#626a63', fontSize: 12, paddingVertical: 12 },
  blocked: { color: '#667067', fontSize: 10, marginTop: 8, lineHeight: 14 },
});
