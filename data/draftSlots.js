// Draft-slot metadata for the Emerald Battle Factory Companion.
// The authoritative pool/elevation logic lives in factoryPools.js.
// This module only turns that rule into per-slot metadata used by the UI.

import { getDraftSlotInfo, getDraftSetPools } from './factoryPools';

export function getDraftSlotMetadata({ levelMode = 'Open Level', battle = 1, swaps = 0, slotIndex = 0, blockedSpecies = [] } = {}) {
  const info = getDraftSlotInfo({ levelMode, battle, swaps, slotIndex, blockedSpecies });
  return {
    ...info,
    slotNumber: Number(info.slotIndex) + 1,
    elevated: Boolean(info.isElevated),
    elevationOrder: info.isElevated ? Number(info.slotIndex) + 1 : null,
    factoryIVSource: info.isElevated ? 'ELEVATED RENTAL' : 'STANDARD RENTAL',
    label: info.isElevated ? 'ELEVATED' : 'STANDARD',
  };
}

export function getAllDraftSlotMetadata(options = {}) {
  return Array.from({ length: 6 }, (_, slotIndex) => getDraftSlotMetadata({ ...options, slotIndex }));
}

export function getDraftIVForSlot(options = {}) {
  return getDraftSlotMetadata(options).iv;
}

export function getDraftPoolSummary(options = {}) {
  const pool = getDraftSetPools(options);
  return {
    ...pool,
    elevation: Number(pool.elevation) || 0,
    summary: pool.elevation
      ? `${pool.elevation} of 6 draft slots use ${pool.upgradeBucket}; the remaining ${6 - pool.elevation} use ${pool.baseBucket}.`
      : `All 6 draft slots use ${pool.baseBucket}.`,
  };
}
