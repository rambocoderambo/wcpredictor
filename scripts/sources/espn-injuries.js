const URL = 'https://www.espn.com/soccer/story/_/id/48572979/2026-fifa-world-cup-injuries-tracker-which-stars-miss-latest-info';

const TEAMS = ["Germany","Netherlands","Brazil","France","Spain","England","Argentina","Japan",
  "United States","Canada","Uruguay","Australia","Ghana","Morocco","Scotland","Türkiye","Turkey",
  "Algeria","Croatia","Portugal","Belgium","Cape Verde","Italy"];

export async function getInjuries(){
  try{
    const r=await fetch(URL);
    const html=await r.text();
    const injuries={};
    let category='OUT';

    // Split into sections by <h2>
    const sections=html.split(/<h2>/);
    for(const sec of sections){
      if(sec.startsWith('Out')) category='OUT';
      else if(sec.startsWith('Concerning')) category='DOUBT';
      else if(sec.startsWith('Should play')) category='LIKELY';

      // Find h3 blocks (each contains one player entry)
      const h3Blocks=sec.split(/<h3/);
      for(const block of h3Blocks){
        if(block.indexOf('</h3>')<0)continue;
        const h3Content=block.substring(0,block.indexOf('</h3>'));

        // Extract player name: find text after last > in the h3
        const parts=h3Content.split(/<[^>]*>/g).map(p=>p.trim()).filter(Boolean);
        const playerParts=parts.filter(p=>p.length>1&&!p.startsWith('http')&&!p.startsWith('data:'));
        if(!playerParts.length)continue;

        // Player name is usually the second-to-last or last meaningful text
        const player=playerParts[playerParts.length-1]?.replace(/,.*$/,'').trim();
        if(!player||player.length<2)continue;

        // Find team name: look for known teams in the h3 content
        let team='';
        for(const t of TEAMS){
          if(h3Content.includes(t)||h3Content.includes(t.toLowerCase())){
            team=t;break;
          }
        }
        if(!team)continue;

        // Get injury type from following text
        const afterBlock=block.substring(block.indexOf('</h3>'));
        const injM=afterBlock.match(/Injury:\s*([^<.]+)/i);
        const injury=injM?injM[1].trim():'Unknown';

        if(!injuries[team])injuries[team]=[];
        injuries[team].push({player,injury,status:category});
      }
    }
    return injuries;
  }catch(e){
    console.warn('ESPN injuries scrape failed:',e.message);
    return {};
  }
}