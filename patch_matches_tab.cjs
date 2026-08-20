const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', 'utf8');

// add Link import if it's not there
if (!code.includes("import { Link } from 'react-router-dom';")) {
  code = code.replace(/import { v4 as uuidv4 } from 'uuid';/, "import { v4 as uuidv4 } from 'uuid';\nimport { Link } from 'react-router-dom';");
}

const matchRenderReplace = `
                  <div className={\`text-xs font-bold px-2 py-1 rounded w-24 text-center \${match.status === 'LIVE' ? 'bg-error/10 text-error' : match.status === 'COMPLETED' ? 'bg-success/10 text-success' : 'bg-surface-hover text-foreground-muted'}\`}>
                    {match.status}
                  </div>
                  
                  <div className="flex gap-2 w-full justify-center sm:justify-end mt-2 sm:mt-0">
                    <Link to={\`/matches/\${match.id}\`} className="text-xs font-bold px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                      {match.status === 'COMPLETED' ? 'Scorecard' : 'Match Centre'}
                    </Link>
                    {isHostOrAdmin && match.status !== 'COMPLETED' && (
                      <Link to={\`/matches/\${match.id}/scoring\`} className="text-xs font-bold px-3 py-1.5 rounded bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors">
                        Score Match
                      </Link>
                    )}
                  </div>
                  
                  {isHostOrAdmin && (
`;

code = code.replace(/<div className=\{\`text-xs font-bold px-2 py-1 rounded w-24 text-center \$\{match\.status === 'LIVE' \? 'bg-error\/10 text-error' : match\.status === 'COMPLETED' \? 'bg-success\/10 text-success' : 'bg-surface-hover text-foreground-muted'\}\`\}>\s*\{match\.status\}\s*<\/div>\s*\{isHostOrAdmin && \(/, matchRenderReplace);

fs.writeFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', code);
