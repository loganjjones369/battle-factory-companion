import React from 'react';
import { ScrollView } from 'react-native';
import RunFlowV3 from './RunFlowV3';
import DraftMatchupLab from './components/DraftMatchupLab';

export default function App() {
  return <ScrollView keyboardShouldPersistTaps="handled">
    <DraftMatchupLab level="Level 50" battle={1} />
    <RunFlowV3 />
  </ScrollView>;
}
