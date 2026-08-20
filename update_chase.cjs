const fs = require('fs');
let code = fs.readFileSync('src/pages/matches/scoring/LiveScoring.tsx', 'utf8');

const targetRunsReplacement = `            {innings.targetRuns && (
              <>
                <p className="text-sm font-bold opacity-90">RRR: {rrr}</p>
                <p className="text-lg font-black text-warning">Target: {innings.targetRuns}</p>
                <div className="mt-1 bg-surface/20 px-2 py-1 rounded text-xs font-bold text-center">
                  Need {innings.targetRuns - innings.totalRuns} runs off {(innings.maxOvers * 6) - (innings.completedOvers * 6 + innings.currentOverBalls)} balls
                </div>
              </>
            )}`;

code = code.replace(/\{innings\.targetRuns && \([\s\S]*?\}\)/, targetRunsReplacement);

fs.writeFileSync('src/pages/matches/scoring/LiveScoring.tsx', code);
