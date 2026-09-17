import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getScientistStyleLabel } from '../data/scientistAnalysis';
import { typeEffectiveness, MOVE_DATA } from '../data/damageCalc';

function setLabel(set) { return `${set?.species || set?.name || 'Unknown'} ${set?.setId ?? set?.sourceId ?? set?.id ?? ''}`.trim(); }
function moveNames(set) { return (set?.moves || []).map((move) => typeof move === 'string' ? move : move?.name).filter(Boolean); }
function norm(v) { return String(v || '').trim().toLowerCase(); }

function makeBriefing({ rankedSets = [], threatMap = {}, analysisTeam = [], observations = [], eliminatedCount = 0 }) {
  if (!rankedSets.length) return { headline: 'I do not have a surviving candidate yet.', reasons: ['Run the Factory analysis after entering the draft, Scientist clue, and any opponent information you have seen.'], watch: 'If the candidate pool becomes empty, check the battle number, level mode, and Scientist information.', reaction: 'neutral' };
  const scored = rankedSets.map((entry, index) => {
    const key = `${norm(entry.set?.species)}#${entry.set?.id ?? entry.set?.sourceId ?? entry.set?.setId ?? ''}`;
    const threat = threatMap[key];
    const frequency = Number(entry.frequency || 0);
    return { entry, threat, index, score: frequency * 2 + (threat?.koCount || 0) * 6 + (threat?.pressureCount || 0) * 2 + (threat?.fasterCount || 0) };
  }).sort((a, b) => b.score - a.score);
  const focus = scored[0]; const set = focus.entry.set; const reasons = []; const threat = focus.threat;
  if (threat?.koCount > 0) reasons.push(`${setLabel(set)} has a mapped move in KO range against ${threat.koCount}/${threat.teamSize} of your current Pokémon.`);
  else if (threat?.pressureCount > 0) reasons.push(`${setLabel(set)} reaches at least 50% mapped damage against ${threat.pressureCount}/${threat.teamSize} of your current Pokémon.`);
  if (threat?.fasterCount > 0) reasons.push(`It is faster than ${threat.fasterCount}/${threat.teamSize} of your current Pokémon using the exact set stats.`);
  const pct = Math.max(0, Number(focus.entry.frequency || 0) * 100);
  if (pct > 0) reasons.push(`It appears in ${pct.toFixed(1)}% of the surviving candidate teams. That is candidate frequency, not an in-game probability.`);
  const observation = observations.find((o) => norm(o?.species) === norm(set?.species));
  if (observation) {
    const knownMoves = moveNames(set).filter((m) => (observation.moves || []).some((om) => norm(om) === norm(m)));
    if (knownMoves.length) reasons.push(`You have already seen ${knownMoves.join(', ')} from this species, which supports this set family.`);
    if (observation.item && norm(observation.item) === norm(set.item)) reasons.push(`The observed held item matches this set: ${set.item}.`);
  }
  if (!reasons.length) reasons.push('It is currently one of the strongest surviving possibilities after the Factory rules and clues are applied.');

  const danger = scored.filter((x) => x.threat?.koCount > 0 || x.threat?.pressureCount >= Math.max(2, Math.ceil((x.threat?.teamSize || 3) * 0.67))).length;
  const useful = scored.filter((x) => x.threat && x.threat.pressureCount === 0 && x.threat.fasterCount === 0).length;
  let reaction = danger >= Math.max(1, Math.ceil(scored.length * 0.25)) ? 'danger' : analysisTeam.length > 0 && useful >= Math.max(1, Math.ceil(scored.length * 0.35)) ? 'confident' : 'neutral';

  if (analysisTeam.length >= 2 && rankedSets.length) {
    const typeCounts = {};
    rankedSets.slice(0, 12).forEach(({ set: candidate }) => (candidate?.types || []).forEach((t) => { typeCounts[t] = (typeCounts[t] || 0) + 1; }));
    const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (dominantType) {
      const coverageCount = analysisTeam.filter((p) => moveNames(p).some((move) => MOVE_DATA[move] && typeEffectiveness(MOVE_DATA[move].type, [dominantType]) > 1)).length;
      if (coverageCount >= 2 && danger === 0) reaction = 'confident';
    }
  }

  let watch = 'Watch for a move, item, or switch that separates this set from the other surviving sets.';
  if (analysisTeam.length === 0) watch = 'Once you have your three Pokémon selected, I can turn this into matchup-specific analysis with speed and damage numbers.';
  else if (eliminatedCount > 0) watch = `${eliminatedCount} candidate sets have already disappeared. The next useful information is whatever most clearly separates the remaining sets.`;
  return { headline: `My biggest concern right now is ${setLabel(set)}.`, reasons, watch, focus, alternatives: scored.slice(1, 3), reaction };
}

