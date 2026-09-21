// Draft-slot metadata for the Emerald Battle Factory Companion.
// The Factory places upgraded/elevated draft Pokémon from left to right:
// slot 1 is elevated first, then slot 2, etc. This module keeps that rule
// separate from the UI so the same elevation identity can drive IVs, pool
// selection, and later damage calculations.

import { getDraftElevation, getPlayerDraftBaseBucket, getPlayerDraftUpgradeBucket } from './factoryPools';
import { getFactoryIV } from './damageCalc';

function level50BucketToIV(bucket) {
  // Level 50 Group 3 buckets correspond to Factory rounds 4-8+.
  // Buckets 1-5 represent the first through fifth Group 3 variants.
  const b = Number(bucket);
  if (!Number.isFinite(b) || b <= 0) return null;
  const factoryRound = Math.min(7, b + 3);
  return getFactoryIV(factoryRound);
}

function bucketToIV(levelMode, bucket) {
  if (bucket == null) return null;
  if (levelMode === 'Level 50') return level50BucketToIV(bucket);

  // Open Level buckets 1-4 map directly to Factory rounds 1-4;
  // bucket 6 is the round-5+ high-tier pool and uses 31 IVs.
  const b = Number(bucket);
  if (b === 6) return 31;
  if (!Number.isFinite(b) || b <= 0) return null;
  return getFactoryIV(Math.min(7, b));
}

export function getDraftSlotMetadata({ levelMode = 'Open Level', battle = 1, swaps = 0, slotIndex = 0 } = {}) {
  const elevation = getDraftElevation(swaps);
  const slot = Number(slotIndex);
  const elevated = Number.isInteger(slot) && slot >= 0 && slot < elevation;
  const baseBucket = getPlayerDraftBaseBucket(levelMode, battle);
  const upgradeBucket = getPlayerDraftUpgradeBucket(levelMode, battle);
  const poolBucket = elevated ? upgradeBucket : baseBucket;
  const iv = bucketToIV(levelMode, poolBucket);

  return {
    slotIndex: Number.isInteger(slot) ? slot : 0,
    slotNumber: (Number.isInteger(slot) ? slot : 0) + 1,
    elevated,
    elevationOrder: elevated ? (Number.isInteger(slot) ? slot : 0) + 1 : null,
    elevationCount: elevation,
    baseBucket,
    upgradeBucket,
    poolBucket,
    iv,
    label: elevated ? 'ELEVATED' : 'STANDARD',
    factoryIVSource: elevated ? 'ELEVATED RENTAL' : 'STANDARD RENTAL',
  };
}

export function getAllDraftSlotMetadata(options = {}) {
  return Array.from({ length: 6 }, (_, slotIndex) => getDraftSlotMetadata({ ...options, slotIndex }));
}

export function getDraftIVForSlot(options = {}) {
  return getDraftSlotMetadata(options).iv;
}
