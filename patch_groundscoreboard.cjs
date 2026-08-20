const fs = require('fs');
let code = fs.readFileSync('src/pages/matches/GroundScoreboard.tsx', 'utf8');

if (!code.includes('GroupStandingsWidget')) {
  code = code.replace(/import \{ ArrowLeft, Trophy \} from 'lucide-react';/, "import { ArrowLeft, Trophy } from 'lucide-react';\nimport { GroupStandingsWidget } from '../../components/GroupStandingsWidget';");

  // Add the widget below the bowler section inside the right column (col-span-5)
  const insertIndex = code.indexOf('</div>', code.indexOf('Bowler', code.indexOf('col-span-5 flex flex-col gap-8')));
  
  // It's safer to find the closing div of the bowler card
  code = code.replace(
    /\{\/\* Bowler \*\/\}[\s\S]*?\{\/\* Bottom Bar: Recent Balls & Status \*\/\}/, 
    match => {
        const insertion = `
          {match.tournamentId && (
            <div className="mt-8">
              <GroupStandingsWidget tournamentId={match.tournamentId} groupId={match.groupId} />
            </div>
          )}
        `;
        return match.replace("</div>\n                </div>\n            </div>", "</div>\n" + insertion + "\n                </div>\n            </div>");
    }
  );

  fs.writeFileSync('src/pages/matches/GroundScoreboard.tsx', code);
}
