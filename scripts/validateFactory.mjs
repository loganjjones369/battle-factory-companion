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
if (!damage.includes('fixedDamage') || !damage.includes('multiHit') || !damage.includes('Super Fang') || !damage.includes('Endeavor')) {
  throw new Error('Gen III fixed-damage or multi-hit move handling is incomplete');
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
