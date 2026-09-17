import React from 'react';
import { View } from 'react-native';
import RunFlowV3 from './RunFlowV3';
import DraftMatchupLab from './components/DraftMatchupLab';

export default function App() {
  return <View style={{ flex: 1 }}>
    <DraftMatchupLab level="Level 50" battle={1} />
    <RunFlowV3 />
  </View>;
}
