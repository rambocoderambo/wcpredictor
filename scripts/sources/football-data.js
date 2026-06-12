import {TEAM_NAMES} from '../team-mapping.js';

const BASE='https://api.football-data.org/v4';
let KEY=null;

export function init(key){KEY=key}

async function fetchJSON(url){
  const r=await fetch(url,{headers:{'X-Auth-Token':KEY}});
  if(!r.ok)throw new Error(`FD ${r.status}: ${url}`);
  return r.json();
}

export async function getMatches(dateFrom,dateTo){
  const data=await fetchJSON(BASE+'/matches?dateFrom='+dateFrom+'&dateTo='+dateTo+'&competitions=2000');
  const out=[];
  for(const m of data?.matches||[]){
    const home=m.homeTeam?.name||'',away=m.awayTeam?.name||'';
    if(!TEAM_NAMES.includes(home)&&!TEAM_NAMES.includes(away))continue;
    out.push({
      date:m.utcDate,
      home,away,
      homeScore:m.score?.fullTime?.home,
      awayScore:m.score?.fullTime?.away,
      status:m.status,
      stage:m.stage||'',
      group:m.group||''
    });
  }
  return out;
}