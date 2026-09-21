import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY='bf-companion-active-run-v1';

export const serializeRun=state=>JSON.stringify({...state,savedAt:new Date().toISOString()});
export function hydrateRun(raw){try{return typeof raw==='string'?JSON.parse(raw):raw||null}catch{return null}}
export const getRunStorageKey=()=>STORAGE_KEY;

export async function saveRunSnapshot(snapshot){
  if(!snapshot?.state)return;
  await AsyncStorage.setItem(STORAGE_KEY,JSON.stringify({...snapshot,savedAt:new Date().toISOString()}));
}

export async function loadRunSnapshot(){
  try{return hydrateRun(await AsyncStorage.getItem(STORAGE_KEY));}catch{return null;}
}

export async function clearRunSnapshot(){
  try{await AsyncStorage.removeItem(STORAGE_KEY);}catch{}
}
