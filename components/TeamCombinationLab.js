import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getDraftSetPools } from '../data/factoryPools';
import { calculateDamage, getStats, getEffectiveSpeed, bestDamagingMoves } from '../data/damageCalc';
import { optionsFor } from './AbilitySelector';
import DraftMatchupMatrix from './DraftMatchupMatrix';

const norm = (v) => String(v || '').trim().toLowerCase();
const key = (p) => `${norm(p?.species)}#${p?.setId ?? ''}`;
const empty = [];

const elevationToSwaps = (elevation) => [0, 15, 22, 29, 36, 43][Math.max(0, Math.min(5, Number(elevation) || 0))];

function withDraftStats(set, draftEntry, level, round) {
  return {
    ...set,
    species: set.species || draftEntry?.species,
    setId: set.id ?? set.setId,
    factoryIV: draftEntry?.factoryIV,
    isElevated: draftEntry?.isElevated,
    level,
    round,
  };
}

function setOptionsForSlot(draftEntry, slotIndex, pool) {
  if (!draftEntry || !pool?.supported) return empty;
  const source = slotIndex < pool.elevation ? pool.upgradedPool : pool.regularPool;
  return source.filter((set) => norm(set.species) === norm(draftEntry.species));
}

function bestPressure(attacker, defender, level, round) {
  const moves = bestDamagingMoves(attacker);
  let best = null;
  for (const moveName of moves) {
    const result = calculateDamage({
      attacker,
      attackerSet: attacker,
      defender,
      defenderSet: defender,
      level,
      round,
      moveName,
      attackerAbility: optionsFor(attacker)[0] || '',
      defenderAbility: optionsFor(defender)[0] || '',
    });
    if (!result.unsupported && (!best || result.percentMax > best.percentMax)) {
      best = { ...result, moveName };
    }
  }
  return best;
}

function speedOf(pokemon, level, round) {
  return getEffectiveSpeed(getStats(pokemon, pokemon, level, round), 'healthy');
}

function combinations(items, choose = 3) {
  const out = [];
  for (let a = 0; a < items.length; a += 1) {
    for (let b = a + 1; b < items.length; b += 1) {
      for (let c = b + 1; c < items.length; c += 1) out.push([items[a], items[b], items[c]]);
    }
  }
  return out;
}

