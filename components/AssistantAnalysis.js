import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getScientistStyleLabel } from '../data/scientistAnalysis';
import { MOVE_DATA, typeEffectiveness } from '../data/damageCalc';

function setLabel(set) { return `${set?.species || set?.name || 'Unknown'} ${set?.setId ?? set?.sourceId ?? set?.id ?? ''}`.trim(); }
function moveNames(set) { return (set?.moves || []).map((move) => typeof move === 'string' ? move : move?.name).filter(Boolean); }
function norm(v) { return String(v || '').trim().toLowerCase(); }
function keyFor(set) { return `${norm(set?.species)}#${set?.id ?? set?.sourceId ?? set?.setId ?? ''}`; }

function countWeakTo(team, type) { return team.filter((p) => typeEffectiveness(type, p?.types || []) > 1).length; }
function countMoveType(team, type) { return team.filter((p) => moveNames(p).some((m) => MOVE_DATA[m]?.type === type)).length; }

function getLikelyTrainerType(rankedSets = []) {
  const scores = {};
  rankedSets.slice(0, 16).forEach((entry) => (entry.set?.types || []).forEach((type) => { scores[type] = (scores[type] || 0) + Number(entry.frequency || 0); }));
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function getEmotionalRead(rankedSets = [], threatMap = {}, analysisTeam = []) {
  if (!rankedSets.length || !analysisTeam.length) return { mood: 'thinking', face: '🤔', label: 'Hmm… let me think.', detail: 'I’m checking the clues before I commit to a read.' };
  const likelyType = getLikelyTrainerType(rankedSets);
  const weakCount = likelyType ? countWeakTo(analysisTeam, likelyType) : 0;
  const likelyEntries = rankedSets.slice(0, 16).filter((e) => (e.set?.types || []).includes(likelyType));
  const threats = likelyEntries.map((e) => threatMap[keyFor(e.set)]).filter(Boolean);
  const highThreat = threats.filter((t) => t.koCount > 0 || t.pressureCount >= 2).length;

  // Big danger reaction: two or more known team members are weak to the leading
  // trainer type and at least one surviving candidate can seriously pressure us.
  if (likelyType && weakCount >= 2 && highThreat > 0) {
    return { mood: 'danger', face: '😰', label: 'Uh-oh…', detail: `${likelyType} is lining up against ${weakCount} of our Pokémon.` };
  }

  // Confident reaction: two pieces of reliable coverage into the likely type,
  // including the user's Earthquake-vs-Electric / Water-vs-Ground examples.
  const coverageType = likelyType === 'Electric' ? 'Ground' : likelyType === 'Ground' ? 'Water' : null;
  const coverageCount = coverageType ? countMoveType(analysisTeam, coverageType) : 0;
  const waterCount = analysisTeam.filter((p) => (p?.types || []).includes('Water')).length;
  if ((coverageType && coverageCount >= 2) || (likelyType === 'Ground' && waterCount >= 2)) {
    return { mood: 'confident', face: '😏', label: 'Oh, I like this.', detail: `We have multiple answers for a ${likelyType} matchup.` };
  }

  return { mood: 'ready', face: '🤓', label: 'I’ve got a read.', detail: 'The evidence is pointing somewhere, but I’m keeping the uncertainty visible.' };
}

function makeBriefing({ rankedSets = [], threatMap = {}, analysisTeam = [], observations = [], eliminatedCount = 0 }) {
  if (!rankedSets.length) return { headline: 'I do not have a surviving candidate yet.', reasons: ['Run the Factory analysis after entering the draft, Scientist clue, and any opponent information you have seen.'], watch: 'If the candidate pool becomes empty, check the battle number, level mode, and Scientist information.' };
  const scored = rankedSets.map((entry, index) => {
    const threat = threatMap[keyFor(entry.set)];
    const frequency = Number(entry.frequency || 0);
    return { entry, threat, index, score: frequency * 2 + (threat?.koCount || 0) * 6 + (threat?.pressureCount || 0) * 2 + (threat?.fasterCount || 0) };
  }).sort((a, b) => b.score - a.score);
  const focus = scored[0]; const set = focus.entry.set; const reasons = []; const threat = focus.threat;
  if (threat?.koCount > 0) reasons.push(`${setLabel(set)} has a mapped move in KO range against ${threat.koCount}/${threat.teamSize} of your current Pokémon.`);
  else if (threat?.pressureCount > 0) reasons.push(`${setLabel(set)} reaches at least 50% mapped damage against ${threat.pressureCount}/${threat.teamSize} of your current Pokémon.`);
  if (threat?.fasterCount > 0) reasons.push(`It is faster than ${threat.fasterCount}/${threat.teamSize} of your current Pokémon using the exact set stats.`);
  const pct = Math.max(0, Number(focus.entry.frequency || 0) * 100);
  if (pct > 0) reasons.push(`It appears in ${pct.toFixed(1)}% of the surviving candidate teams. That is a candidate frequency, not an in-game probability.`);
  const observation = observations.find((o) => norm(o?.species) === norm(set?.species));
  if (observation) {
    const knownMoves = moveNames(set).filter((m) => (observation.moves || []).some((om) => norm(om) === norm(m)));
    if (knownMoves.length) reasons.push(`You have already seen ${knownMoves.join(', ')} from this species, which supports this set family.`);
    if (observation.item && norm(observation.item) === norm(set.item)) reasons.push(`The observed held item matches this set: ${set.item}.`);
  }
  if (!reasons.length) reasons.push('It is currently one of the strongest surviving possibilities after the Factory rules and clues are applied.');
  let watch = 'Watch for a move, item, or switch that separates this set from the other surviving sets.';
  if (analysisTeam.length === 0) watch = 'Once you have your three Pokémon selected, I can turn this into matchup-specific analysis with speed and damage numbers.';
  else if (eliminatedCount > 0) watch = `${eliminatedCount} candidate sets have already disappeared. The next useful information is whatever most clearly separates the remaining sets.`;
  return { headline: `My biggest concern right now is ${setLabel(set)}.`, reasons, watch, focus, alternatives: scored.slice(1, 3) };
}

export default function AssistantAnalysis({ visible, onClose, rankedSets = [], threatMap = {}, analysisTeam = [], observations = [], eliminatedCount = 0, scientist = {} }) {
  const briefing = useMemo(() => makeBriefing({ rankedSets, threatMap, analysisTeam, observations, eliminatedCount }), [rankedSets, threatMap, analysisTeam, observations, eliminatedCount]);
  const emotionalRead = useMemo(() => getEmotionalRead(rankedSets, threatMap, analysisTeam), [rankedSets, threatMap, analysisTeam]);
  const styleNumber = scientist?.style ?? scientist?.styleId ?? scientist?.battleStyle;
  const styleLabel = styleNumber != null ? getScientistStyleLabel(styleNumber) : null;
  const scientistPhrase = scientist?.phrase || scientist?.text || scientist?.styleText || (styleLabel ? `The favourite battle style appears to be ${styleLabel}.` : 'The Scientist is still gathering clues.');

  const [thinking, setThinking] = useState(false);
  const [thoughtDone, setThoughtDone] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const portraitY = useRef(new Animated.Value(0)).current;
  const glasses = useRef(new Animated.Value(0)).current;
  const ideaScale = useRef(new Animated.Value(0.75)).current;
  const reactionScale = useRef(new Animated.Value(0.7)).current;
  const reactionX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return undefined;
    setThinking(true);
    setThoughtDone(false);
    fade.setValue(0); portraitY.setValue(0); glasses.setValue(0); ideaScale.setValue(0.75); reactionScale.setValue(0.7); reactionX.setValue(0);

    const timer = setTimeout(() => {
      setThinking(false);
      setThoughtDone(true);
      Animated.parallel([
        Animated.sequence([
          Animated.timing(portraitY, { toValue: -3, duration: 100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.spring(portraitY, { toValue: 0, friction: 5, tension: 130, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(glasses, { toValue: 1, duration: 130, useNativeDriver: true }),
          Animated.timing(glasses, { toValue: 0, duration: 180, useNativeDriver: true }),
        ]),
        Animated.spring(ideaScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      ]).start(() => {
        if (emotionalRead.mood === 'danger') {
          Animated.sequence([
            Animated.timing(reactionX, { toValue: 7, duration: 65, useNativeDriver: true }),
            Animated.timing(reactionX, { toValue: -7, duration: 65, useNativeDriver: true }),
            Animated.timing(reactionX, { toValue: 5, duration: 55, useNativeDriver: true }),
            Animated.timing(reactionX, { toValue: 0, duration: 55, useNativeDriver: true }),
          ]).start();
        } else if (emotionalRead.mood === 'confident') {
          Animated.sequence([
            Animated.spring(reactionScale, { toValue: 1.25, friction: 4, tension: 130, useNativeDriver: true }),
            Animated.spring(reactionScale, { toValue: 1, friction: 5, tension: 110, useNativeDriver: true }),
          ]).start();
        } else {
          Animated.spring(reactionScale, { toValue: 1, friction: 5, tension: 110, useNativeDriver: true }).start();
        }
      });
    }, 780);

    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    return () => clearTimeout(timer);
  }, [visible, emotionalRead.mood]);

  const glassesPush = glasses.interpolate({ inputRange: [0, 1], outputRange: [0, 5] });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.modal, { opacity: fade }]}>
          <View style={styles.header}>
            <Animated.View style={[styles.scientistAvatar, { transform: [{ translateY: portraitY }] }]}>
              <Text style={styles.avatarText}>{thinking ? '🤔' : emotionalRead.face}</Text>
              <Animated.View style={[styles.glassesPush, { transform: [{ translateX: glassesPush }] }]} />
              <View style={styles.glassesShine} />
            </Animated.View>
            <View style={styles.headerCopy}><Text style={styles.kicker}>THE FACTORY SCIENTIST</Text><Text style={styles.title}>LAB ASSISTANT</Text><Text style={styles.subtitle}>Your little research partner</Text></View>
            <Pressable onPress={onClose} style={styles.closeButton} accessibilityLabel="Back to calculator"><Text style={styles.closeText}>×</Text></Pressable>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            {thinking ? (
              <View style={styles.thoughtPanel}>
                <View style={styles.thoughtBubble}><Text style={styles.thoughtDots}>…</Text><Text style={styles.thoughtText}>Hmm… let me think.</Text></View>
                <Text style={styles.thoughtHint}>Checking the Factory clues, matchup pressure, and coverage…</Text>
                <View style={styles.thinkingRow}><View style={styles.pixelDot} /><View style={styles.pixelDot} /><View style={styles.pixelDot} /></View>
              </View>
            ) : (
              <Animated.View style={{ transform: [{ scale: ideaScale }] }}>
                <View style={styles.ideaBanner}>
                  <View style={styles.ideaIcon}><Text style={styles.ideaIconText}>!</Text></View>
                  <View style={{ flex: 1 }}><Text style={styles.ideaKicker}>*PUSHES UP GLASSES*</Text><Text style={styles.ideaText}>☝️ I’VE GOT IT!</Text></View>
                  <Text style={styles.ideaSpark}>✦</Text>
                </View>
              </Animated.View>
            )}

            {!thinking && <Animated.View style={[styles.reactionBanner, { transform: [{ translateX: reactionX }, { scale: reactionScale }] }]}>
              <Text style={styles.reactionEmoji}>{emotionalRead.mood === 'danger' ? '😰' : emotionalRead.mood === 'confident' ? '😏✊' : '🤓'}</Text>
              <View style={{ flex: 1 }}><Text style={styles.reactionTitle}>{emotionalRead.label}</Text><Text style={styles.reactionDetail}>{emotionalRead.detail}</Text></View>
            </Animated.View>}

            <View style={styles.scientistNote}>
              <View style={styles.noteTop}><Text style={styles.noteLabel}>SCIENTIST CLUE</Text><Text style={styles.noteSpark}>✦</Text></View>
              <Text style={styles.actualPhrase}>“{scientistPhrase}”</Text>
              <Text style={styles.noteHint}>I’ll use the same clue you were given — I’m just helping you make sense of it.</Text>
            </View>
            <View style={styles.speechBubble}><View style={styles.bubbleTail} /><Text style={styles.speechLabel}>{thoughtDone ? 'THE SCIENTIST SAYS…' : 'THE SCIENTIST IS THINKING…'}</Text><Text style={styles.headline}>{briefing.headline}</Text></View>
            <View style={styles.section}><Text style={styles.sectionTitle}>WHY I'M CONCERNED</Text>{briefing.reasons.map((reason, index) => <View key={index} style={styles.reasonRow}><Text style={styles.reasonIcon}>!</Text><Text style={styles.reason}>{reason}</Text></View>)}</View>
            {briefing.focus?.threat && analysisTeam.length > 0 && <View style={styles.numbersBox}><Text style={styles.sectionTitle}>SHOW ME THE NUMBERS</Text>{briefing.focus.threat.details.map((detail, index) => <View key={`${detail.defender?.species}-${index}`} style={styles.numberRow}><Text style={styles.numberName}>{setLabel(detail.defender)}</Text><Text style={styles.numberText}>{detail.aSpeed > detail.dSpeed ? `Faster: ${detail.aSpeed} vs ${detail.dSpeed}` : detail.aSpeed === detail.dSpeed ? `Speed tie: ${detail.aSpeed}` : `Slower: ${detail.aSpeed} vs ${detail.dSpeed}`}{detail.best ? `  •  ${detail.best.moveName}: ${detail.best.percentMin.toFixed(1)}%–${detail.best.percentMax.toFixed(1)}%` : ''}</Text></View>)}</View>}
            {!!briefing.alternatives?.length && <View style={styles.section}><Text style={styles.sectionTitle}>OTHER THINGS I'M WATCHING</Text>{briefing.alternatives.map((alt, index) => <View key={index} style={styles.altRow}><Text style={styles.altRank}>#{alt.index + 1}</Text><View style={{ flex: 1 }}><Text style={styles.altName}>{setLabel(alt.entry.set)}</Text>{alt.threat && <Text style={styles.altText}>{alt.threat.koCount ? `KO range vs ${alt.threat.teamSize}` : alt.threat.pressureCount ? `50%+ damage vs ${alt.threat.pressureCount}/${alt.threat.teamSize}` : alt.threat.fasterCount ? `Faster than ${alt.threat.fasterCount}/${alt.threat.teamSize}` : 'No mapped damage pressure'}</Text>}</View></View>)}</View>}
            <View style={styles.watchBox}><Text style={styles.sectionTitle}>WHAT I WANT YOU TO WATCH FOR</Text><Text style={styles.watchText}>{briefing.watch}</Text></View>
            <Text style={styles.footer}>I'm on your side, but I won't pretend the Factory is predictable. I'll explain the evidence so you can make the call.</Text>
          </ScrollView>
          <Pressable style={styles.backButton} onPress={onClose}><Text style={styles.backText}>← BACK TO CALCULATOR</Text></Pressable>
        </Animated.View>
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
  glassesPush: { position: 'absolute', width: 13, height: 4, borderRadius: 2, backgroundColor: '#26372a', top: 30, left: 16, opacity: 0.75 },
  headerCopy: { flex: 1 }, kicker: { color: '#b9cdb8', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, title: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 }, subtitle: { color: '#dbe6d8', fontSize: 10, marginTop: 2, fontWeight: '800' },
  closeButton: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#e5e5d9', borderWidth: 2, borderColor: '#25342a', alignItems: 'center', justifyContent: 'center' }, closeText: { fontSize: 26, lineHeight: 28, fontWeight: '900', color: '#304036' },
  scroll: { flex: 1 }, content: { padding: 12, paddingBottom: 20 },
  thoughtPanel: { minHeight: 126, alignItems: 'center', justifyContent: 'center', marginBottom: 10, backgroundColor: '#d4ddcf', borderWidth: 2, borderColor: '#5a6958', borderRadius: 14, padding: 12 },
  thoughtBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffdf1', borderWidth: 2, borderColor: '#566356', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  thoughtDots: { fontSize: 22, fontWeight: '900', color: '#687468', marginRight: 6, marginTop: -4 }, thoughtText: { color: '#374238', fontSize: 14, fontWeight: '900' }, thoughtHint: { color: '#647063', fontSize: 10, fontWeight: '700', marginTop: 8 }, thinkingRow: { flexDirection: 'row', marginTop: 7, gap: 4 }, pixelDot: { width: 4, height: 4, backgroundColor: '#687668' },
  ideaBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff2c6', borderWidth: 2, borderColor: '#75663f', borderRadius: 13, padding: 10, marginBottom: 8 }, ideaIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#314b38', alignItems: 'center', justifyContent: 'center', marginRight: 9 }, ideaIconText: { color: '#fff', fontSize: 23, fontWeight: '900' }, ideaKicker: { color: '#6d6344', fontSize: 8, fontWeight: '900', letterSpacing: 1 }, ideaText: { color: '#2e3b31', fontSize: 16, fontWeight: '900', marginTop: 1 }, ideaSpark: { color: '#8a7747', fontSize: 24 },
  reactionBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eef0e8', borderWidth: 2, borderColor: '#657261', borderRadius: 12, padding: 9, marginBottom: 10 }, reactionEmoji: { fontSize: 27, width: 48, textAlign: 'center', marginRight: 7 }, reactionTitle: { color: '#2f3b31', fontSize: 13, fontWeight: '900' }, reactionDetail: { color: '#626d64', fontSize: 10, lineHeight: 14, marginTop: 2, fontWeight: '700' },
  scientistNote: { backgroundColor: '#cfdacb', borderWidth: 2, borderColor: '#586957', borderRadius: 12, padding: 11, marginBottom: 10 }, noteTop: { flexDirection: 'row', justifyContent: 'space-between' }, noteLabel: { color: '#4d5d4d', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, noteSpark: { color: '#65755f' }, actualPhrase: { color: '#29352d', fontSize: 15, lineHeight: 21, fontWeight: '900', marginTop: 5 }, noteHint: { color: '#637064', fontSize: 9, lineHeight: 13, marginTop: 5 },
  speechBubble: { backgroundColor: '#fffdf1', borderWidth: 2, borderColor: '#4b594d', borderRadius: 14, padding: 13, marginBottom: 10, position: 'relative' }, bubbleTail: { position: 'absolute', width: 14, height: 14, backgroundColor: '#fffdf1', borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#4b594d', left: 20, bottom: -8, transform: [{ rotate: '-45deg' }] }, speechLabel: { color: '#687469', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, headline: { color: '#263027', fontSize: 17, fontWeight: '900', lineHeight: 23, marginTop: 5 },
  section: { backgroundColor: '#d9e1d5', borderRadius: 12, padding: 11, marginTop: 8 }, sectionTitle: { color: '#425144', fontSize: 10, fontWeight: '900', letterSpacing: 1 }, reasonRow: { flexDirection: 'row', marginTop: 9 }, reasonIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#806333', color: '#fff', textAlign: 'center', lineHeight: 22, fontWeight: '900', marginRight: 8 }, reason: { flex: 1, color: '#485349', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  numbersBox: { backgroundColor: '#f4f3ea', borderRadius: 12, borderWidth: 2, borderColor: '#9ca89b', padding: 11, marginTop: 8 }, numberRow: { borderTopWidth: 1, borderTopColor: '#d0d3cb', paddingTop: 7, marginTop: 7 }, numberName: { color: '#344037', fontSize: 11, fontWeight: '900' }, numberText: { color: '#5b655d', fontSize: 10, lineHeight: 15, marginTop: 2 },
  altRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#eef0e9', borderRadius: 8, padding: 8 }, altRank: { color: '#566458', fontWeight: '900', width: 28 }, altName: { color: '#354137', fontSize: 12, fontWeight: '900' }, altText: { color: '#657066', fontSize: 10, marginTop: 2 },
  watchBox: { backgroundColor: '#fff4cf', borderWidth: 2, borderColor: '#8a7747', borderRadius: 12, padding: 11, marginTop: 8 }, watchText: { color: '#5b512f', fontSize: 12, lineHeight: 17, marginTop: 5, fontWeight: '700' }, footer: { color: '#737a72', fontSize: 9, lineHeight: 14, margin: 10, textAlign: 'center' },
  backButton: { margin: 10, marginTop: 0, paddingVertical: 13, borderRadius: 11, backgroundColor: '#314b38', alignItems: 'center', borderWidth: 2, borderColor: '#203125' }, backText: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 0.6 },
});
