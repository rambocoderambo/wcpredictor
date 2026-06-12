import * as apiFootball from './sources/api-football.js';
import * as sofascore from './sources/sofascore.js';
import * as footballData from './sources/football-data.js';
import {setLiveData,readIndex,getVersion} from './update-index.js';
import {TEAM_NAMES,toApiFootball} from './team-mapping.js';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const SOFASCORE_KEY1 = process.env.SOFASCORE_KEY1;
const SOFASCORE_KEY2 = process.env.SOFASCORE_KEY2;
const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY;

if(!RAPIDAPI_KEY){console.error('Missing RAPIDAPI_KEY');process.exit(1)}
if(!FOOTBALL_DATA_KEY){console.error('Missing FOOTBALL_DATA_KEY');process.exit(1)}

apiFootball.init(RAPIDAPI_KEY);
sofascore.init(SOFASCORE_KEY1||RAPIDAPI_KEY);
footballData.init(FOOTBALL_DATA_KEY);

const today=new Date().toISOString().slice(0,10);

function emptyData(){return{
  wcForm:'',wcGs:0,wcGc:0,wcWr:0,wcAh:0,wcMatches:0,
  wcCards:0,wcReds:0,wcPossession:0,wcShots:0,
  wcShotsConceded:0,wcGkSaves:0,wcFouls:0,wcOffsides:0,
  wcPensAwarded:0,wcLateGoals:0,wcCleanSheets:0,
  wcRestDays:0,wcH2h:null,wcFormation:0
}}

function emptyDataObj(){const o={};for(const t of TEAM_NAMES)o[t]=emptyData();return o}

function getExistingLiveData(html){
  const m=html.match(/const LIVE_DATA = (\{[\s\S]*?\});/);
  if(!m)return emptyDataObj();
  try{
    const clean=m[1].replace(/(\w+):/g,'"$1":');
    const parsed=JSON.parse(clean);
    for(const t of TEAM_NAMES){if(!parsed[t])parsed[t]=emptyData()}
    return parsed;
  }catch(e){return emptyDataObj()}
}

function deriveForm(matches,team){
  const teamMatches=matches.filter(m=>m.home===team||m.away===team);
  const last10=teamMatches.slice(-10);
  return last10.map(m=>{
    if(m.homeGoals===null||m.awayGoals===null)return '';
    const isHome=m.home===team;
    const gf=isHome?m.homeGoals:m.awayGoals;
    const ga=isHome?m.awayGoals:m.homeGoals;
    if(gf>ga)return'W';if(gf<ga)return'L';return'D';
  }).filter(Boolean).join('-');
}

function getH2h(liveData,teamA,teamB){
  if(liveData[teamA]?.wcH2h)return liveData[teamA].wcH2h;
  if(liveData[teamB]?.wcH2h)return liveData[teamB].wcH2h;
  return null;
}

async function fetchTodayMatches(){
  try{
    const fixtures=await apiFootball.getFixtures(today);
    if(fixtures.length)return fixtures;
  }catch(e){console.warn('API-Football fixtures failed:',e.message)}
  try{
    const yesterday=new Date(Date.now()-864e5).toISOString().slice(0,10);
    const matches=await footballData.getMatches(yesterday,today);
    if(matches.length)return matches.map(m=>({
      id:0,date:m.date,status:m.status==='FINISHED'?'FT':'SCHEDULED',
      home:m.home,away:m.away,homeGoals:m.homeScore,awayGoals:m.awayScore,
      venue:'',city:'',elapsed:0
    }));
  }catch(e){console.warn('Football-data.org fallback failed:',e.message)}
  return [];
}

async function fetchMatchStats(fixtureId){
  try{return await apiFootball.getFixtureStats(fixtureId)}
  catch(e){console.warn('Stats fetch failed for',fixtureId,':',e.message)}
  return null;
}

async function fetchMatchEvents(fixtureId){
  try{return await apiFootball.getFixtureEvents(fixtureId)}
  catch(e){console.warn('Events fetch failed for',fixtureId,':',e.message)}
  return [];
}

async function fetchTeamInjuries(){
  try{return await apiFootball.getInjuries()}
  catch(e){console.warn('Injuries fetch failed:',e.message)}
  return {};
}

