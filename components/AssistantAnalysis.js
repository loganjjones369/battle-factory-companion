import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getScientistStyleLabel } from '../data/scientistAnalysis';

function setLabel(set) { return `${set?.species || set?.name || 'Unknown'} ${set?.setId ?? set?.sourceId ?? set?.id ?? ''}`.trim(); }
function moveNames(set) { return (set?.moves || []).map((move) => typeof move === 'string' ? move : move?.name).filter(Boolean); }

function makeBriefing({ rankedSets = [], threatMap = {}, analysisTeam = [], observations = [], eliminatedCount = 0 }) {
  if (!rankedSets.length) return { headline: 'I do not have a surviving candidate yet.', reasons: ['Run the Factory analysis after entering the draft, Scientist clue, and any opponent information you have seen.'], watch: 'If the candidate pool becomes empty, check the battle number, level mode, and Scientist information.' };
  const scored = rankedSets.map((entry, index) => {
    const key = `${String(entry.set?.species || '').trim().toLowerCase()}#${entry.set?.id ?? entry.set?.sourceId ?? entry.set?.setId ?? ''}`;
    const threat = threatMap[key];
    const frequency = Number(entry.frequency || 0);
    return { entry, threat, index, score: frequency * 2 + (threat?.koCount || 0) * 6 + (threat?.pressureCount || 0) * 2 + (threat?.fasterCount || 0) };
  }).sort((a, b) => b.score - a.score);
  const focus = scored[0]; const set = focus.entry.set; const reasons = []; const threat = focus.threat;
  if (threat?.koCount > 0) reasons.push(`${setLabel(set)} has a mapped move in KO range against ${threat.koCount}/${threat.teamSize} of your current Pokémon.`);
  else if (threat?.pressureCount > 0) reasons.push(`${setLabel(set)} reaches at least 50% mapped damage against ${threat.pressureCount}/${threat.teamSize} of your current Pokémon.`);
  if (threat?.fasterCount > 0) reasons.push(`It is faster than ${threat.fasterCount}/${threat.teamSize} of your current Pokémon using the exact set stats.`);
  const pct = Math.max(0, Number(focus.entry.frequency || 0) * 100);
  if (pct > 0) reasons.push(`It appears in ${pct.toFixed(1)}% of the surviving candidate teams. That is a candidate frequency, not an in-game probability.`);
  const observation = observations.find((o) => String(o?.species || '').toLowerCase() === String(set?.species || '').toLowerCase());
  if (observation) {
    const knownMoves = moveNames(set).filter((m) => (observation.moves || []).some((om) => String(om).toLowerCase() === String(m).toLowerCase()));
    if (knownMoves.length) reasons.push(`You have already seen ${knownMoves.join(', ')} from this species, which supports this set family.`);
    if (observation.item && String(observation.item).toLowerCase() === String(set.item || '').toLowerCase()) reasons.push(`The observed held item matches this set: ${set.item}.`);
  }
  if (!reasons.length) reasons.push('It is currently one of the strongest surviving possibilities after the Factory rules and clues are applied.');
  let watch = 'Watch for a move, item, or switch that separates this set from the other surviving sets.';
  if (analysisTeam.length === 0) watch = 'Once you have your three Pokémon selected, I can turn this into matchup-specific analysis with speed and damage numbers.';
  else if (eliminatedCount > 0) watch = `${eliminatedCount} candidate sets have already disappeared. The next useful information is whatever most clearly separates the remaining sets.`;
  return { headline: `My biggest concern right now is ${setLabel(set)}.`, reasons, watch, focus, alternatives: scored.slice(1, 3) };
}

