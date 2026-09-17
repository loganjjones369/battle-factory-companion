import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import DraftSurvivalAnalysis from './DraftSurvivalAnalysis';
import { getActiveRunContext } from '../data/runProgress';

export default function DraftSurvivalDock() {
  const [context, setContext] = useState(() => getActiveRunContext() || {});

  useEffect(() => {
    const refresh = () => setContext(getActiveRunContext() || {});
    refresh();
    const id = setInterval(refresh, 700);
    return () => clearInterval(id);
  }, []);

  const draft = Array.isArray(context.draft) ? context.draft.filter(Boolean) : [];
  if (draft.length < 3) return null;

  return <View>
    <DraftSurvivalAnalysis
      draft={draft}
      scientist={context.scientist || {}}
      blockedSpecies={context.blocked || context.blockedSpecies || []}
      levelMode={Number(context.level) === 50 ? 'Level 50' : 'Open Level'}
      battle={Number(context.battle) || 1}
      revealed={context.revealed || {}}
      noland={!!context.noland}
    />
  </View>;
}
