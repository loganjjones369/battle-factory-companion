import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import RunFlowV3 from './RunFlowV3';
import DraftMatchupLab from './components/DraftMatchupLab';
import ScientistCluePanel from './components/ScientistCluePanel';
import { getCurrentScientist, setCurrentScientist } from './data/scientistSession';

export default function App() {
  const [scientist, setScientist] = useState(getCurrentScientist());
  const updateScientist = (next) => { setScientist(next || {}); setCurrentScientist(next || {}); };
  return <View style={{ flex: 1 }}>
    <View style={styles.scientistDock}>
      <ScientistCluePanel scientist={scientist} onChange={updateScientist} />
    </View>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
      <DraftMatchupLab level="Level 50" battle={1} />
      <RunFlowV3 />
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  scientistDock: { paddingTop: 8, paddingHorizontal: 8, backgroundColor: '#071018' },
});