export default function AssistantAnalysis({ visible, onClose, rankedSets = [], threatMap = {}, analysisTeam = [], observations = [], eliminatedCount = 0, scientist = {} }) {
  const briefing = useMemo(() => makeBriefing({ rankedSets, threatMap, analysisTeam, observations, eliminatedCount }), [rankedSets, threatMap, analysisTeam, observations, eliminatedCount]);
  const styleNumber = scientist?.style ?? scientist?.styleId ?? scientist?.battleStyle;
  const styleLabel = styleNumber != null ? getScientistStyleLabel(styleNumber) : null;
  const scientistPhrase = scientist?.phrase || scientist?.text || scientist?.styleText || (styleLabel ? `The favourite battle style appears to be ${styleLabel}.` : 'The Scientist is still gathering clues.');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.scientistAvatar}><Text style={styles.avatarText}>🤓</Text><View style={styles.glassesShine} /></View>
            <View style={styles.headerCopy}><Text style={styles.kicker}>THE FACTORY SCIENTIST</Text><Text style={styles.title}>LAB ASSISTANT</Text><Text style={styles.subtitle}>Your little research partner</Text></View>
            <Pressable onPress={onClose} style={styles.closeButton} accessibilityLabel="Back to calculator"><Text style={styles.closeText}>×</Text></Pressable>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            <View style={styles.scientistNote}>
              <View style={styles.noteTop}><Text style={styles.noteLabel}>SCIENTIST CLUE</Text><Text style={styles.noteSpark}>✦</Text></View>
              <Text style={styles.actualPhrase}>“{scientistPhrase}”</Text>
              <Text style={styles.noteHint}>I’ll use the same clue you were given — I’m just helping you make sense of it.</Text>
            </View>
            <View style={styles.speechBubble}><View style={styles.bubbleTail} /><Text style={styles.speechLabel}>THE SCIENTIST SAYS…</Text><Text style={styles.headline}>{briefing.headline}</Text></View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>WHY I'M CONCERNED</Text>
              {briefing.reasons.map((reason, index) => <View key={index} style={styles.reasonRow}><Text style={styles.reasonIcon}>!</Text><Text style={styles.reason}>{reason}</Text></View>)}
            </View>
            {briefing.focus?.threat && analysisTeam.length > 0 && <View style={styles.numbersBox}>
              <Text style={styles.sectionTitle}>SHOW ME THE NUMBERS</Text>
              {briefing.focus.threat.details.map((detail, index) => <View key={`${detail.defender?.species}-${index}`} style={styles.numberRow}><Text style={styles.numberName}>{setLabel(detail.defender)}</Text><Text style={styles.numberText}>{detail.aSpeed > detail.dSpeed ? `Faster: ${detail.aSpeed} vs ${detail.dSpeed}` : detail.aSpeed === detail.dSpeed ? `Speed tie: ${detail.aSpeed}` : `Slower: ${detail.aSpeed} vs ${detail.dSpeed}`}{detail.best ? `  •  ${detail.best.moveName}: ${detail.best.percentMin.toFixed(1)}%–${detail.best.percentMax.toFixed(1)}%` : ''}</Text></View>)}
            </View>}
            {!!briefing.alternatives?.length && <View style={styles.section}><Text style={styles.sectionTitle}>OTHER THINGS I'M WATCHING</Text>{briefing.alternatives.map((alt, index) => <View key={index} style={styles.altRow}><Text style={styles.altRank}>#{alt.index + 1}</Text><View style={{ flex: 1 }}><Text style={styles.altName}>{setLabel(alt.entry.set)}</Text>{alt.threat && <Text style={styles.altText}>{alt.threat.koCount ? `KO range vs ${alt.threat.koCount}/${alt.threat.teamSize}` : alt.threat.pressureCount ? `50%+ damage vs ${alt.threat.pressureCount}/${alt.threat.teamSize}` : alt.threat.fasterCount ? `Faster than ${alt.threat.fasterCount}/${alt.threat.teamSize}` : 'No mapped damage pressure'}</Text>}</View></View>)}</View>}
            <View style={styles.watchBox}><Text style={styles.sectionTitle}>WHAT I WANT YOU TO WATCH FOR</Text><Text style={styles.watchText}>{briefing.watch}</Text></View>
            <Text style={styles.footer}>I'm on your side, but I won't pretend the Factory is predictable. I'll explain the evidence so you can make the call.</Text>
          </ScrollView>
          <Pressable style={styles.backButton} onPress={onClose}><Text style={styles.backText}>← BACK TO CALCULATOR</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(28,35,29,0.96)', justifyContent: 'flex-end' },
  modal: { height: '96%', backgroundColor: '#e7e7de', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden', borderWidth: 3, borderColor: '#344238' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#314b38', borderBottomWidth: 3, borderBottomColor: '#1e2e23' },
  scientistAvatar: { width: 58, height: 58, borderRadius: 10, backgroundColor: '#f0ead3', borderWidth: 3, borderColor: '#26372a', alignItems: 'center', justifyContent: 'center', marginRight: 10, overflow: 'hidden' },
  avatarText: { fontSize: 35 }, glassesShine: { position: 'absolute', width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff', top: 14, left: 19, opacity: 0.7 },
  headerCopy: { flex: 1 }, kicker: { color: '#b9cdb8', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, title: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 }, subtitle: { color: '#dbe6d8', fontSize: 10, marginTop: 2, fontWeight: '800' },
  closeButton: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#e5e5d9', borderWidth: 2, borderColor: '#25342a', alignItems: 'center', justifyContent: 'center' }, closeText: { fontSize: 26, lineHeight: 28, fontWeight: '900', color: '#304036' },
  scroll: { flex: 1 }, content: { padding: 12, paddingBottom: 20 },
  scientistNote: { backgroundColor: '#cfdacb', borderWidth: 2, borderColor: '#586957', borderRadius: 12, padding: 11, marginBottom: 10 }, noteTop: { flexDirection: 'row', justifyContent: 'space-between' }, noteLabel: { color: '#4d5d4d', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, noteSpark: { color: '#65755f' }, actualPhrase: { color: '#29352d', fontSize: 15, lineHeight: 21, fontWeight: '900', marginTop: 5 }, noteHint: { color: '#637064', fontSize: 9, lineHeight: 13, marginTop: 5 },
  speechBubble: { backgroundColor: '#fffdf1', borderWidth: 2, borderColor: '#4b594d', borderRadius: 14, padding: 13, marginBottom: 10, position: 'relative' }, bubbleTail: { position: 'absolute', width: 14, height: 14, backgroundColor: '#fffdf1', borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#4b594d', left: 20, bottom: -8, transform: [{ rotate: '-45deg' }] }, speechLabel: { color: '#687469', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, headline: { color: '#263027', fontSize: 17, fontWeight: '900', lineHeight: 23, marginTop: 5 },
  section: { backgroundColor: '#d9e1d5', borderRadius: 12, padding: 11, marginTop: 8 }, sectionTitle: { color: '#425144', fontSize: 10, fontWeight: '900', letterSpacing: 1 }, reasonRow: { flexDirection: 'row', marginTop: 9 }, reasonIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#806333', color: '#fff', textAlign: 'center', lineHeight: 22, fontWeight: '900', marginRight: 8 }, reason: { flex: 1, color: '#485349', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  numbersBox: { backgroundColor: '#f4f3ea', borderRadius: 12, borderWidth: 2, borderColor: '#9ca89b', padding: 11, marginTop: 8 }, numberRow: { borderTopWidth: 1, borderTopColor: '#d0d3cb', paddingTop: 7, marginTop: 7 }, numberName: { color: '#344037', fontSize: 11, fontWeight: '900' }, numberText: { color: '#5b655d', fontSize: 10, lineHeight: 15, marginTop: 2 },
  altRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#eef0e9', borderRadius: 8, padding: 8 }, altRank: { color: '#566458', fontWeight: '900', width: 28 }, altName: { color: '#354137', fontSize: 12, fontWeight: '900' }, altText: { color: '#657066', fontSize: 10, marginTop: 2 },
  watchBox: { backgroundColor: '#fff4cf', borderWidth: 2, borderColor: '#8a7747', borderRadius: 12, padding: 11, marginTop: 8 }, watchText: { color: '#5b512f', fontSize: 12, lineHeight: 17, marginTop: 5, fontWeight: '700' }, footer: { color: '#737a72', fontSize: 9, lineHeight: 14, margin: 10, textAlign: 'center' },
  backButton: { margin: 10, marginTop: 0, paddingVertical: 13, borderRadius: 11, backgroundColor: '#314b38', alignItems: 'center', borderWidth: 2, borderColor: '#203125' }, backText: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 0.6 },
});
