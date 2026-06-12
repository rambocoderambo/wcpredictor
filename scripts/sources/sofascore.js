import {toSofascore,TEAM_NAMES} from '../team-mapping.js';

const BASE='https://sofascore.p.rapidapi.com';
let KEY=null;

export function init(key){KEY=key}

export function setFallbackKey(key){KEY=key}

async function fetchJSON(url,retries=2){
  for(let i=0;i<retries;i++){
    try{
      const r=await fetch(url,{headers:{
        'x-rapidapi-key':KEY,
        'x-rapidapi-host':'sofascore.p.rapidapi.com'
      }});
      if(r.ok)return await r.json();
      if(r.status===429)continue;
      throw new Error(`SS ${r.status}: ${url}`);
    }catch(e){
      if(i===retries-1)throw e;
      await new Promise(r=>setTimeout(r,1000));
    }
  }
  return null;
}

export async function getH2hEvents(team1,team2){
  const t1=toSofascore(team1),t2=toSofascore(team2);
  const data=await fetchJSON(BASE+'/matches/get-h2h-events?homeTeam='+encodeURIComponent(t1)+'&awayTeam='+encodeURIComponent(t2));
  const matches=[];
  for(const m of data||[]){
    matches.push({
      homeTeam:m.homeTeam?.name||'',
      awayTeam:m.awayTeam?.name||'',
      homeScore:m.homeScore||0,
      awayScore:m.awayScore||0,
      date:m.startDate||'',
      tournament:m.tournament?.name||''
    });
  }
  return matches;
}

export async function getTeamMatchStats(teamName){
  const name=toSofascore(teamName);
  const data=await fetchJSON(BASE+'/teams/get-last-match-stats?teamName='+encodeURIComponent(name));
  if(!data)return null;
  const out={
    possession:0,shotsOnTarget:0,totalShots:0,corners:0,
    fouls:0,yellowCards:0,redCards:0,offsides:0,
    goalkeeperSaves:0,formation:'',subsUsed:0,
    firstHalfGoals:0,secondHalfGoals:0,lateGoals:0
  };
  const stats=data.statistics||data;
  if(stats.possession)out.possession=parseFloat(stats.possession)||0;
  if(stats.shotsOnTarget)out.shotsOnTarget=parseFloat(stats.shotsOnTarget)||0;
  if(stats.totalShots)out.totalShots=parseFloat(stats.totalShots)||0;
  if(stats.corners)out.corners=parseFloat(stats.corners)||0;
  if(stats.fouls)out.fouls=parseFloat(stats.fouls)||0;
  if(stats.yellowCards)out.yellowCards=parseFloat(stats.yellowCards)||0;
  if(stats.redCards)out.redCards=parseFloat(stats.redCards)||0;
  if(stats.offsides)out.offsides=parseFloat(stats.offsides)||0;
  if(stats.goalkeeperSaves)out.goalkeeperSaves=parseFloat(stats.goalkeeperSaves)||0;
  if(stats.formation)out.formation=String(stats.formation);
  if(stats.subsUsed)out.subsUsed=parseFloat(stats.subsUsed)||0;
  return out;
}