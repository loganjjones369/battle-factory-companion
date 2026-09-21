import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const data = read('data/factoryData.js');
const damage = read('data/damageCalc.js');
const response = read('data/responseAnalysis.js');
const scenario = read('data/scenarioDamage.js');
const battleState = read('data/battleState.js');
const rules = read('data/factoryRules.js');
const candidate = read('data/candidateEngine.js');
const draft = read('components/DraftDecisionLab.js');
const pkg = JSON.parse(read('package.json'));

const setCount = Number(data.match(/setCount:\s*(\d+)/)?.[1] || 0);
const speciesCount = Number(data.match(/speciesCount:\s*(\d+)/)?.[1] || 0);
const moveCount = (damage.match(/^  "[^"]+": \{ type:/gm) || []).length;

if (setCount !== 667) throw new Error(`Expected 667 Factory sets, found ${setCount}`);
if (speciesCount !== 265) throw new Error(`Expected 265 Factory species, found ${speciesCount}`);
if (moveCount < 100) throw new Error(`Expected broad move coverage, found only ${moveCount} damaging moves`);

const forbidden = /OHKO|2HKO|3HKO|Guaranteed 2HKO|Possible 2HKO|Guaranteed OHKO|guaranteedOHKO|guaranteedTwoHKO/;
for (const [name, source] of Object.entries({ response, scenario, draft })) {
  if (forbidden.test(source)) throw new Error(`KO terminology remains in ${name}`);
}

if (!battleState.includes('normalizeBattleConditions') || !battleState.includes('battleConditions')) {
  throw new Error('Battle condition state is not wired into battle-state creation');
}
if (!rules.includes('nolandSilverIV: 15') || !rules.includes('nolandGoldIV: 31')) {
  throw new Error('Noland IV rules are missing');
}
if (!candidate.includes("String(set.pool) === 'g3-5'") || !candidate.includes("Dragonite', 'Tyranitar")) {
  throw new Error('Noland late Level 50 exclusions are missing');
}

if (!pkg.dependencies['@react-native-async-storage/async-storage']) {
  throw new Error('AsyncStorage dependency is missing');
}

if (!scenario.includes('hpPercent') || !scenario.includes('screens') || !scenario.includes('hazards') || !scenario.includes('scenarioSwitchInDamage')) {
  throw new Error('Scenario analysis is not consuming current HP, screens, and hazards');
}
if (!scenario.includes('getFactorySet') || !scenario.includes('defenderHP') || scenario.includes('stealthRock')) {
  throw new Error('Scenario analysis is not using exact Factory sets or still contains Emerald-incompatible Stealth Rock');
}
const damageCalc = read('data/damageCalc.js');
if (!damageCalc.includes("moveName === 'Explosion'")) {
  throw new Error('Gen III Explosion defense handling is missing');
}
if (!damageCalc.includes('toxicCounter')) {
  throw new Error('Toxic counter support is missing');
}
if (!damageCalc.includes('bindFraction')) {
  throw new Error('Binding damage fraction support is missing');
}
if (!damageCalc.includes("fixedDamage === 'half-current-hp'")) {
  throw new Error('Super Fang current-HP damage handling is missing');
}
if (!damageCalc.includes("fixedDamage === 'psywave'")) {
  throw new Error('Psywave handling is missing');
}

const battleRoom = read('components/BattleRoom.js');
if (battleRoom.includes('raw.githubusercontent.com') || battleRoom.includes('https://')) {
  throw new Error('BattleRoom still contains a remote asset dependency');
}
if (!battleRoom.includes('STAGE_STATS') || !battleRoom.includes('reflect') || !battleRoom.includes('lightScreen') || !battleRoom.includes('spikes')) {
  throw new Error('BattleRoom condition controls are incomplete');
}
if (!damage.includes('fixedDamage') || !damage.includes('multiHit') || !damage.includes('Super Fang') || !damage.includes('Endeavor') || !damage.includes("moveName === 'Pursuit'") || !damage.includes("moveName === 'Revenge'") || !damage.includes("moveName === 'SolarBeam'") || !damage.includes("moveName === 'Rollout'") || !damage.includes("moveName === 'Fury Cutter'")) {
  throw new Error('Gen III fixed-damage or multi-hit move handling is incomplete');
}
if (!damage.includes("toxicCounter") || !damage.includes("bindFraction") || !damage.includes("moveName === 'Explosion'")) {
  throw new Error('Gen III residual/Explosion mechanics coverage is incomplete');
}
if (!damage.includes('calculateResidualDamage') || !damage.includes('weather === ' + "'sand'") || !damage.includes('weather === ' + "'hail'") || damage.includes('stealthRock')) {
  throw new Error('Gen III residual damage analysis is incomplete');
}
const sequence = read('data/battleSequence.js');
if (!sequence.includes('getMovePriority') || !sequence.includes('compareTurnOrder') || !sequence.includes('QuickAttack') || !sequence.includes('ExtremeSpeed')) {
  throw new Error('Gen III priority-aware turn ordering helpers are missing');
}
if (!damageCalc.includes('getGen3Priority') || !damageCalc.includes("'Fake Out': 3") || !damageCalc.includes("'Helping Hand': 5")) {
  throw new Error('Damage engine is missing Gen III move priority metadata');
}
if (!damageCalc.includes('GEN3_MULTI_HIT_COUNTS') || !damageCalc.includes('{ hits: 2, probability: 35 }') || !damageCalc.includes('{ hits: 5, probability: 15 }')) {
  throw new Error('Gen III multi-hit distribution metadata is missing');
}
if (!damageCalc.includes('hitDistribution')) {
  throw new Error('Multi-hit damage distribution is not exposed by the damage engine');
}
if (!damageCalc.includes('defenderSubstitute') || !damageCalc.includes('substituteBreaks') || !scenario.includes('defenderSubstitute')) {
  throw new Error('Gen III Substitute state is not wired into scenario damage');
}
if (!damageCalc.includes('getGen3MoveTurnProfile') || !damageCalc.includes('requiresRechargeTurn') || !sequence.includes('getMoveTurnProfile')) {
  throw new Error('Gen III multi-turn move profiles are missing');
}

for (const required of [
  'data/candidateEngine.js',
  'data/draftBrain.js',
  'data/runPersistence.js',
  'data/scenarioDamage.js',
]) {
  if (!fs.existsSync(path.join(root, required))) throw new Error(`Missing required module: ${required}`);
}

console.log(`Factory validation passed: ${speciesCount} species, ${setCount} sets, ${moveCount} damaging move entries.`);
