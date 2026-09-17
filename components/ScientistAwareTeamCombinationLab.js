import React from 'react';
import TeamCombinationLab from './TeamCombinationLab';
import { getCurrentScientist } from '../data/scientistSession';

/**
 * Draft-side bridge: keeps the existing Team Combination Lab intact while
 * feeding it the live Scientist clues saved by the app-level clue panel.
 * This avoids waiting for a run to be locked before the draft guide can use
 * the clues the player has already entered.
 */
export default function ScientistAwareTeamCombinationLab(props) {
  const scientist = props.scientist && Object.keys(props.scientist).length
    ? props.scientist
    : getCurrentScientist();

  return <TeamCombinationLab {...props} scientist={scientist || {}} />;
}
