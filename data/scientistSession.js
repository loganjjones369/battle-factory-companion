let CURRENT_SCIENTIST = {};

export function getCurrentScientist() {
  return CURRENT_SCIENTIST;
}

export function setCurrentScientist(scientist = {}) {
  CURRENT_SCIENTIST = { ...scientist };
  return CURRENT_SCIENTIST;
}

export function clearCurrentScientist() {
  CURRENT_SCIENTIST = {};
  return CURRENT_SCIENTIST;
}
