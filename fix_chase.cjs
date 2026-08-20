const fs = require('fs');
let code = fs.readFileSync('src/pages/matches/scoring/LiveScoring.tsx', 'utf8');

const regexToReplace = /<div className="text-center sm:text-right mt-4 sm:mt-0">[\s\S]*?<div className="space-y-3">/;

const replacement = `<div className="text-center sm:text-right mt-4 sm:mt-0">
            <p className="text-sm font-bold opacity-90">CRR: {crr}</p>
            {innings.targetRuns && (
              <>
                <p className="text-sm font-bold opacity-90">RRR: {rrr}</p>
                <p className="text-lg font-black text-warning">Target: {innings.targetRuns}</p>
                <div className="mt-1 bg-surface/20 px-2 py-1 rounded text-xs font-bold text-center">
                  Need {innings.targetRuns - innings.totalRuns} runs off {(innings.maxOvers * 6) - (innings.completedOvers * 6 + innings.currentOverBalls)} balls
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Batters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-sm text-foreground-muted uppercase tracking-wider">Batters</h3>
            </div>
            <div className="space-y-3">`;

code = code.replace(regexToReplace, replacement);
fs.writeFileSync('src/pages/matches/scoring/LiveScoring.tsx', code);
