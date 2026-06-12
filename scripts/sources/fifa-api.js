const BASE = 'https://api.fifa.com/api/v3';
const COMP = 17;   // FIFA World Cup
const SEASON = 285023;  // 2026

const NAME_MAP = {
  "Korea Republic":"South Korea","Czechia":"Czech Republic","Türkiye":"Turkey",
  "Côte d'Ivoire":"Ivory Coast","Cabo Verde":"Cape Verde","Congo DR":"DR Congo",
  "IR Iran":"Iran","Curaçao":"Curacao","Bosnia and Herzegovina":"Bosnia and Herzegovina",
  "Korea DPR":"South Korea"
};
const NAME_REVERSE = {};
for(const[k,v] of Object.entries(NAME_MAP)) NAME_REVERSE[v]=k;

export function toOurName(n){return NAME_MAP[n]||n}
export function toFifaName(n){return NAME_REVERSE[n]||n}

export async function getAllMatches(){
  const r=await fetch(BASE+'/calendar/matches?idcompetition='+COMP+'&idseason='+SEASON+'&count=200');
  if(!r.ok)throw new Error('FIFA '+r.status);
  const data=await r.json();
  const out=[];
  for(const m of(data.Results||[])){
    const ht=m.Home?.TeamName?.[0]?.Description||'';
    const at=m.Away?.TeamName?.[0]?.Description||'';
    const home=toOurName(ht),away=toOurName(at);
    out.push({
      id:String(m.IdMatch||''),
      date:m.Date||'',
      localDate:m.LocalDate||'',
      home,away,
      homeScore:m.HomeTeamScore,
      awayScore:m.AwayTeamScore,
      status:m.MatchStatus,  // 0=finished, 1=scheduled
      stage:m.StageName?.[0]?.Description||'',
      group:m.GroupName?.[0]?.Description||'',
      stadium:m.Stadium?.Name?.[0]?.Description||'',
      city:m.Stadium?.CityName?.[0]?.Description||'',
      attendance:m.Attendance||0,
      possessionHome:m.BallPossession?.OverallHome,
      possessionAway:m.BallPossession?.OverallAway,
      tacticsHome:m.Home?.Tactics||'',
      tacticsAway:m.Away?.Tactics||'',
      winner:m.Winner||null
    });
  }
  return out;
}

export async function getMatchStats(matchId){
  try{
    const r=await fetch(BASE+'/statistics/match/'+matchId);
    if(!r.ok)return null;
    return await r.json();
  }catch{return null}
}