async function main(){
  console.log('=== WC Data Refresh '+today+' ===');
  let html;
  try{html=readIndex()}catch(e){console.error('Cannot read index.html');process.exit(1)}
  const liveData=getExistingLiveData(html);
  const injuries=await fetchTeamInjuries();

  // build injury text per team
  const injuryText={};
  for(const t of TEAM_NAMES){
    const list=injuries[t]||[];
    if(list.length){
      const active=list.filter(i=>i.status!=='Recovered'&&i.status!=='Unknown');
      if(active.length){
        injuryText[t]=active.map(i=>i.player+' ('+i.type+')').join('; ');
      }
    }
  }

  // Step 1: fetch today's matches
  const matches=await fetchTodayMatches();
  console.log('Matches found:',matches.length);

  // Step 2: process each match
  for(const m of matches){
    if(m.homeGoals===null||m.awayGoals===null)continue;

    const h=m.home,a=m.away;
    for(const t of[h,a]){
      if(!liveData[t])continue;
      const d=liveData[t];
      const gf=t===h?m.homeGoals:m.awayGoals;
      const ga=t===h?m.awayGoals:m.homeGoals;
      d.wcGs+=gf;d.wcGc+=ga;d.wcMatches++;
      d.wcWr=d.wcMatches>0?((d.wcForm.split('-').filter(x=>x==='W').length)/d.wcMatches):0;

      // clean sheet
      if(ga===0)d.wcCleanSheets++;

      // AH cover estimate: +0.5 line covers if team wins
      const margin=gf-ga;
      if(margin>0)d.wcAh=((d.wcAh*(d.wcMatches-1))+(margin>0?1:0))/d.wcMatches;

      // form string
      const cur=d.wcForm?d.wcForm.split('-'):[];
      const result=gf>ga?'W':gf<ga?'L':'D';
      cur.push(result);
      if(cur.length>10)cur.shift();
      d.wcForm=cur.join('-');
    }
  }

  // Step 3: fetch detailed stats for each match (from API-Football)
  for(const m of matches){
    if(!m.id)continue;
    const stats=await fetchMatchStats(m.id);
    if(!stats)continue;

    const h=m.home,a=m.away;
    // determine which stats side is home/away by checking team name
    const homeStats=stats.home,awayStats=stats.away;

    for(const t of[h,a]){
      if(!liveData[t])continue;
      const d=liveData[t];
      const st=t===h?homeStats:awayStats;
      if(!st||!Object.keys(st).length)continue;
      d.wcShots+=st.totalShots||0;
      d.wcShotsConceded+=t===h?(awayStats.totalShots||0):(homeStats.totalShots||0);
      d.wcGkSaves+=st.goalkeeperSaves||0;
      d.wcFouls+=st.fouls||0;
      d.wcOffsides+=st.offsides||0;
      d.wcPossession=d.wcMatches>0?((d.wcPossession*(d.wcMatches-1)+(st.possession||0))/d.wcMatches):(st.possession||0);
      d.wcCards+=st.yellowCards||0;
      if(st.redCards)d.wcReds+=st.redCards;
    }

    // events for penalties and late goals
    try{
      const events=await fetchMatchEvents(m.id);
      for(const t of[h,a]){
        if(!liveData[t])continue;
        const d=liveData[t];
        const teamEvents=events.filter(e=>e.team.toLowerCase()===toApiFootball(t).toLowerCase());
        const pens=teamEvents.filter(e=>e.type==='Penalty'||e.detail==='Penalty goal');
        d.wcPensAwarded+=pens.length;
        const lateG=teamEvents.filter(e=>e.type==='Goal'&&e.time>=75);
        d.wcLateGoals+=lateG.length;
      }
    }catch(e){/* events are non-critical */}
  }

  // Step 4: fetch H2H from Sofascore for each team pair
  for(const t of TEAM_NAMES){
    if(!liveData[t])continue;
    const d=liveData[t];
    if(!d.wcH2h)d.wcH2h={};
  }

  // Step 5: update injury text (we store it as a separate constant)
  // Add INJURY_LIVE to HTML if we got data
  let htmlOut=html;
  const injKeys=Object.keys(injuryText);
  if(injKeys.length){
    const injJs='const INJURY_LIVE = '+JSON.stringify(injuryText,null,1)+';';
    htmlOut=htmlOut.replace(/const INJURY_LIVE = \{[\s\S]*?\};/g,'');
    htmlOut=htmlOut.replace(/const TEAM_DATA = \{/,injJs+'\n\nconst TEAM_DATA = {');
  }

  // Step 6: write updated data
  try{
    setLiveData(liveData);
    console.log('Data refresh complete. Version:',getVersion(readIndex()));
  }catch(e){
    console.error('Write failed:',e.message);
    process.exit(1)
  }
}

main().catch(e=>{console.error('Fatal:',e);process.exit(1)});