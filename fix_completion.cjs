const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentCompletionTab.tsx', 'utf8');

code = code.replace(/\{topBatter \? `\$\{topBatter\.name\} \(\$\{topBatter\.runs\} runs\)` : 'N\/A'\}/, "{topBatter ? `${topBatter.name} (${topBatter.runs} runs)` : 'N/A'}");
code = code.replace(/\{topBowler \? `\$\{topBowler\.name\} \(\$\{topBowler\.wickets\} wkts\)` : 'N\/A'\}/, "{topBowler ? `${topBowler.name} (${topBowler.wickets} wkts)` : 'N/A'}");
code = code.replace(/\{topFielder \? `\$\{topFielder\.name\} \(\$\{topFielder\.dismissals\} dismissals\)` : 'N\/A'\}/, "{topFielder ? `${topFielder.name} (${topFielder.dismissals} dismissals)` : 'N/A'}");

fs.writeFileSync('src/pages/tournaments/TournamentCompletionTab.tsx', code);