function evaluateCombination(combo, draft, optionsBySlot, level, round) {
  const comboIndices = combo.map((entry) => entry.index);
  const leftBehind = draft.map((p, i) => ({ p, index: i })).filter((entry) => !comboIndices.includes(entry.index));
  const variantLists = combo.map((entry) => optionsBySlot[entry.index] || []);
  const variants = [];

  const walk = (depth, chosen) => {
    if (variants.length >= 180) return;
    if (depth === variantLists.length) {
      variants.push(chosen);
      return;
    }
    for (const set of variantLists[depth]) walk(depth + 1, [...chosen, set]);
  };
  walk(0, []);

  let pressureHits = 0;
  let speedHits = 0;
  let hardHits = 0;
  let defensiveGaps = 0;
  const targetSummaries = leftBehind.map(({ p, index }) => ({ species: p.species, index, pressureSets: 0, speedSets: 0, hardSets: 0, examples: [] }));

  variants.forEach((sets) => {
    const chosenSets = sets.map((set, i) => withDraftStats(set, combo[i].p, level, round));
    leftBehind.forEach(({ p, index }, targetIndex) => {
      const target = withDraftStats(p, p, level, round);
      let targetPressure = false;
      let targetSpeed = false;
      let targetHard = false;
      chosenSets.forEach((attacker) => {
        const result = bestPressure(attacker, target, level, round);
        const faster = speedOf(attacker, level, round) > speedOf(target, level, round);
        if (result?.percentMax >= 50 || faster) targetPressure = true;
        if (faster) targetSpeed = true;
        if (result?.ko && result.ko <= 2) targetHard = true;
        if (result && targetSummaries[targetIndex].examples.length < 3) {
          targetSummaries[targetIndex].examples.push(`${attacker.species} ${attacker.setId}: ${result.moveName} ${result.percentMin.toFixed(1)}–${result.percentMax.toFixed(1)}%${faster ? ' • faster' : ''}`);
        }
      });
      if (targetPressure) {
        pressureHits += 1;
        targetSummaries[targetIndex].pressureSets += 1;
      }
      if (targetSpeed) {
        speedHits += 1;
        targetSummaries[targetIndex].speedSets += 1;
      }
      if (targetHard) {
        hardHits += 1;
        targetSummaries[targetIndex].hardSets += 1;
      }
    });
  });

  // A simple defensive warning: if every selected species is weak to at least one
  // common mapped attack from another draft species, flag the matchup as a gap.
  leftBehind.forEach(({ p }) => {
    const target = withDraftStats(p, p, level, round);
    const hasAnswer = combo.some((entry) => {
      const source = withDraftStats(entry.p, entry.p, level, round);
      const result = bestPressure(target, source, level, round);
      return result?.percentMax < 50;
    });
    if (!hasAnswer) defensiveGaps += 1;
  });

  const variantCount = Math.max(1, variants.length);
  const pressureCoverage = pressureHits / (variantCount * Math.max(1, leftBehind.length));
  const speedCoverage = speedHits / (variantCount * Math.max(1, leftBehind.length));
  const hardCoverage = hardHits / (variantCount * Math.max(1, leftBehind.length));

  return {
    combo,
    variantCount,
    leftBehind,
    targetSummaries,
    pressureCoverage,
    speedCoverage,
    hardCoverage,
    defensiveGaps,
    coverageScore: Math.round(pressureCoverage * 100) + Math.round(speedCoverage * 40) + Math.round(hardCoverage * 60) - defensiveGaps * 8,
  };
}

export function analyzeDraftCombinations({ draft = [], levelMode = 'Open Level', battle = 1, swaps = null } = {}) {
  const usable = draft.filter(Boolean);
  if (usable.length < 3) return { supported: false, reason: 'Enter at least three draft Pokémon first.', rows: [] };

  const level = levelMode === 'Open Level' ? 100 : 50;
  const round = Math.max(1, Math.ceil((Number(battle) || 1) / 7));
  const inferredElevation = usable.filter((p) => p?.isElevated).length;
  const effectiveSwaps = swaps == null ? elevationToSwaps(inferredElevation) : Math.max(0, Number(swaps) || 0);
  const pool = getDraftSetPools({ levelMode, battle, swaps: effectiveSwaps });
  if (!pool.supported) return { supported: false, reason: pool.reason, rows: [] };

  const entries = usable.map((p, index) => ({ p, index }));
  const optionsBySlot = {};
  entries.forEach(({ p, index }) => { optionsBySlot[index] = setOptionsForSlot(p, index, pool); });

  const rows = combinations(entries).map((combo) => evaluateCombination(combo, usable, optionsBySlot, level, round))
    .sort((a, b) => b.coverageScore - a.coverageScore || b.hardCoverage - a.hardCoverage || b.speedCoverage - a.speedCoverage);

  return { supported: true, levelMode, battle: Number(battle) || 1, swaps: effectiveSwaps, elevation: pool.elevation, rows };
}

