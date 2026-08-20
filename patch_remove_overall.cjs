const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/PointsTableTab.tsx', 'utf8');

code = code.replace(
  /<h3 className="font-bold text-sm text-foreground-muted uppercase tracking-wider mb-2 mt-8">Overall Standings<\/h3>\n\s*\{renderTable\(teams\)\}/,
  ''
);

fs.writeFileSync('src/pages/tournaments/PointsTableTab.tsx', code);
