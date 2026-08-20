const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentCompletionTab.tsx', 'utf8');

code = code.replace(/<span className="font-bold">\{topBatter \? \\`\\\$\{topBatter\.name\} \(\\\$\{topBatter\.runs\} runs\)\\` : 'N\/A'\}<\/span>/, "<span className=\"font-bold\">{topBatter ? `${topBatter.name} (${topBatter.runs} runs)` : 'N/A'}</span>");
code = code.replace(/<span className="font-bold">\{topBowler \? \\`\\\$\{topBowler\.name\} \(\\\$\{topBowler\.wickets\} wkts\)\\` : 'N\/A'\}<\/span>/, "<span className=\"font-bold\">{topBowler ? `${topBowler.name} (${topBowler.wickets} wkts)` : 'N/A'}</span>");
code = code.replace(/<span className="font-bold">\{topFielder \? \\`\\\$\{topFielder\.name\} \(\\\$\{topFielder\.dismissals\} dismissals\)\\` : 'N\/A'\}<\/span>/, "<span className=\"font-bold\">{topFielder ? `${topFielder.name} (${topFielder.dismissals} dismissals)` : 'N/A'}</span>");

fs.writeFileSync('src/pages/tournaments/TournamentCompletionTab.tsx', code);
