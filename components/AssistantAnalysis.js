import React,{useEffect,useMemo,useRef,useState}from'react';
import{Animated,Modal,Pressable,ScrollView,StyleSheet,Text,View}from'react-native';
import{getScientistStyleLabel}from'../data/scientistAnalysis';
import{buildThreatProfile}from'../data/threatProfile';

const norm=v=>String(v||'').trim().toLowerCase();
const label=s=>`${s?.species||s?.name||'Unknown'} ${s?.setId??s?.sourceId??s?.id??''}`.trim();
const moves=s=>(s?.moves||[]).map(m=>typeof m==='string'?m:m?.name).filter(Boolean);

function scoreCandidate(entry,threatMap){
 const e=entry?.set||{};
 const key=`${norm(e.species)}#${e.id??e.sourceId??e.setId??''}`;
 const t=threatMap[key];
 return{entry,threat:t,score:Number(entry?.frequency||0)*2+(t?.koCount||0)*7+(t?.pressureCount||0)*2+(t?.fasterCount||0)};
}

function buildReaction(rankedSets,threatMap,team){
 if(!rankedSets.length||!team.length)return'neutral';
 const profile=buildThreatProfile(rankedSets,team);
 const scored=rankedSets.map(e=>scoreCandidate(e,threatMap)).sort((a,b)=>b.score-a.score);
 const meaningful=scored.filter(x=>x.threat&&(x.threat.koCount>0||x.threat.pressureCount>=2));
 const focus=scored[0];
 if(profile?.threatLevel==='high'&&meaningful.length>=Math.max(1,Math.ceil(rankedSets.length*.15)))return'team-danger';
 if(focus?.threat?.koCount>0||focus?.threat?.pressureCount>=2)return'specific-danger';
 if(profile?.hasMultipleAnswers&&meaningful.length===0)return'confident';
 return'neutral';
}

function makeBriefing({rankedSets=[],threatMap={},analysisTeam=[],observations=[],eliminatedCount=0}){
 if(!rankedSets.length)return{reaction:'neutral',headline:'I do not have a surviving candidate yet.',reasons:['Run the Factory analysis after entering the draft, Scientist clue, and any opponent information you have seen.'],watch:'Check the battle number, level mode, and Scientist information.'};
 const profile=buildThreatProfile(rankedSets,analysisTeam);
 const scored=rankedSets.map(e=>scoreCandidate(e,threatMap)).sort((a,b)=>b.score-a.score);
 const focus=scored[0],set=focus.entry.set,t=focus.threat,reasons=[];
 if(profile?.threatType&&analysisTeam.length){
  const pct=Math.round(profile.pressureShare*100);
  reasons.push(`The surviving pool is showing ${profile.threatType} pressure. ${pct}% of the mapped offensive signal points that way.`);
  if(profile.vulnerable)reasons.push(`${profile.vulnerable} of your ${analysisTeam.length} Pokémon are vulnerable to that pressure${profile.immune?`, while ${profile.immune} have an immunity`:''}.`);
  if(profile.answers)reasons.push(`${profile.answers} of your ${analysisTeam.length} Pokémon have a practical answer through typing, mapped moves, or immunity.`);
 }
 if(t?.koCount)reasons.push(`${label(set)} has a mapped move in KO range against ${t.koCount}/${t.teamSize} of your current Pokémon.`);
 else if(t?.pressureCount)reasons.push(`${label(set)} reaches at least 50% mapped damage against ${t.pressureCount}/${t.teamSize} of your current Pokémon.`);
 if(t?.fasterCount)reasons.push(`It is faster than ${t.fasterCount}/${t.teamSize} of your current Pokémon using the exact set stats.`);
 const pct=Math.max(0,Number(focus.entry.frequency||0)*100);
 if(pct)reasons.push(`It appears in ${pct.toFixed(1)}% of surviving candidate teams. That is candidate frequency, not an in-game probability.`);
 const obs=observations.find(o=>norm(o?.species)===norm(set?.species));
 if(obs){const km=moves(set).filter(m=>(obs.moves||[]).some(x=>norm(x)===norm(m)));if(km.length)reasons.push(`You have already seen ${km.join(', ')} from this species, supporting this set family.`);if(obs.item&&norm(obs.item)===norm(set.item))reasons.push(`The observed held item matches this set: ${set.item}.`);}
 if(!reasons.length)reasons.push('This is one of the strongest surviving possibilities after the Factory rules and clues are applied.');
 let watch='Watch for a move, item, or switch that separates this set from the other surviving sets.';
 if(!analysisTeam.length)watch='Once your three Pokémon are selected, I can turn this into matchup-specific speed and damage analysis.';
 else if(eliminatedCount)watch=`${eliminatedCount} candidate sets have already disappeared. The next useful information is whatever separates the remaining sets.`;
 return{reaction:buildReaction(rankedSets,threatMap,analysisTeam),headline:`My biggest concern right now is ${label(set)}.`,reasons,watch,focus,profile,alternatives:scored.slice(1,3)};
}

