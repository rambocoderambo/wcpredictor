const URL = 'https://www.espn.com/soccer/story/_/id/48572979/2026-fifa-world-cup-injuries-tracker-which-stars-miss-latest-info';

const TEAMS = ["Germany","Netherlands","Brazil","France","Spain","England","Argentina","Japan",
  "United States","Canada","Uruguay","Australia","Ghana","Morocco","Scotland","Türkiye","Turkey",
  "Algeria","Croatia","Portugal","Belgium","Cape Verde"];

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

        // Extract player name: look for <a> tag with player-guid (player link)
        let player='';
        const aMatch=h3Content.match(/<a[^>]*data-player-guid[^>]*>([^<]+)<\/a>/i);
        if(aMatch) player=aMatch[1].trim();
        if(!player){
          // Fallback: text before comma, excluding team logo alt text
          const textParts=h3Content.split(/<[^>]*>/g).map(p=>p.trim()).filter(p=>p.length>1);
          for(const p of textParts){
            const cleaned=p.replace(/,.*$/,'').trim();
            if(cleaned.length>2&&!TEAMS.includes(cleaned)){
              player=cleaned;break;
            }
          }
        }
        if(!player||player.length<2)continue;

        // Find team name: look for known teams
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