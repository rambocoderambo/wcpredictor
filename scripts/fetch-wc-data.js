import {readFileSync,writeFileSync} from 'fs';
import {getAllMatches,toOurName} from './sources/fifa-api.js';
import * as footballData from './sources/football-data.js';
import {getAvailableMatches as lsGetMatches,getMatchStats,getMatchIncidents,getMatchH2h,getGroupStandings,extractLiveStats,toOurName as lsToOurName} from './sources/livescore.js';
import {TEAM_NAMES} from './team-mapping.js';

const PATH=process.argv[2]||'index.html';

function readHtml(){return readFileSync(PATH,'utf-8')}
function writeHtml(c){writeFileSync(PATH,c,'utf-8')}

function emptyData(){return{
  wcForm:'',wcGs:0,wcGc:0,wcWr:0,wcAh:0,wcMatches:0,
  wcCards:0,wcReds:0,wcPossession:0,wcShots:0,
  wcShotsConceded:0,wcGkSaves:0,wcFouls:0,wcOffsides:0,
  wcPensAwarded:0,wcLateGoals:0,wcCleanSheets:0,
  wcRestDays:0,wcH2h:null,wcFormation:0,
  wcShotsOnTarget:0,wcShotsOffTarget:0,wcBlockedShots:0,
  wcCorners:0,wcYellowCards:0,wcRedCards:0,
  wcShotsConcededTarget:0,wcShotsConcededOffTarget:0,
  wcFirstHalfGoals:0,wcSecondHalfGoals:0,wcLateGoals:0
}}

function emptyDataObj(){const o={};for(const t of TEAM_NAMES)o[t]=emptyData();return o}

function parseLiveData(html){
  const m=html.match(/const LIVE_DATA = (\{[\s\S]*?\});/);
  if(!m)return emptyDataObj();
  try{
    const clean=m[1].replace(/(\w+):/g,'"$1":');
    const parsed=JSON.parse(clean);
    for(const t of TEAM_NAMES){if(!parsed[t])parsed[t]=emptyData()}
    return parsed;
  }catch{return emptyDataObj()}
}

function buildLiveDataJs(liveData){
  const teams=Object.keys(liveData).sort();
  const lines=teams.map(t=>{
    const d=liveData[t];
    return `  "${t}":{wcForm:"${d.wcForm||''}",wcGs:${d.wcGs??0},wcGc:${d.wcGc??0},wcWr:${d.wcWr??0},wcAh:${d.wcAh??0},wcMatches:${d.wcMatches??0},wcCards:${d.wcCards??0},wcReds:${d.wcReds??0},wcPossession:${d.wcPossession??0},wcShots:${d.wcShots??0},wcShotsConceded:${d.wcShotsConceded??0},wcGkSaves:${d.wcGkSaves??0},wcFouls:${d.wcFouls??0},wcOffsides:${d.wcOffsides??0},wcPensAwarded:${d.wcPensAwarded??0},wcLateGoals:${d.wcLateGoals??0},wcCleanSheets:${d.wcCleanSheets??0},wcRestDays:${d.wcRestDays??0},wcH2h:${JSON.stringify(d.wcH2h)||'null'},wcFormation:${d.wcFormation??0},wcShotsOnTarget:${d.wcShotsOnTarget??0},wcShotsOffTarget:${d.wcShotsOffTarget??0},wcBlockedShots:${d.wcBlockedShots??0},wcCorners:${d.wcCorners??0},wcYellowCards:${d.wcYellowCards??0},wcRedCards:${d.wcRedCards??0},wcShotsConcededTarget:${d.wcShotsConcededTarget??0},wcShotsConcededOffTarget:${d.wcShotsConcededOffTarget??0},wcFirstHalfGoals:${d.wcFirstHalfGoals??0},wcSecondHalfGoals:${d.wcSecondHalfGoals??0},wcLateGoals:${d.wcLateGoals??0}}`;
  });
  return 'const LIVE_DATA = {\n'+lines.join(',\n')+'\n};';
}

