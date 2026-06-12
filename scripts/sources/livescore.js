const BASE = 'https://www.livescore.com/en/football/international/world-cup-2026';

const NAME_MAP = {
  "Korea Republic":"South Korea","Czechia":"Czech Republic","Türkiye":"Turkey",
  "Côte d'Ivoire":"Ivory Coast","Cabo Verde":"Cape Verde","Congo DR":"DR Congo",
  "IR Iran":"Iran","Curaçao":"Curacao"
};

export function toOurName(n){return NAME_MAP[n]||n}

export async function getAvailableMatches(){
  const r=await fetch(BASE+'/');
  const html=await r.text();
  const m=html.match(/__NEXT_DATA__"[^>]*>({.+?})<\/script>/);
  if(!m)return [];
  const data=JSON.parse(m[1]);
  const sections=data?.props?.pageProps?.initialData?.sections||[];
  const out=[];
  for(const sec of sections){
    for(const ev of sec.events||[]){
      if(!ev.id)continue;
      out.push({
        eventId:ev.id,
        homeName:ev.homeTeamName||'',
        awayName:ev.awayTeamName||'',
        homeScore:ev.homeTeamScore!==''?parseInt(ev.homeTeamScore):null,
        awayScore:ev.awayTeamScore!==''?parseInt(ev.awayTeamScore):null,
        status:ev.eventStatus||'',
        stage:sec.subTitle||''
      });
    }
  }
  return out;
}

function extractStatFromHtml(html,statId){
  // Find the stat div: data-id="shotsOnTarget_mtc-dtl-stat"
  const re=new RegExp('data-id="'+statId+'"[\\s\\S]*?<span[^>]*>([\\d]+)<\\/span>[\\s\\S]*?<div[^>]*class="gg"[^>]*>[\\s\\S]*?<span[^>]*>([\\d]+)<\\/span>');
  const m=html.match(re);
  if(m) return {home:parseInt(m[1])||0,away:parseInt(m[2])||0};
  // Fallback: simpler pattern
  const re2=new RegExp('data-id="'+statId+'"[\\s\\S]*?<span[^>]*>([\\d]+)<\\/span>[\\s\\S]*?<span[^>]*>([\\d]+)<\\/span>');
  const m2=html.match(re2);
  if(m2) return {home:parseInt(m2[1])||0,away:parseInt(m2[2])||0};
  return null;
}

const STAT_IDS = [
  ['shotsOnTarget_mtc-dtl-stat','shotsOnTarget'],
  ['shotsOffTarget_mtc-dtl-stat','shotsOffTarget'],
  ['shotsBlocked_mtc-dtl-stat','blockedShots'],
  ['possession_mtc-dtl-stat','possession'],
  ['corners_mtc-dtl-stat','cornerKicks'],
  ['offsides_mtc-dtl-stat','offsides'],
  ['fouls_mtc-dtl-stat','fouls'],
  ['yellowCards_mtc-dtl-stat','yellowCards'],
  ['redCards_mtc-dtl-stat','redCards'],
  ['goalkeeperSaves_mtc-dtl-stat','goalkeeperSaves']
];

export async function getMatchStats(eventId,homeName,awayName){
  const slugHome=homeName.toLowerCase().replace(/\s+/g,'-');
  const slugAway=awayName.toLowerCase().replace(/\s+/g,'-');
  const url=BASE+'/'+slugHome+'-vs-'+slugAway+'/'+eventId+'/stats/';
  try{
    const r=await fetch(url);
    if(!r.ok)return null;
    const html=await r.text();
    const stats={};
    for(const[statId,key] of STAT_IDS){
      const v=extractStatFromHtml(html,statId);
      if(v) stats[key]=v;
    }
    return Object.keys(stats).length?stats:null;
  }catch{return null}
}

const STAT_MAP = {
  shotsOnTarget:'wcShotsOnTarget',
  shotsOffTarget:'wcShotsOffTarget',
  blockedShots:'wcBlockedShots',
  possession:'wcPossession',
  cornerKicks:'wcCorners',
  offsides:'wcOffsides',
  fouls:'wcFouls',
  yellowCards:'wcYellowCards',
  redCards:'wcRedCards',
  goalkeeperSaves:'wcGoalkeeperSaves'
};

export function extractLiveStats(rawStats){
  const out={};
  for(const[rawKey,ourKey] of Object.entries(STAT_MAP)){
    const s=rawStats[rawKey];
    if(s){
      out[ourKey+'_home']=s.home;
      out[ourKey+'_away']=s.away;
    }
  }
  return out;
}