const BASE='https://api.football-data.org/v4';
let KEY=null;

export function init(key){KEY=key}

async function fetchJSON(url){
  const r=await fetch(url,{headers:{'X-Auth-Token':KEY}});
  if(!r.ok)throw new Error('FD '+r.status+': '+url);
  return r.json();
}

export async function getMatches(dateFrom,dateTo){
  const data=await fetchJSON(BASE+'/matches?dateFrom='+dateFrom+'&dateTo='+dateTo+'&competitions=2000');
  const out=[];
  for(const m of data?.matches||[]){
    const home=m.homeTeam?.name||'',away=m.awayTeam?.name||'';
    out.push({
      date:m.utcDate,
      home,away,
      homeScore:m.score?.fullTime?.home,
      awayScore:m.score?.fullTime?.away,
      status:m.status,
      competition:m.competition?.name||''
    });
  }
  return out;
}