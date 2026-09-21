import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const data = read('data/factoryData.js');
const damage = read('data/damageCalc.js');
const response = read('data/responseAnalysis.js');
const scenario = read('data/scenarioDamage.js');
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

if (!pkg.dependencies['@react-native-async-storage/async-storage']) {
  throw new Error('AsyncStorage dependency is missing');
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