async function main(){
  console.log('=== Rambo Action Sync ===');
  let html;
  try{html=readHtml()}catch(e){console.error('Cannot read index.html');process.exit(1)}
  const liveData=parseLiveData(html);

  // Init Football-data.org fallback with env key
  const fdKey=process.env.FOOTBALL_DATA_KEY;
  if(fdKey)footballData.init(fdKey);

  // Fetch all 104 WC 2026 matches from FIFA API (primary)
  let matches;
  try{
    matches=await getAllMatches();
    console.log('FIFA API: '+matches.length+' matches loaded');
  }catch(e){
    console.warn('FIFA API failed:',e.message);
    matches=[];
    // Fallback: try Football-data.org for today's matches
    if(fdKey){
      try{
        const today=new Date().toISOString().slice(0,10);
        const yesterday=new Date(Date.now()-864e5).toISOString().slice(0,10);
        const fdMatches=await footballData.getMatches(yesterday,today);
        console.log('Football-data.org fallback: '+fdMatches.length+' matches');
        matches=fdMatches.map(m=>({
          id:m.date,date:m.date,
          home:toOurName(m.home)||m.home,
          away:toOurName(m.away)||m.away,
          homeScore:m.homeScore,awayScore:m.awayScore,
          status:m.homeScore!==null?0:1,
          stage:'',group:'',stadium:'',city:'',
          attendance:0,possessionHome:null,possessionAway:null,
          tacticsHome:'',tacticsAway:'',winner:null
        }));
      }catch(fde){console.warn('Football-data.org also failed:',fde.message)}
    }
    if(!matches.length){console.log('No data update this run');process.exit(1)}
  }

  // Parse already-processed match IDs
  let processed={};
  const pm=html.match(/const WC_PROCESSED = (\{[\s\S]*?\});/);
  if(pm)try{
    const raw=pm[1].replace(/(\w+):/g,'"$1":').replace(/;$/,'');
    processed=JSON.parse(raw);
  }catch{}

  // Filter to only new finished matches
  const finished=matches.filter(m=>m.status===0&&m.homeScore!==null&&m.awayScore!==null&&!processed[m.id]);
  console.log('New finished matches: '+finished.length+' / '+matches.filter(m=>m.status===0&&m.homeScore!==null&&m.awayScore!==null).length+' total finished');

  for(const m of finished){
    const h=toOurName(m.home),a=toOurName(m.away);
    if(!TEAM_NAMES.includes(h)||!TEAM_NAMES.includes(a))continue;

    for(const team of[h,a]){
      if(!liveData[team])continue;
      const d=liveData[team];
      const gf=team===h?m.homeScore:m.awayScore;
      const ga=team===h?m.awayScore:m.homeScore;
      d.wcGs+=gf;d.wcGc+=ga;d.wcMatches++;

      // Clean sheet
      if(ga===0)d.wcCleanSheets++;

      // AH cover: team wins by 1+ for -0.5 line
      if(gf-ga>0)d.wcAh=((d.wcAh*(d.wcMatches-1))+1)/d.wcMatches;
      else d.wcAh=((d.wcAh*(d.wcMatches-1))+0)/d.wcMatches;

      // Form string (last 10)
      const cur=d.wcForm?d.wcForm.split('-'):[];
      cur.push(gf>ga?'W':gf<ga?'L':'D');
      if(cur.length>10)cur.shift();
      d.wcForm=cur.join('-');
      d.wcWr=d.wcForm?cur.filter(x=>x==='W').length/cur.length:0;

      // Possession from FIFA API (guard against NaN)
      if(team===h&&m.possessionHome!==null&&!isNaN(m.possessionHome)){
        d.wcPossession=d.wcMatches>0?((d.wcPossession*(d.wcMatches-1)+m.possessionHome)/d.wcMatches):m.possessionHome;
      }else if(team===a&&m.possessionAway!==null&&!isNaN(m.possessionAway)){
        d.wcPossession=d.wcMatches>0?((d.wcPossession*(d.wcMatches-1)+m.possessionAway)/d.wcMatches):m.possessionAway;
      }

      // Formation stability (tactics)
      const tactics=team===h?m.tacticsHome:m.tacticsAway;
      if(tactics){
        const curForm=d.wcFormation||0;
        d.wcFormation=curForm+1;  // count matches with formation data
      }
    }
  }

  // Scrape detailed stats from LiveScore for finished matches
  console.log('Checking LiveScore for match stats...');
  try{
    const lsMatches=await lsGetMatches();
    const lsProcessed={};
    const lsMatch=html.match(/const LS_PROCESSED = (\{[\s\S]*?\});/);
    if(lsMatch)try{Object.assign(lsProcessed,JSON.parse(lsMatch[1].replace(/(\w+):/g,'"$1":').replace(/;$/,'')))}catch{}

    let lsNew=0;
    for(const lm of lsMatches){
      if(lm.status!=='PAST'||lsProcessed[lm.eventId])continue;
      const home=lsToOurName(lm.homeName)||lm.homeName;
      const away=lsToOurName(lm.awayName)||lm.awayName;
      if(!TEAM_NAMES.includes(home)||!TEAM_NAMES.includes(away))continue;

      const stats=await getMatchStats(lm.eventId,lm.homeName,lm.awayName);
      if(!stats)continue;

      lsNew++;
      lsProcessed[lm.eventId]=true;

      for(const team of[home,away]){
        if(!liveData[team])continue;
        const d=liveData[team];
        const isHome=team===home;
        if(stats.shotsOnTarget)d.wcShotsOnTarget+=isHome?stats.shotsOnTarget.home:stats.shotsOnTarget.away;
        if(stats.shotsOffTarget)d.wcShotsOffTarget+=isHome?stats.shotsOffTarget.home:stats.shotsOffTarget.away;
        if(stats.blockedShots)d.wcBlockedShots+=isHome?stats.blockedShots.home:stats.blockedShots.away;
        if(stats.cornerKicks)d.wcCorners+=isHome?stats.cornerKicks.home:stats.cornerKicks.away;
        if(stats.fouls)d.wcFouls+=isHome?stats.fouls.home:stats.fouls.away;
        if(stats.offsides)d.wcOffsides+=isHome?stats.offsides.home:stats.offsides.away;
        if(stats.yellowCards)d.wcYellowCards+=isHome?stats.yellowCards.home:stats.yellowCards.away;
        if(stats.redCards)d.wcRedCards+=isHome?stats.redCards.home:stats.redCards.away;
        if(stats.goalkeeperSaves)d.wcGkSaves+=isHome?stats.goalkeeperSaves.home:stats.goalkeeperSaves.away;
        if(stats.shotsOnTarget)d.wcShotsConcededTarget+=isHome?stats.shotsOnTarget.away:stats.shotsOnTarget.home;
        if(stats.shotsOffTarget)d.wcShotsConcededOffTarget+=isHome?stats.shotsOffTarget.away:stats.shotsOffTarget.home;
        if(stats.possession){
          const pct=isHome?stats.possession.home:stats.possession.away;
          if(pct>0&&!isNaN(pct)){
            d.wcPossession=d.wcMatches>0?((d.wcPossession*(d.wcMatches-1)+pct)/d.wcMatches):pct;
          }
        }
      }

      // Fetch goal incidents (timestamps, late goals, half splits)
      const incidents=await getMatchIncidents(lm.eventId,lm.homeName,lm.awayName);
      if(incidents){
        for(const team of[home,away]){
          if(!liveData[team])continue;
          const d=liveData[team];
          const isHome=team===home;
          const side=isHome?'home':'away';
          d.wcFirstHalfGoals+=incidents.firstHalfGoals[side];
          d.wcSecondHalfGoals+=incidents.secondHalfGoals[side];
          d.wcLateGoals+=incidents.lateGoals[side];
        }
      }

      // Fetch H2H data (past meetings between these teams)
      const h2hData=await getMatchH2h(lm.eventId,lm.homeName,lm.awayName);
      if(h2hData?.h2h){
        for(const team of[home,away]){
          if(!liveData[team])continue;
          const d=liveData[team];
          // Store H2H record against this specific opponent
          const opp=team===home?away:home;
          if(!d.wcH2h)d.wcH2h={};
          if(!d.wcH2h[opp])d.wcH2h[opp]=h2hData.h2h;
        }
      }
    }
    const lsStr=JSON.stringify(lsProcessed);
    html=html.replace(/const LS_PROCESSED = \{[\s\S]*?\};/,'const LS_PROCESSED = '+lsStr+';')||
      (html=html.replace('const WC_PROCESSED','const LS_PROCESSED = {};\nconst WC_PROCESSED'));
    if(lsNew>0)console.log('LiveScore: '+lsNew+' matches with detailed stats');
    else console.log('LiveScore: no new matches');
  }catch(e){
    console.warn('LiveScore scrape failed:',e.message);
  }

  // Fetch group standings
  try{
    const standings=await getGroupStandings();
    if(Object.keys(standings).length){
      const standStr=JSON.stringify(standings,null,1);
      html=html.replace(/const STANDINGS = \{[\s\S]*?\};/,'const STANDINGS = '+standStr+';')||
        (html=html.replace('const VERSION','const STANDINGS = {};\nconst VERSION'));
    }
  }catch(e){console.warn('Standings fetch failed:',e.message)}

  // Write updated LIVE_DATA
  const newBlock=buildLiveDataJs(liveData);
  html=html.replace(/const LIVE_DATA = \{[\s\S]*?\};/,newBlock);

  // Track processed match IDs
  const hadNew=finished.length>0;
  for(const m of finished)processed[m.id]=true;
  const procStr=JSON.stringify(processed);
  html=html.replace(/const WC_PROCESSED = \{[\s\S]*?\};/,'const WC_PROCESSED = '+procStr+';');

  // Bump version only when new matches processed
  const vMatch=html.match(/const VERSION = "([\d.]+)"/);
  let verStr=vMatch?vMatch[1]:'1.01';
  if(hadNew&&vMatch){
    const raw=parseFloat(vMatch[1]);
    const next=(raw+0.01).toFixed(2);
    html=html.replace(/const VERSION = "[\d.]+"/,'const VERSION = "'+next+'"');
    html=html.replace(
      /<strong>v[\d.]+<\/strong> — /,
      '<strong>v'+next+'</strong> — '
    );
    // Add version history entry
    const today=new Date().toLocaleString('en-US',{month:'short',day:'numeric',timeZone:'Asia/Singapore'});
    const statsMsg='Live match data: '+(finished.length*2)+' team-matches processed';
    const histRe=/(const VERSION_HISTORY = \[[\s\S]*?\]);/;
    if(histRe.test(html)){
      html=html.replace(histRe,'$1,{v:"'+next+'",date:"'+today+'",msg:"'+statsMsg+'"}');
    }
    verStr=next;
  }

  // Update LAST_SYNC
  const now=new Date().toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Singapore'});
  html=html.replace(/const LAST_SYNC = "[^"]*"/,'const LAST_SYNC = "'+now+'"');

  writeHtml(html);
  console.log('Sync complete. Version: '+verStr+', LAST_SYNC: '+now);
  if(hadNew)console.log('Stats accumulated: '+(finished.length*2)+' team-matches processed');
  else console.log('No new matches to process');
}

main().catch(e=>{console.error('Fatal:',e);process.exit(1)});