function reactionCopy(r){
 if(r==='team-danger')return{emoji:'😰',kicker:'*SHUDDERS*',title:'UH-OH…',sub:'The remaining pool is showing real pressure.'};
 if(r==='specific-danger')return{emoji:'😳',kicker:'*WAIT—*',title:'THAT ONE.',sub:'One particular set has my attention.'};
 if(r==='confident')return{emoji:'😏✊',kicker:'*NODS CONFIDENTLY*',title:'OH, I LIKE THIS.',sub:'We have multiple answers to the main pressure.'};
 return{emoji:'🤓',kicker:'*ADJUSTS GLASSES*',title:'I’VE GOT IT.',sub:'Let’s see what the evidence says.'};
}

export default function AssistantAnalysis({visible,onClose,rankedSets=[],threatMap={},analysisTeam=[],observations=[],eliminatedCount=0,scientist={}}){
 const briefing=useMemo(()=>makeBriefing({rankedSets,threatMap,analysisTeam,observations,eliminatedCount}),[rankedSets,threatMap,analysisTeam,observations,eliminatedCount]);
 const reaction=reactionCopy(briefing.reaction);
 const[thinking,setThinking]=useState(false);const[done,setDone]=useState(false);
 const fade=useRef(new Animated.Value(0)).current,bounce=useRef(new Animated.Value(.82)).current,shake=useRef(new Animated.Value(0)).current,glasses=useRef(new Animated.Value(0)).current;
 useEffect(()=>{if(!visible)return;setThinking(true);setDone(false);fade.setValue(0);bounce.setValue(.82);shake.setValue(0);glasses.setValue(0);Animated.timing(fade,{toValue:1,duration:180,useNativeDriver:true}).start();const timer=setTimeout(()=>{setThinking(false);setDone(true);const danger=briefing.reaction==='team-danger'||briefing.reaction==='specific-danger';Animated.parallel([Animated.spring(bounce,{toValue:1,friction:5,tension:130,useNativeDriver:true}),Animated.sequence([Animated.timing(glasses,{toValue:1,duration:100,useNativeDriver:true}),Animated.timing(glasses,{toValue:0,duration:140,useNativeDriver:true})]),danger?Animated.sequence([Animated.timing(shake,{toValue:-5,duration:55,useNativeDriver:true}),Animated.timing(shake,{toValue:5,duration:55,useNativeDriver:true}),Animated.timing(shake,{toValue:-3,duration:45,useNativeDriver:true}),Animated.timing(shake,{toValue:0,duration:55,useNativeDriver:true})]):Animated.timing(shake,{toValue:0,duration:1,useNativeDriver:true})]).start()},760);return()=>clearTimeout(timer)},[visible,briefing.reaction]);
 const explicitStyle=scientist?.style??scientist?.styleId??scientist?.battleStyle;const inferredStyle=rankedSets.map(e=>e?.set?.style).find(v=>v!==undefined&&v!==null&&v!=='');const n=explicitStyle??inferredStyle;const sl=n!=null?getScientistStyleLabel(n):null;const phrase=scientist?.phrase||scientist?.text||scientist?.styleText||(sl?`The surviving candidates fit the Scientist's “${sl}” battle style.`:'The Scientist is still gathering clues.');
 const profile=briefing.profile;const answers=(profile?.answerDetails||[]).filter(x=>x.isAnswer);const focusDetails=Array.isArray(briefing.focus?.threat?.details)?briefing.focus.threat.details:[];
 return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={s.overlay}><Animated.View style={[s.modal,{opacity:fade}]}>
  <View style={s.header}><Animated.View style={[s.avatar,{transform:[{scale:bounce},{translateX:shake}]}]}><Text style={s.avatarText}>{thinking?'🤔':reaction.emoji}</Text><Animated.View style={[s.glasses,{transform:[{translateX:glasses.interpolate({inputRange:[0,1],outputRange:[0,5]})}]}]}/></Animated.View><View style={{flex:1}}><Text style={s.kicker}>THE FACTORY SCIENTIST</Text><Text style={s.title}>LAB ASSISTANT</Text><Text style={s.sub}>Your little research partner</Text></View><Pressable onPress={onClose} style={s.close}><Text style={s.closeText}>×</Text></Pressable></View>
  <ScrollView contentContainerStyle={s.content}>
   {thinking?<View style={s.thought}><View style={s.bubble}><Text style={s.dots}>…</Text><Text style={s.thoughtText}>Hmm… let me think.</Text></View><Text style={s.hint}>Checking surviving sets, matchup pressure, speed, and coverage…</Text></View>:<Animated.View style={{transform:[{scale:bounce},{translateX:shake}]}}><View style={[s.reaction,briefing.reaction==='confident'?s.confident:s.danger]}><Text style={s.reactionEmoji}>{reaction.emoji}</Text><View style={{flex:1}}><Text style={s.reactionKicker}>{reaction.kicker}</Text><Text style={s.reactionTitle}>{reaction.title}</Text><Text style={s.reactionSub}>{reaction.sub}</Text></View><Text style={s.spark}>{briefing.reaction==='confident'?'✦':'☝'}</Text></View></Animated.View>}
   <View style={s.clue}><Text style={s.sectionTitle}>SCIENTIST CLUE</Text><Text style={s.phrase}>“{phrase}”</Text></View>
   <View style={s.speech}><Text style={s.labelText}>{done?'THE SCIENTIST SAYS…':'THE SCIENTIST IS THINKING…'}</Text><Text style={s.headline}>{briefing.headline}</Text></View>
   {profile&&analysisTeam.length>0&&<View style={s.profile}><Text style={s.sectionTitle}>WHAT HE'S PICKING UP</Text><Text style={s.profileTitle}>{profile.threatType} pressure • {Math.round(profile.pressureShare*100)}% signal</Text><Text style={s.profileText}>{profile.vulnerable}/{analysisTeam.length} vulnerable • {profile.answers}/{analysisTeam.length} practical answers</Text>{answers.length>0&&<View style={s.answerRow}>{answers.map((a,i)=><View key={i} style={s.answerChip}><Text style={s.answerText}>✓ {a.name}</Text></View>)}</View>}</View>}
   <View style={s.section}><Text style={s.sectionTitle}>{briefing.reaction==='team-danger'||briefing.reaction==='specific-danger'?'WHY I’M WORRIED':briefing.reaction==='confident'?'WHY I LIKE OUR POSITION':'WHY I’M WATCHING THIS'}</Text>{briefing.reasons.map((x,i)=><View key={i} style={s.row}><Text style={s.icon}>{briefing.reaction==='team-danger'||briefing.reaction==='specific-danger'?'!':'•'}</Text><Text style={s.reason}>{x}</Text></View>)}</View>
   {focusDetails.length>0&&analysisTeam.length>0&&<View style={s.numbers}><Text style={s.sectionTitle}>SHOW ME THE NUMBERS</Text>{focusDetails.map((d,i)=><Text key={i} style={s.detail}>{label(d.defender)}: {d.aSpeed>d.dSpeed?`faster (${d.aSpeed} vs ${d.dSpeed})`:d.aSpeed===d.dSpeed?`speed tie (${d.aSpeed})`:`slower (${d.aSpeed} vs ${d.dSpeed})`}{d.best?` • ${d.best.moveName}: ${d.best.percentMin.toFixed(1)}%–${d.best.percentMax.toFixed(1)}%`:''}</Text>)}</View>}
   <View style={s.watch}><Text style={s.sectionTitle}>WHAT I WANT YOU TO WATCH FOR</Text><Text style={s.watchText}>{briefing.watch}</Text></View><Text style={s.footer}>I’ll explain the evidence rather than pretending the Factory is predictable.</Text>
  </ScrollView><Pressable style={s.back} onPress={onClose}><Text style={s.backText}>← BACK TO CALCULATOR</Text></Pressable>
 </Animated.View></View></Modal>;
}

const s=StyleSheet.create({overlay:{flex:1,backgroundColor:'rgba(28,35,29,.96)',justifyContent:'flex-end'},modal:{height:'96%',backgroundColor:'#e7e7de',borderTopLeftRadius:20,borderTopRightRadius:20,overflow:'hidden',borderWidth:3,borderColor:'#344238'},header:{flexDirection:'row',alignItems:'center',padding:12,backgroundColor:'#314b38',borderBottomWidth:3,borderBottomColor:'#1e2e23'},avatar:{width:58,height:58,borderRadius:10,backgroundColor:'#f0ead3',borderWidth:3,borderColor:'#26372a',alignItems:'center',justifyContent:'center',marginRight:10},avatarText:{fontSize:30},glasses:{position:'absolute',width:14,height:4,borderRadius:2,backgroundColor:'#26372a',top:30,left:17},kicker:{color:'#b9cdb8',fontSize:9,fontWeight:'900',letterSpacing:1.2},title:{color:'#fff',fontSize:20,fontWeight:'900'},sub:{color:'#dbe6d8',fontSize:10,fontWeight:'800'},close:{width:38,height:38,borderRadius:10,backgroundColor:'#e5e5d9',alignItems:'center',justifyContent:'center'},closeText:{fontSize:26,fontWeight:'900'},content:{padding:12,paddingBottom:20},thought:{minHeight:126,alignItems:'center',justifyContent:'center',backgroundColor:'#d4ddcf',borderWidth:2,borderColor:'#5a6958',borderRadius:14,padding:12,marginBottom:10},bubble:{flexDirection:'row',alignItems:'center',backgroundColor:'#fffdf1',borderWidth:2,borderColor:'#566356',borderRadius:18,padding:10},dots:{fontSize:22,fontWeight:'900',marginRight:6},thoughtText:{color:'#374238',fontSize:14,fontWeight:'900'},hint:{color:'#647063',fontSize:10,fontWeight:'700',marginTop:8,textAlign:'center'},reaction:{flexDirection:'row',alignItems:'center',borderWidth:2,borderRadius:13,padding:10,marginBottom:10},danger:{backgroundColor:'#f0d8d5',borderColor:'#7c514b'},confident:{backgroundColor:'#d9e5cf',borderColor:'#506a4d'},reactionEmoji:{fontSize:31,width:47,textAlign:'center'},reactionKicker:{color:'#5d665d',fontSize:8,fontWeight:'900'},reactionTitle:{color:'#29352d',fontSize:16,fontWeight:'900'},reactionSub:{color:'#59645a',fontSize:10,fontWeight:'800'},spark:{fontSize:24,fontWeight:'900'},clue:{backgroundColor:'#cfdacb',borderWidth:2,borderColor:'#586957',borderRadius:12,padding:11,marginBottom:10},sectionTitle:{color:'#425144',fontSize:10,fontWeight:'900',letterSpacing:1},phrase:{color:'#29352d',fontSize:15,lineHeight:21,fontWeight:'900',marginTop:5},speech:{backgroundColor:'#fffdf1',borderWidth:2,borderColor:'#4b594d',borderRadius:14,padding:13,marginBottom:10},labelText:{color:'#687469',fontSize:9,fontWeight:'900'},headline:{color:'#263027',fontSize:17,fontWeight:'900',lineHeight:23,marginTop:5},profile:{backgroundColor:'#d9e5cf',borderWidth:2,borderColor:'#6c8068',borderRadius:12,padding:11,marginTop:8},profileTitle:{color:'#30412f',fontSize:14,fontWeight:'900',marginTop:5},profileText:{color:'#52604f',fontSize:11,fontWeight:'800',marginTop:4},answerRow:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:8},answerChip:{backgroundColor:'#eef4e9',borderWidth:1,borderColor:'#80927b',borderRadius:8,paddingVertical:4,paddingHorizontal:7},answerText:{color:'#42563e',fontSize:10,fontWeight:'900'},section:{backgroundColor:'#d9e1d5',borderRadius:12,padding:11,marginTop:8},row:{flexDirection:'row',marginTop:9},icon:{width:22,height:22,borderRadius:11,backgroundColor:'#596a59',color:'#fff',textAlign:'center',lineHeight:22,fontWeight:'900',marginRight:8},reason:{flex:1,color:'#485349',fontSize:12,lineHeight:17,fontWeight:'700'},numbers:{backgroundColor:'#f4efe0',borderWidth:2,borderColor:'#81775b',borderRadius:12,padding:11,marginTop:8},detail:{color:'#4d4a3f',fontSize:11,lineHeight:17,fontWeight:'800',marginTop:5},watch:{backgroundColor:'#fffdf1',borderWidth:2,borderColor:'#4b594d',borderRadius:12,padding:11,marginTop:8},watchText:{color:'#4d584e',fontSize:12,lineHeight:18,fontWeight:'800',marginTop:5},footer:{textAlign:'center',color:'#7b847a',fontSize:9,fontWeight:'700',marginVertical:12},back:{padding:14,backgroundColor:'#314b38',alignItems:'center',borderTopWidth:2,borderTopColor:'#1e2e23'},backText:{color:'#fff',fontSize:11,fontWeight:'900',letterSpacing:.8}});
