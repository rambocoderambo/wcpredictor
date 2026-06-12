export const TEAM_NAMES = [
  "Argentina","Austria","Algeria","Jordan","Australia","Bosnia and Herzegovina",
  "Belgium","Egypt","Iran","New Zealand","Brazil","Morocco","Scotland","Haiti",
  "Croatia","England","Ghana","Panama","Canada","Turkey","Paraguay","Qatar",
  "Colombia","Portugal","DR Congo","Uzbekistan","Cape Verde","Czech Republic",
  "Curacao","Ecuador","France","Iraq","Norway","Senegal","Germany","Ivory Coast",
  "Netherlands","Japan","Sweden","Tunisia","Mexico","South Korea","South Africa",
  "Spain","Uruguay","Saudi Arabia","Switzerland","United States"
];

export const API_FOOTBALL_NAMES = {
  "United States":"USA","South Korea":"Korea Republic","Ivory Coast":"Cote d'Ivoire",
  "DR Congo":"Congo DR","Cape Verde":"Cape Verde Islands","Curacao":"Curacao",
  "Bosnia and Herzegovina":"Bosnia & Herzegovina","Czech Republic":"Czechia"
};
export const API_FOOTBALL_REVERSE = {};
for(const[k,v] of Object.entries(API_FOOTBALL_NAMES)) API_FOOTBALL_REVERSE[v]=k;

export function toApiFootball(name){return API_FOOTBALL_NAMES[name]||name}
export function fromApiFootball(name){return API_FOOTBALL_REVERSE[name]||name}

export const SOFASCORE_NAMES = {
  "United States":"USA","South Korea":"Korea Republic","Ivory Coast":"Cote d'Ivoire",
  "DR Congo":"Congo DR","Cape Verde":"Cape Verde","Czech Republic":"Czechia",
  "Curacao":"Curacao","Bosnia and Herzegovina":"Bosnia & Herzegovina",
  "Saudi Arabia":"Saudi Arabia","South Africa":"South Africa"
};
export const SOFASCORE_REVERSE = {};
for(const[k,v] of Object.entries(SOFASCORE_NAMES)) SOFASCORE_REVERSE[v]=k;

export function toSofascore(name){return SOFASCORE_NAMES[name]||name}
export function fromSofascore(name){return SOFASCORE_REVERSE[name]||name}