export default function TeamCombinationLab({ draft = [], levelMode = 'Open Level', battle = 1, swaps = null }) {
  const [open, setOpen] = useState(null);
  const result = useMemo(() => analyzeDraftCombinations({ draft, levelMode, battle, swaps }), [draft, levelMode, battle, swaps]);
  const rows = result.rows || [];

  return (
    <>
      <DraftMatchupMatrix draft={draft} level={levelMode} battle={battle} />
      <View style={st.card}>
        <View style={st.header}>
          <View style={{ flex: 1 }}>
            <Text style={st.label}>TEAM COMBINATION LAB</Text>
            <Text style={st.title}>Compare every possible three-Pokémon draft</Text>
          </View>
          <Text style={st.badge}>{rows.length}</Text>
        </View>
        <Text style={st.help}>This is a coverage scan, not a magic prediction. It checks every legal three-species combination against the three Pokémon left behind, using the Factory set pools for your current round and elevation.</Text>
        {!result.supported ? <Text style={st.empty}>{result.reason}</Text> : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
            <View style={{ minWidth: 520, flex: 1 }}>
              {rows.map((row, index) => {
                const label = row.combo.map((entry) => `${entry.p.species} ${entry.p.setId}`).join(' • ');
                const openRow = open === index;
                return (
                  <View key={label} style={st.row}>
                    <TouchableOpacity onPress={() => setOpen(openRow ? null : index)} style={st.rowButton}>
                      <View style={{ flex: 1 }}>
                        <Text style={st.rank}>#{index + 1}  {label}</Text>
                        <Text style={st.meta}>{row.variantCount} set combinations • {Math.round(row.pressureCoverage * 100)}% pressure coverage • {Math.round(row.speedCoverage * 100)}% speed coverage</Text>
                      </View>
                      <Text style={st.chevron}>{openRow ? '▲' : '▼'}</Text>
                    </TouchableOpacity>
                    {openRow && <View style={st.details}>
                      <Text style={st.detailTitle}>WHY THIS COMBINATION MATTERS</Text>
                      <Text style={st.detail}>Hard pressure coverage: {Math.round(row.hardCoverage * 100)}% of tested set combinations.</Text>
                      <Text style={st.detail}>Defensive gap flags: {row.defensiveGaps}</Text>
                      {row.targetSummaries.map((target) => (
                        <View key={`${target.species}-${target.index}`} style={st.target}>
                          <Text style={st.targetName}>Against {target.species}</Text>
                          <Text style={st.targetMeta}>{target.pressureSets}/{row.variantCount} set combinations create pressure • {target.speedSets}/{row.variantCount} include a faster answer • {target.hardSets}/{row.variantCount} include a 2HKO-or-better answer.</Text>
                          {target.examples.map((example) => <Text key={example} style={st.example}>• {example}</Text>)}
                        </View>
                      ))}
                    </View>}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>
    </>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: '#10231f', borderRadius: 18, padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#29443d' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { color: '#83a69d', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#f2f7f4', fontSize: 18, fontWeight: '900', marginTop: 3 },
  badge: { minWidth: 32, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 12, backgroundColor: '#1c3831', color: '#d9efe8', textAlign: 'center', fontWeight: '900' },
  help: { color: '#a9c0ba', fontSize: 12, lineHeight: 18, marginBottom: 10 },
  empty: { color: '#d8b98c', fontSize: 12, lineHeight: 18 },
  row: { borderTopWidth: 1, borderTopColor: '#27423a' },
  rowButton: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 2 },
  rank: { color: '#edf6f2', fontSize: 13, fontWeight: '800' },
  meta: { color: '#87aaa1', fontSize: 11, marginTop: 3 },
  chevron: { color: '#8bd3bb', fontSize: 13, paddingHorizontal: 8 },
  details: { backgroundColor: '#0c1a17', borderRadius: 12, padding: 10, marginBottom: 10 },
  detailTitle: { color: '#9fe2c8', fontSize: 11, fontWeight: '900', letterSpacing: .7, marginBottom: 5 },
  detail: { color: '#c7d8d3', fontSize: 11, lineHeight: 17 },
  target: { marginTop: 9, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#213a34' },
  targetName: { color: '#f0f7f4', fontSize: 12, fontWeight: '800' },
  targetMeta: { color: '#a7beb8', fontSize: 11, lineHeight: 16, marginTop: 2 },
  example: { color: '#8bd3bb', fontSize: 11, marginTop: 3 },
});
