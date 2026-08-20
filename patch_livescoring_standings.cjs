const fs = require('fs');
let code = fs.readFileSync('src/pages/matches/scoring/LiveScoring.tsx', 'utf8');

if (!code.includes('GroupStandingsWidget')) {
  code = code.replace(/import \{ Modal \} from '\.\.\/\.\.\/\.\.\/components\/ui\/Modal';/, "import { Modal } from '../../../components/ui/Modal';\nimport { GroupStandingsWidget } from '../../../components/GroupStandingsWidget';");

  // Add the widget below the bowler section 
  code = code.replace(
    /\{\/\* Bowler \*\/\}[\s\S]*?<\/Card>\s*<\/div>/, 
    match => {
        const insertion = `
          {match.tournamentId && (
            <div className="col-span-1 md:col-span-2 mt-4">
              <GroupStandingsWidget tournamentId={match.tournamentId} groupId={match.groupId} />
            </div>
          )}
        `;
        return match + insertion;
    }
  );

  fs.writeFileSync('src/pages/matches/scoring/LiveScoring.tsx', code);
}
