import assert from 'node:assert/strict';
import { inferSetEvidence, inferSpeedCandidates } from '../data/evidenceInference.js';

const setA={species:'Testmon',id:1,item:'Leftovers',ability:'Static',moves:['Tackle','Protect']};
const setB={species:'Testmon',id:2,item:'Choice Band',ability:'Static',moves:['Tackle','ThunderPunch']};
assert.equal(inferSetEvidence({sets:[setA,setB],observation:{item:'Leftovers',moves:['Protect']}}).filter(x=>x.compatible).length,1);

const fast={id:1};
const slow={id:2};
const pokemon={baseStats:{hp:50,attack:50,defense:50,specialAttack:50,specialDefense:50,speed:100}};
const speedResult=inferSpeedCandidates({pokemon,sets:[fast,slow],level:50,round:1,observedSpeed:120,observedRelation:'at least'});
assert.ok(Array.isArray(speedResult.possible));

console.log('Evidence smoke tests passed.');
