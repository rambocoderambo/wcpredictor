import {readFileSync,writeFileSync} from 'fs';

const PATH=process.argv[2]||'index.html';

export function readIndex(){
  return readFileSync(PATH,'utf-8');
}

export function writeIndex(content){
  writeFileSync(PATH,content,'utf-8');
}

export function getVersion(html){
  const m=html.match(/VERSION\s*=\s*['"]([\d.]+)['"]/);
  return m?m[1]:'1.00';
}

export function bumpVersion(html){
  const v=getVersion(html);
  const parts=v.split('.').map(Number);
  if(parts.length===2){
    parts[1]++;
    if(parts[1]>=100){parts[0]++;parts[1]=0}
    const next=parts[0]+'.'+String(parts[1]).padStart(2,'0');
    return html.replace(`VERSION = "${v}"`,`VERSION = "${next}"`);
  }
  return html.replace(`VERSION="${v}"`,`VERSION="${v}"`);
}

export function buildLiveDataJs(liveData){
  const teams=Object.keys(liveData).sort();
  const lines=teams.map(t=>{
    const d=liveData[t];
    return `  "${t}":{wcForm:"${d.wcForm||''}",wcGs:${d.wcGs??0},wcGc:${d.wcGc??0},wcWr:${d.wcWr??0},wcAh:${d.wcAh??0},wcMatches:${d.wcMatches??0},wcCards:${d.wcCards??0},wcReds:${d.wcReds??0},wcPossession:${d.wcPossession??0},wcShots:${d.wcShots??0},wcShotsConceded:${d.wcShotsConceded??0},wcGkSaves:${d.wcGkSaves??0},wcFouls:${d.wcFouls??0},wcOffsides:${d.wcOffsides??0},wcPensAwarded:${d.wcPensAwarded??0},wcLateGoals:${d.wcLateGoals??0},wcCleanSheets:${d.wcCleanSheets??0},wcRestDays:${d.wcRestDays??0},wcH2h:${JSON.stringify(d.wcH2h)||'null'},wcFormation:${d.wcFormation??0}}`;
  });
  return 'const LIVE_DATA = {\n'+lines.join(',\n')+'\n};';
}

export function updateLiveData(html,liveData){
  const newBlock=buildLiveDataJs(liveData);
  const oldMatch=html.match(/const LIVE_DATA = \{[\s\S]*?\};/);
  if(oldMatch){
    html=html.replace(oldMatch[0],newBlock);
  }else{
    html=html.replace('const TEAM_DATA = {',newBlock+'\n\nconst TEAM_DATA = {');
  }
  return html;
}

export function updateVersionFooter(html){
  const v=getVersion(html);
  const footer='<div style="margin-top:1.5rem;padding-top:.75rem;border-top:1px solid var(--border);font-size:.65rem;color:var(--muted);text-align:center">v'+v+' · Data refreshes 6:00/12:00 UTC · API-Football + Sofascore + Football-data.org</div>';
  const footerRe=/<div style="margin-top:1\.5rem;padding-top:\.75rem;border-top:1px solid var\(--border\);font-size:\.65rem;color:var\(--muted\);text-align:center">.*?<\/div>/;
  if(footerRe.test(html)){
    html=html.replace(footerRe,footer);
  }else{
    html=html.replace('</div>\n\n<script>',footer+'\n\n<script>');
  }
  return html;
}

export function setLiveData(liveData){
  let html=readIndex();
  html=bumpVersion(html);
  html=updateLiveData(html,liveData);
  html=updateVersionFooter(html);
  writeIndex(html);
  console.log('Updated LIVE_DATA, version '+getVersion(html));
}