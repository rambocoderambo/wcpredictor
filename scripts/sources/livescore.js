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

export async function getGroupStandings(){
  try{
    const r=await fetch(BASE+'/');
    const html=await r.text();
    const data=getNextData(html);
    if(!data)return{};
    const league=data?.props?.pageProps?.initialData?.tables?.league;
    if(!league)return{};
    const standings={};
    for(const[,groupData] of Object.entries(league)){
      for(const table of(groupData||[])){
        for(const team of(table.teams||[])){
          standings[team.name]={
            rank:team.rank,played:team.played,points:team.points,
            wins:team.wins,draws:team.draws,losses:team.losses,
            goalsFor:team.goalsFor,goalsAgainst:team.goalsAgainst,goalsDiff:team.goalsDiff
          };
        }
      }
    }
    return standings;
  }catch{return{}}
}

function getNextData(html){
  const m=html.match(/__NEXT_DATA__"[^>]*>({.+?})<\/script>/);
  return m?JSON.parse(m[1]):null;
}

function parseMinute(str){
  if(!str)return 999;
  const m=str.match(/(\d+)/);
  return m?parseInt(m[1]):999;
}

export async function getMatchIncidents(eventId,homeName,awayName){
  const slugHome=homeName.toLowerCase().replace(/\s+/g,'-');
  const slugAway=awayName.toLowerCase().replace(/\s+/g,'-');
  const url=BASE+'/'+slugHome+'-vs-'+slugAway+'/'+eventId+'/';
  try{
    const r=await fetch(url);
    if(!r.ok)return null;
    const html=await r.text();
    const data=getNextData(html);
    if(!data)return null;
    const event=data?.props?.pageProps?.initialEventData?.event;
    if(!event?.incidents?.incs)return null;

    const goals={home:[],away:[]};
    const cards={home:{yellow:0,red:0},away:{yellow:0,red:0}};
    const totalShots={home:0,away:0};

    for(const[half,minutes] of Object.entries(event.incidents.incs)){
      for(const[min,entries] of Object.entries(minutes)){
        for(const entry of(Array.isArray(entries)?entries:[entries])){
          for(const side of['HOME','AWAY']){
            for(const e of(entry[side]||[])){
              const tSide=side==='HOME'?'home':'away';
              const minNum=parseMinute(e.time);
              if(e.type==='FootballGoal'){
                goals[tSide].push(minNum);
              }else if(e.type==='FootballYellowCard'){
                cards[tSide].yellow++;
              }else if(e.type==='FootballRedCard'){
                cards[tSide].red++;
              }
            }
          }
        }
      }
    }

    // scores by period
    const periods=event.scores?.scoresByPeriod||[];
    const htScore={home:parseInt(periods[0]?.home?.score)||0,away:parseInt(periods[0]?.away?.score)||0};
    const ftScore={home:parseInt(periods[1]?.home?.score)||0,away:parseInt(periods[1]?.away?.score)||0};

    return{
      goals,
      cards,
      htScore,
      ftScore,
      lateGoals:{home:goals.home.filter(m=>m>=75).length,away:goals.away.filter(m=>m>=75).length},
      firstHalfGoals:{home:goals.home.filter(m=>m<=45).length,away:goals.away.filter(m=>m<=45).length},
      secondHalfGoals:{home:goals.home.filter(m=>m>45&&m<=90).length,away:goals.away.filter(m=>m>45&&m<=90).length}
    };
  }catch{return null}
}

export async function getMatchH2h(eventId,homeName,awayName){
  const slugHome=homeName.toLowerCase().replace(/\s+/g,'-');
  const slugAway=awayName.toLowerCase().replace(/\s+/g,'-');
  const url=BASE+'/'+slugHome+'-vs-'+slugAway+'/'+eventId+'/h2h/';
  try{
    const r=await fetch(url);
    if(!r.ok)return null;
    const html=await r.text();
    const data=getNextData(html);
    if(!data)return null;
    const pp=data.props.pageProps;

    // Find H2H data (might be in headToHead, initialHeadToHeadData, or event.headToHead)
    let h2hData=pp.initialHeadToHeadData||pp.headToHead;
    if(!h2hData){
      const ed=pp.initialEventData?.event;
      if(ed?.headToHead)h2hData=ed.headToHead;
    }
    if(!h2hData)return null;

    // Parse H2H matches
    const histMatches=[];
    const groups=h2hData.h2h||[];
    for(const grp of groups){
      for(const ev of(grp.events||[])){
        if(ev.homeName&&ev.awayName){
          histMatches.push({
            home:ev.homeName,away:ev.awayName,
            homeScore:ev.homeScore!==''?parseInt(ev.homeScore):null,
            awayScore:ev.awayScore!==''?parseInt(ev.awayScore):null,
            winner:ev.winner||'',
            date:ev.startDateTimeString||''
          });
        }
      }
    }

    // Calculate H2H record
    const ourHome=homeName,ourAway=awayName;
    let wins=0,losses=0,draws=0;
    for(const me of histMatches){
      const isHome=me.home===ourHome;
      const ourScore=isHome?me.homeScore:me.awayScore;
      const oppScore=isHome?me.awayScore:me.homeScore;
      if(ourScore===null||oppScore===null)continue;
      if(ourScore>oppScore)wins++;
      else if(ourScore<oppScore)losses++;
      else draws++;
    }

    // Recent matches for each team (from home/away arrays)
    const recentHome=[],recentAway=[];
    for(const grp of(h2hData.home||[])){
      for(const ev of(grp.events||[])){
        if(ev.homeName&&ev.awayName&&ev.homeScore!==''&&ev.awayScore!==''){
          recentHome.push({opponent:ev.awayName,for:parseInt(ev.homeScore),against:parseInt(ev.awayScore),date:ev.startDateTimeString});
        }
      }
    }
    for(const grp of(h2hData.away||[])){
      for(const ev of(grp.events||[])){
        if(ev.homeName&&ev.awayName&&ev.homeScore!==''&&ev.awayScore!==''){
          recentAway.push({opponent:ev.homeName,for:parseInt(ev.awayScore),against:parseInt(ev.homeScore),date:ev.startDateTimeString});
        }
      }
    }

    return {
      h2h:{wins,losses,draws,total:wins+losses+draws},
      recentMatches:[...recentHome.slice(-10),...recentAway.slice(-10)]
    };
  }catch{return null}
}