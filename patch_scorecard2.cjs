const fs = require('fs');

function replaceNameRender(filePath) {
   let code = fs.readFileSync(filePath, 'utf8');
   code = code.replaceAll("{batter.id.replace('temp_', '').replace(/_/g, ' ')}", "{batter.name || batter.id.replace('temp_', '').replace(/_/g, ' ')}");
   code = code.replaceAll("{bowler.id.replace('temp_', '').replace(/_/g, ' ')}", "{bowler.name || bowler.id.replace('temp_', '').replace(/_/g, ' ')}");
   fs.writeFileSync(filePath, code);
}

replaceNameRender('src/pages/matches/tabs/ScorecardTab.tsx');

let code = fs.readFileSync('src/pages/matches/tabs/SummaryTab.tsx', 'utf8');
code = code.replaceAll("{b.id.replace('temp_', '').replace(/_/g, ' ')}", "{b.name || b.id.replace('temp_', '').replace(/_/g, ' ')}");
fs.writeFileSync('src/pages/matches/tabs/SummaryTab.tsx', code);

code = fs.readFileSync('src/pages/matches/scoring/LiveScoring.tsx', 'utf8');
code = code.replaceAll("{striker.id.replace('temp_', '').replace(/_/g, ' ')} *", "{striker.name || striker.id.replace('temp_', '').replace(/_/g, ' ')} *");
code = code.replaceAll("{nonStriker.id.replace('temp_', '').replace(/_/g, ' ')}", "{nonStriker.name || nonStriker.id.replace('temp_', '').replace(/_/g, ' ')}");
code = code.replaceAll("{bowler.id.replace('temp_', '').replace(/_/g, ' ')}", "{bowler.name || bowler.id.replace('temp_', '').replace(/_/g, ' ')}");
fs.writeFileSync('src/pages/matches/scoring/LiveScoring.tsx', code);