function reactionCopy(reaction) {
  if (reaction === 'danger') return { emoji: '😰', kicker: '*SHUDDERS A LITTLE*', title: 'UH-OH…', sub: 'This one deserves our attention.' };
  if (reaction === 'confident') return { emoji: '😏✊', kicker: '*NODS CONFIDENTLY*', title: 'OH, I LIKE THIS.', sub: 'We have some answers here.' };
  return { emoji: '🤓', kicker: '*ADJUSTS GLASSES*', title: 'I’VE GOT IT.', sub: 'Let’s see what the evidence says.' };
}

export default function AssistantAnalysis({ visible, onClose, rankedSets = [], threatMap = {}, analysisTeam = [], observations = [], eliminatedCount = 0, scientist = {} }) {
  const briefing = useMemo(() => makeBriefing({ rankedSets, threatMap, analysisTeam, observations, eliminatedCount }), [rankedSets, threatMap, analysisTeam, observations, eliminatedCount]);
  const reaction = reactionCopy(briefing.reaction);
  const styleNumber = scientist?.style ?? scientist?.styleId ?? scientist?.battleStyle;
  const styleLabel = styleNumber != null ? getScientistStyleLabel(styleNumber) : null;
  const scientistPhrase = scientist?.phrase || scientist?.text || scientist?.styleText || (styleLabel ? `The favourite battle style appears to be ${styleLabel}.` : 'The Scientist is still gathering clues.');
  const [thinking, setThinking] = useState(false);
  const [thoughtDone, setThoughtDone] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const portraitY = useRef(new Animated.Value(0)).current;
  const reactionScale = useRef(new Animated.Value(0.72)).current;
  const reactionShake = useRef(new Animated.Value(0)).current;
  const glasses = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return undefined;
    setThinking(true); setThoughtDone(false);
    fade.setValue(0); portraitY.setValue(0); reactionScale.setValue(0.72); reactionShake.setValue(0); glasses.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      setThinking(false); setThoughtDone(true);
      const movement = reaction.reaction === 'danger'
        ? Animated.sequence([
            Animated.timing(reactionShake, { toValue: -4, duration: 65, useNativeDriver: true }),
            Animated.timing(reactionShake, { toValue: 4, duration: 65, useNativeDriver: true }),
            Animated.timing(reactionShake, { toValue: -3, duration: 55, useNativeDriver: true }),
            Animated.timing(reactionShake, { toValue: 0, duration: 65, useNativeDriver: true }),
          ])
        : Animated.sequence([
            Animated.timing(portraitY, { toValue: -4, duration: 100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.spring(portraitY, { toValue: 0, friction: 5, tension: 140, useNativeDriver: true }),
          ]);
      Animated.parallel([
        movement,
        Animated.sequence([
          Animated.timing(glasses, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(glasses, { toValue: 0, duration: 170, useNativeDriver: true }),
        ]),
        Animated.spring(reactionScale, { toValue: 1, friction: 5, tension: 125, useNativeDriver: true }),
      ]).start();
    }, 760);
    return () => clearTimeout(timer);
  }, [visible, briefing.reaction]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.modal, { opacity: fade }]}>
          <View style={styles.header}>
            <Animated.View style={[styles.scientistAvatar, { transform: [{ translateY: portraitY }, { translateX: reactionShake }] }]}>
              <Text style={styles.avatarText}>{reaction.emoji}</Text><Animated.View style={[styles.glassesPush, { transform: [{ translateX: glasses.interpolate({ inputRange: [0, 1], outputRange: [0, 5] }) }] }]} /><View style={styles.glassesShine} />
            </Animated.View>
            <View style={styles.headerCopy}><Text style={styles.kicker}>THE FACTORY SCIENTIST</Text><Text style={styles.title}>LAB ASSISTANT</Text><Text style={styles.subtitle}>Your little research partner</Text></View>
            <Pressable onPress={onClose} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            {thinking ? <View style={styles.thoughtPanel}><View style={styles.thoughtBubble}><Text style={styles.thoughtDots}>…</Text><Text style={styles.thoughtText}>Hmm… let me think.</Text></View><Text style={styles.thoughtHint}>Checking the surviving sets, matchup pressure, speed, and coverage…</Text><View style={styles.thinkingRow}><View style={styles.pixelDot} /><View style={styles.pixelDot} /><View style={styles.pixelDot} /></View></View> : <Animated.View style={{ transform: [{ scale: reactionScale }, { translateX: reactionShake }] }}><View style={[styles.reactionBanner, briefing.reaction === 'danger' ? styles.dangerBanner : briefing.reaction === 'confident' ? styles.confidentBanner : styles.neutralBanner]}><Text style={styles.reactionEmoji}>{reaction.emoji}</Text><View style={{ flex: 1 }}><Text style={styles.reactionKicker}>{reaction.kicker}</Text><Text style={styles.reactionTitle}>{reaction.title}</Text><Text style={styles.reactionSub}>{reaction.sub}</Text></View><Text style={styles.reactionSpark}>{briefing.reaction === 'danger' ? '!' : briefing.reaction === 'confident' ? '✦' : '☝'}</Text></View></Animated.View>}
            <View style={styles.scientistNote}><Text style={styles.noteLabel}>SCIENTIST CLUE</Text><Text style={styles.actualPhrase}>“{scientistPhrase}”</Text><Text style={styles.noteHint}>I’ll use the same clue you were given — I’m just helping you make sense of it.</Text></View>
            <View style={styles.speechBubble}><Text style={styles.speechLabel}>{thoughtDone ? 'THE SCIENTIST SAYS…' : 'THE SCIENTIST IS THINKING…'}</Text><Text style={styles.headline}>{briefing.headline}</Text></View>
            <View style={styles.section}><Text style={styles.sectionTitle}>{briefing.reaction === 'danger' ? 'WHY I’M WORRIED' : briefing.reaction === 'confident' ? 'WHY I LIKE OUR POSITION' : 'WHY I’M WATCHING THIS'}</Text>{briefing.reasons.map((reason, index) => <View key={index} style={styles.reasonRow}><Text style={styles.reasonIcon}>{briefing.reaction === 'danger' ? '!' : '•'}</Text><Text style={styles.reason}>{reason}</Text></View>)}</View>
            {briefing.focus?.threat && analysisTeam.length > 0 && <View style={styles.numbersBox}><Text style={styles.sectionTitle}>SHOW ME THE NUMBERS</Text>{briefing.focus.threat.details.map((detail, index) => <View key={`${detail.defender?.species}-${index}`} style={styles.numberRow}><Text style={styles.numberName}>{setLabel(detail.defender)}</Text><Text style={styles.numberText}>{detail.aSpeed > detail.dSpeed ? `Faster: ${detail.aSpeed} vs ${detail.dSpeed}` : detail.aSpeed === detail.dSpeed ? `Speed tie: ${detail.aSpeed}` : `Slower: ${detail.aSpeed} vs ${detail.dSpeed}`}{detail.best ? `  •  ${detail.best.moveName}: ${detail.best.percentMin.toFixed(1)}%–${detail.best.percentMax.toFixed(1)}%` : ''}</Text></View>)}</View>}
            {!!briefing.alternatives?.length && <View style={styles.section}><Text style={styles.sectionTitle}>OTHER THINGS I’M WATCHING</Text>{briefing.alternatives.map((alt, index) => <View key={index} style={styles.altRow}><Text style={styles.altRank}>#{alt.index + 1}</Text><View style={{ flex: 1 }}><Text style={styles.altName}>{setLabel(alt.entry.set)}</Text>{alt.threat && <Text style={styles.altText}>{alt.threat.koCount ? `KO range vs ${alt.threat.koCount}/${alt.threat.teamSize}` : alt.threat.pressureCount ? `50%+ damage vs ${alt.threat.pressureCount}/${alt.threat.teamSize}` : alt.threat.fasterCount ? `Faster than ${alt.threat.fasterCount}/${alt.threat.teamSize}` : 'No mapped damage pressure'}</Text>}</View></View>)}</View>}
            <View style={styles.watchBox}><Text style={styles.sectionTitle}>WHAT I WANT YOU TO WATCH FOR</Text><Text style={styles.watchText}>{briefing.watch}</Text></View>
            <Text style={styles.footer}>I’m on your side, but I won’t pretend the Factory is predictable. I’ll explain the evidence so you can make the call.</Text>
          </ScrollView>
          <Pressable style={styles.backButton} onPress={onClose}><Text style={styles.backText}>← BACK TO CALCULATOR</Text></Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(28,35,29,0.96)', justifyContent: 'flex-end' }, modal: { height: '96%', backgroundColor: '#e7e7de', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden', borderWidth: 3, borderColor: '#344238' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#314b38', borderBottomWidth: 3, borderBottomColor: '#1e2e23' }, scientistAvatar: { width: 58, height: 58, borderRadius: 10, backgroundColor: '#f0ead3', borderWidth: 3, borderColor: '#26372a', alignItems: 'center', justifyContent: 'center', marginRight: 10, overflow: 'hidden' }, avatarText: { fontSize: 31 }, glassesShine: { position: 'absolute', width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff', top: 14, left: 19, opacity: 0.7 }, glassesPush: { position: 'absolute', width: 13, height: 4, borderRadius: 2, backgroundColor: '#26372a', top: 30, left: 16, opacity: 0.75 }, headerCopy: { flex: 1 }, kicker: { color: '#b9cdb8', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, title: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 }, subtitle: { color: '#dbe6d8', fontSize: 10, marginTop: 2, fontWeight: '800' }, closeButton: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#e5e5d9', borderWidth: 2, borderColor: '#25342a', alignItems: 'center', justifyContent: 'center' }, closeText: { fontSize: 26, lineHeight: 28, fontWeight: '900', color: '#304036' },
  scroll: { flex: 1 }, content: { padding: 12, paddingBottom: 20 }, thoughtPanel: { minHeight: 126, alignItems: 'center', justifyContent: 'center', marginBottom: 10, backgroundColor: '#d4ddcf', borderWidth: 2, borderColor: '#5a6958', borderRadius: 14, padding: 12 }, thoughtBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffdf1', borderWidth: 2, borderColor: '#566356', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 }, thoughtDots: { fontSize: 22, fontWeight: '900', color: '#687468', marginRight: 6, marginTop: -4 }, thoughtText: { color: '#374238', fontSize: 14, fontWeight: '900' }, thoughtHint: { color: '#647063', fontSize: 10, fontWeight: '700', marginTop: 8, textAlign: 'center' }, thinkingRow: { flexDirection: 'row', marginTop: 7, gap: 4 }, pixelDot: { width: 4, height: 4, backgroundColor: '#687668' },
  reactionBanner: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderRadius: 13, padding: 10, marginBottom: 10 }, dangerBanner: { backgroundColor: '#f0d8d5', borderColor: '#7c514b' }, confidentBanner: { backgroundColor: '#d9e5cf', borderColor: '#506a4d' }, neutralBanner: { backgroundColor: '#fff2c6', borderColor: '#75663f' }, reactionEmoji: { fontSize: 31, width: 47, textAlign: 'center', marginRight: 8 }, reactionKicker: { color: '#5d665d', fontSize: 8, fontWeight: '900', letterSpacing: 1 }, reactionTitle: { color: '#29352d', fontSize: 16, fontWeight: '900', marginTop: 1 }, reactionSub: { color: '#59645a', fontSize: 10, fontWeight: '800', marginTop: 2 }, reactionSpark: { color: '#5b675b', fontSize: 24, fontWeight: '900' },
  scientistNote: { backgroundColor: '#cfdacb', borderWidth: 2, borderColor: '#586957', borderRadius: 12, padding: 11, marginBottom: 10 }, noteLabel: { color: '#4d5d4d', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, actualPhrase: { color: '#29352d', fontSize: 15, lineHeight: 21, fontWeight: '900', marginTop: 5 }, noteHint: { color: '#637064', fontSize: 9, lineHeight: 13, marginTop: 5 }, speechBubble: { backgroundColor: '#fffdf1', borderWidth: 2, borderColor: '#4b594d', borderRadius: 14, padding: 13, marginBottom: 10 }, speechLabel: { color: '#687469', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, headline: { color: '#263027', fontSize: 17, fontWeight: '900', lineHeight: 23, marginTop: 5 },
  section: { backgroundColor: '#d9e1d5', borderRadius: 12, padding: 11, marginTop: 8 }, sectionTitle: { color: '#425144', fontSize: 10, fontWeight: '900', letterSpacing: 1 }, reasonRow: { flexDirection: 'row', marginTop: 9 }, reasonIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#596a59', color: '#fff', textAlign: 'center', lineHeight: 22, fontWeight: '900', marginRight: 8 }, reason: { flex: 1, color: '#485349', fontSize: 12, lineHeight: 17, fontWeight: '700' }, numbersBox: { backgroundColor: '#f4f3ea', borderRadius: 12, borderWidth: 2, borderColor: '#9ca89b', padding: 11, marginTop: 8 }, numberRow: { borderTopWidth: 1, borderTopColor: '#d0d3cb', paddingTop: 7, marginTop: 7 }, numberName: { color: '#344037', fontSize: 11, fontWeight: '900' }, numberText: { color: '#5b655d', fontSize: 10, lineHeight: 15, marginTop: 2 }, altRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#eef0e9', borderRadius: 8, padding: 8 }, altRank: { color: '#566458', fontWeight: '900', width: 28 }, altName: { color: '#354137', fontSize: 12, fontWeight: '900' }, altText: { color: '#657066', fontSize: 10, marginTop: 2 }, watchBox: { backgroundColor: '#fff4cf', borderWidth: 2, borderColor: '#8a7747', borderRadius: 12, padding: 11, marginTop: 8 }, watchText: { color: '#5b512f', fontSize: 12, lineHeight: 17, marginTop: 5, fontWeight: '700' }, footer: { color: '#737a72', fontSize: 9, lineHeight: 14, margin: 10, textAlign: 'center' }, backButton: { margin: 10, marginTop: 0, paddingVertical: 13, borderRadius: 11, backgroundColor: '#314b38', alignItems: 'center', borderWidth: 2, borderColor: '#203125' }, backText: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 0.6 },
});
