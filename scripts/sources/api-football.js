import {toApiFootball,fromApiFootball,TEAM_NAMES} from '../team-mapping.js';
const BASE='https://api-football-v1.p.rapidapi.com/v3';
const HEADERS={};

export function init(key){
  HEADERS['x-rapidapi-key']=key;
  HEADERS['x-rapidapi-host']='api-football-v1.p.rapidapi.com';
}

async function fetchJSON(url){
  const r=await fetch(url,{headers:HEADERS});
  if(!r.ok)throw new Error(`AF ${r.status}: ${url}`);
  const d=await r.json();
  if(d.errors&&Object.keys(d.errors).length)throw new Error('AF errors: '+JSON.stringify(d.errors));
  return d.response;
}

let _leagueId=null;
async function getWcLeagueId(){
  if(_leagueId)return _leagueId;
  const list=await fetchJSON(BASE+'/leagues?name=World+ Cup+2026');
  for(const item of list||[]){
    const s=item.seasons||[];
    if(s.some(x=>x.year===2026)){_leagueId=item.league.id;return _leagueId}
  }
  // fallback: search all leagues for WC 2026
  const all=await fetchJSON(BASE+'/leagues?season=2026&type=Cup');
  for(const item of all||[]){
    if(item.league.name&&item.league.name.includes('World Cup')){
      _leagueId=item.league.id;return _leagueId
    }
  }
  throw new Error('WC 2026 league not found');
}

export async function getFixtures(date){
  const leagueId=await getWcLeagueId();
  const url=BASE+'/fixtures?league='+leagueId+'&season=2026&date='+date;
  const data=await fetchJSON(url);
  const out=[];
  for(const f of data||[]){
    const ht=f.teams.home.name,at=f.teams.away.name;
    const home=fromApiFootball(ht)||ht;
    const away=fromApiFootball(at)||at;
    if(!TEAM_NAMES.includes(home)||!TEAM_NAMES.includes(away))continue;
    out.push({
      id:f.fixture.id,
      date:f.fixture.date,
      status:f.fixture.status.short,
      home,away,
      homeGoals:f.goals.home,
      awayGoals:f.goals.away,
      venue:f.fixture.venue.name||'',
      city:f.fixture.venue.city||'',
      elapsed:f.fixture.status.elapsed||0
    });
  }
  return out;
}

export async function getFixtureStats(fixtureId){
  const data=await fetchJSON(BASE+'/fixtures/statistics?fixture='+fixtureId);
  const out={home:{},away:{}};
  for(const team of data||[]){
    const side=team.team.name;
    const stats=team.statistics||[];
    const map={};
    for(const s of stats){
      const v=s.value;
      map[s.type]=v===null?0:typeof v==='string'?v:v;
    }
    const key=out.home&&Object.keys(out.home).length===0?'home':'away';
    out[key]={
      shotsOnGoal:parseFloat(map['Shots on Goal']||0)||0,
      shotsOffGoal:parseFloat(map['Shots off Goal']||0)||0,
      totalShots:parseFloat(map['Total Shots']||0)||0,
      blockedShots:parseFloat(map['Blocked Shots']||0)||0,
      shotsInsideBox:parseFloat(map['Shots insidebox']||0)||0,
      shotsOutsideBox:parseFloat(map['Shots outsidebox']||0)||0,
      fouls:parseFloat(map['Fouls']||0)||0,
      corners:parseFloat(map['Corner Kicks']||0)||0,
      offsides:parseFloat(map['Offsides']||0)||0,
      possession:parseFloat((map['Ball Possession']||'0%').replace('%',''))||0,
      yellowCards:parseFloat(map['Yellow Cards']||0)||0,
      redCards:parseFloat(map['Red Cards']||0)||0,
      goalkeeperSaves:parseFloat(map['Goalkeeper Saves']||0)||0,
      totalPasses:parseFloat(map['Total passes']||0)||0,
      passesAccurate:parseFloat(map['Passes accurate']||0)||0,
      passesPct:parseFloat((map['Passes %']||'0%').replace('%',''))||0,
    };
  }
  return out;
}

export async function getFixtureEvents(fixtureId){
  const data=await fetchJSON(BASE+'/fixtures/events?fixture='+fixtureId);
  const events=[];
  for(const e of data||[]){
    events.push({
      time:e.time.elapsed||0,
      team:e.team.name,
      player:e.player.name||'',
      type:e.type,
      detail:e.detail,
      penalty:e.penalty?true:false
    });
  }
  return events;
}

export async function getInjuries(){
  const all=await fetchJSON(BASE+'/injuries?season=2026');
  const byTeam={};
  for(const item of all||[]){
    const rawName=item.player?.team?.name;
    if(!rawName)continue;
    const name=fromApiFootball(rawName)||rawName;
    if(!TEAM_NAMES.includes(name))continue;
    if(!byTeam[name])byTeam[name]=[];
    byTeam[name].push({
      player:item.player.name||'Unknown',
      type:item.injury?.type||'Unknown',
      severity:item.injury?.severity||'Unknown',
      status:item.injury?.status||'Unknown',
      startDate:item.injury?.start_date||'',
      returnDate:item.injury?.return_date||''
    });
  }
  return byTeam;
}

export async function searchTeamId(name){
  const data=await fetchJSON(BASE+'/teams?search='+encodeURIComponent(name));
  for(const item of data||[]){
    if(item.team.name.toLowerCase()===toApiFootball(name).toLowerCase())return item.team.id;
  }
  return null;
}