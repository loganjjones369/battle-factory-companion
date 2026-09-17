import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import RunFlowV3 from './RunFlowV3';
import ScientistCluePanel from './components/ScientistCluePanel';
import ThreatDashboard from './components/ThreatDashboard';
import DraftSurvivalDock from './components/DraftSurvivalDock';
import { getCurrentScientist, setCurrentScientist } from './data/scientistSession';

export default function App() {
  const [scientist, setScientist] = useState(getCurrentScientist());
  const updateScientist = (next) => { setScientist(next || {}); setCurrentScientist(next || {}); };
  return <View style={styles.app}>
    <View style={styles.scientistDock}>
      <ScientistCluePanel scientist={scientist} onChange={updateScientist} />
      <ThreatDashboard />
      <DraftSurvivalDock />
    </View>
    <View style={styles.flow}>
      <RunFlowV3 />
    </View>
  </View>;
}

const styles = StyleSheet.create({ app: { flex: 1, backgroundColor: '#071018' }, scientistDock: { paddingTop: 8, paddingHorizontal: 8, backgroundColor: '#071018' }, flow: { flex: 1 } });
