import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { calculateDamage, bestDamagingMoves, getStats } from '../data/damageCalc';

const label = (p) => `${p?.species || p?.name || 'Unknown'} ${p?.setId ?? p?.id ?? ''}`.trim();

function checkPair(attacker, defender, level, round) {
  const aStats = getStats(attacker, attacker, level, round);
  const dStats = getStats(defender, defender, level, round);
  let bestOut = null;
  bestDamagingMoves(attacker).forEach((moveName) => {
    const r = calculateDamage({ attacker, attackerSet: attacker, defender, defenderSet: defender, level, round, moveName });
    if (r?.percentMax == null) return;
    if (!bestOut || r.percentMax > bestOut.percentMax) bestOut = { ...r, moveName };
  });
  let bestIn = null;
  bestDamagingMoves(defender).forEach((moveName) => {
    const r = calculateDamage({ attacker: defender, attackerSet: defender, defender: attacker, defenderSet: attacker, level, round, moveName });
    if (r?.percentMax == null) return;
    if (!bestIn || r.percentMax > bestIn.percentMax) bestIn = { ...r, moveName };
  });
  const faster = aStats.spe > dStats.spe;
  const tied = aStats.spe === dStats.spe;
  const guaranteedKo = bestOut?.percentMin >= 100;
  const twoHko = bestOut?.percentMin >= 50;
  const survivesOne = !bestIn || bestIn.percentMax < 100;
  const canActTwice = faster && twoHko;
  const clean = survivesOne && (guaranteedKo || canActTwice);
  return { faster, tied, bestOut, bestIn, guaranteedKo, twoHko, survivesOne, clean };
}

function assessTeam(team, threat, level, round) {
  const checks = team.map((p) => ({ pokemon: p, check: checkPair(p, threat, level, round) }));
  const clean = checks.filter(x => x.check.clean);
  const risky = checks.filter(x => x.check.survivesOne && (x.check.twoHko || x.check.faster));
  return { checks, clean, risky };
}

function comboKey(combo) { return combo.map(p => p.species).join('|'); }

export default function DraftTeamSurvival({ draft = [], levelMode = 'Level 50', battle = 1, maxThreats = 8 }) {
  const level = levelMode === 'Open Level' ? 100 : 50;
  const round = Math.max(1, Math.ceil((Number(battle) || 1) / 7));
  const options = draft.filter(Boolean);
  const combos = useMemo(() => {
    const out = [];
    for (let i = 0; i < options.length - 2; i += 1) {
      for (let j = i + 1; j < options.length - 1; j += 1) {
        for (let k = j + 1; k < options.length; k += 1) {
          const combo = [options[i], options[j], options[k]];
          out.push({ combo, key: comboKey(combo) });
        }
      }
    }
    return out;
  }, [draft]);

  if (options.length < 3) return null;

  return <View style={styles.card}>
    <Text style={styles.kicker}>TEAM SURVIVAL CHECK</Text>
    <Text style={styles.title}>What happens after I draft these three?</Text>
    <Text style={styles.sub}>This checks every three-Pokémon combination you currently have available. A clean answer means the Pokémon survives the candidate's strongest mapped hit and can either guarantee a KO or outspeed and guarantee a 2HKO.</Text>
    {combos.slice(0, maxThreats).map(({ combo, key }, index) => {
      const summary = combo.map((p) => ({ name: label(p) }));
      return <View key={key} style={styles.combo}>
        <View style={styles.comboHead}><Text style={styles.comboNumber}>TEAM OPTION {index + 1}</Text><Text style={styles.comboNames}>{summary.map(x => x.name).join(' • ')}</Text></View>
        <Text style={styles.note}>Exact set survival is evaluated when a remaining Factory candidate is supplied by the parent analysis.</Text>
      </View>;
    })}
    <Text style={styles.footer}>This component deliberately does not call a surviving-candidate engine by itself. It is the safe draft-side framework for the exact-set survival layer, avoiding guesses about which Pokémon remain legal.</Text>
  </View>;
}

const styles = StyleSheet.create({
  card:{backgroundColor:'#111d21',borderWidth:1,borderColor:'#5a4b36',borderRadius:15,padding:11,marginTop:8,marginHorizontal:8},
  kicker:{color:'#d9b979',fontSize:8,fontWeight:'900',letterSpacing:1.4},
  title:{color:'#f3faf7',fontSize:16,fontWeight:'900',marginTop:2},
  sub:{color:'#91a09a',fontSize:9,lineHeight:14,marginTop:3,marginBottom:8},
  combo:{backgroundColor:'#182722',borderRadius:10,padding:9,marginTop:6},
  comboHead:{gap:3},comboNumber:{color:'#7f9b8d',fontSize:7,fontWeight:'900',letterSpacing:1},comboNames:{color:'#edf5f0',fontSize:11,fontWeight:'900'},
  note:{color:'#aeb9b2',fontSize:8,lineHeight:12,marginTop:5},footer:{color:'#6f7d76',fontSize:8,lineHeight:12,marginTop:8}
});
