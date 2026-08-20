import { useState } from 'react';
import { useTournamentStats } from '../../hooks/useTournamentStats';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { RefreshCw, Trophy, Target, Award } from 'lucide-react';

export function TournamentStatsTab({ tournamentId }: { tournamentId: string }) {
  const { loading, batting, bowling, fielding, partnerships, refresh } = useTournamentStats(tournamentId);
  const [view, setView] = useState<'BATTING' | 'BOWLING' | 'FIELDING' | 'PARTNERSHIPS'>('BATTING');
  const [battingMetric, setBattingMetric] = useState('runs');
  const [bowlingMetric, setBowlingMetric] = useState('wickets');
  const [fieldingMetric, setFieldingMetric] = useState('dismissals');

  if (loading) {
    return <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>;
  }

  // Sort calculations
  const sortedBatting = [...batting].sort((a, b) => {
    if (battingMetric === 'strikeRate') return b.strikeRate - a.strikeRate;
    if (battingMetric === 'average') return b.average - a.average;
    if (battingMetric === 'fours') return b.fours - a.fours;
    if (battingMetric === 'sixes') return b.sixes - a.sixes;
    if (battingMetric === 'fifties') return b.fifties - a.fifties;
    if (battingMetric === 'hundreds') return b.hundreds - a.hundreds;
    if (battingMetric === 'highestScore') return b.highestScore - a.highestScore;
    return b.runs - a.runs;
  }).slice(0, 25);
  
  const sortedBowling = [...bowling].sort((a, b) => {
    if (bowlingMetric === 'economy') return a.economy - b.economy; // Lower is better
    if (bowlingMetric === 'average') return a.average - b.average; // Lower is better
    if (bowlingMetric === 'strikeRate') return a.strikeRate - b.strikeRate; // Lower is better
    if (bowlingMetric === 'maidens') return b.maidens - a.maidens;
    if (bowlingMetric === 'dots') return b.dots - a.dots;
    if (bowlingMetric === 'threeWickets') return b.threeWickets - a.threeWickets;
    if (bowlingMetric === 'fourWickets') return b.fourWickets - a.fourWickets;
    if (bowlingMetric === 'fiveWickets') return b.fiveWickets - a.fiveWickets;
    // Default Wickets
    if (b.wickets !== a.wickets) return b.wickets - a.wickets;
    return a.runsConceded - b.runsConceded;
  }).slice(0, 25);
  
  const sortedFielding = [...fielding].sort((a, b) => {
    if (fieldingMetric === 'catches') return b.catches - a.catches;
    if (fieldingMetric === 'runOuts') return b.runOuts - a.runOuts;
    if (fieldingMetric === 'stumpings') return b.stumpings - a.stumpings;
    return b.dismissals - a.dismissals;
  }).slice(0, 25);
  const sortedPartnerships = [...(partnerships || [])].sort((a, b) => b.runs - a.runs).slice(0, 25);

  const orangeCap = sortedBatting[0];
  const purpleCap = sortedBowling[0];
  
  // Highest score
  const highestScoreObj = [...batting].sort((a, b) => b.highestScore - a.highestScore)[0];
  // Best figures
  const bestFiguresObj = [...bowling].sort((a, b) => {
    if (b.fiveWickets !== a.fiveWickets) return b.fiveWickets - a.fiveWickets;
    return b.wickets - a.wickets;
  })[0];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Tournament Statistics</h2>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Cap Holders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-orange-500/10 border-orange-500/20">
          <CardContent className="p-4 flex flex-col items-center text-center gap-2">
            <Trophy className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-orange-500">Orange Cap</p>
              <p className="font-bold text-sm truncate w-full px-2" title={orangeCap ? orangeCap.name : ''}>{orangeCap ? orangeCap.name : 'N/A'}</p>
              <p className="text-sm font-black text-foreground">{orangeCap ? `${orangeCap.runs} Runs` : '0 Runs'}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="p-4 flex flex-col items-center text-center gap-2">
            <Target className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500">Purple Cap</p>
              <p className="font-bold text-sm truncate w-full px-2" title={purpleCap ? purpleCap.name : ''}>{purpleCap ? purpleCap.name : 'N/A'}</p>
              <p className="text-sm font-black text-foreground">{purpleCap ? `${purpleCap.wickets} Wickets` : '0 Wickets'}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4 flex flex-col items-center text-center gap-2">
            <Award className="w-8 h-8 text-primary" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Highest Score</p>
              <p className="font-bold text-sm truncate w-full px-2" title={highestScoreObj ? highestScoreObj.name : ''}>{highestScoreObj ? highestScoreObj.name : 'N/A'}</p>
              <p className="text-sm font-black text-foreground">{highestScoreObj ? `${highestScoreObj.highestScore}` : '0'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4 flex flex-col items-center text-center gap-2">
            <Award className="w-8 h-8 text-primary" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Best Economy</p>
              <p className="font-bold text-sm truncate w-full px-2">
                {[...bowling].filter(b => b.ballsBowled >= 12).sort((a, b) => a.economy - b.economy)[0]?.name || 'N/A'}
              </p>
              <p className="text-sm font-black text-foreground">
                {[...bowling].filter(b => b.ballsBowled >= 12).sort((a, b) => a.economy - b.economy)[0]?.economy.toFixed(2) || '0.00'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border">
        <button className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${view === 'BATTING' ? 'border-primary text-primary' : 'border-transparent text-foreground-muted hover:text-foreground'}`} onClick={() => setView('BATTING')}>Batting (Top 25)</button>
        <button className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${view === 'BOWLING' ? 'border-primary text-primary' : 'border-transparent text-foreground-muted hover:text-foreground'}`} onClick={() => setView('BOWLING')}>Bowling (Top 25)</button>
        <button className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${view === 'FIELDING' ? 'border-primary text-primary' : 'border-transparent text-foreground-muted hover:text-foreground'}`} onClick={() => setView('FIELDING')}>Fielding (Top 25)</button>
        <button className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${view === 'PARTNERSHIPS' ? 'border-primary text-primary' : 'border-transparent text-foreground-muted hover:text-foreground'}`} onClick={() => setView('PARTNERSHIPS')}>Partnerships (Top 25)</button>
      </div>

      <div className="flex justify-end pt-4 pb-2">
        {view === 'BATTING' && (
           <select className="p-2 border border-border rounded-lg bg-surface text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary" value={battingMetric} onChange={e => setBattingMetric(e.target.value)}>
             <option value="runs">Runs</option>
             <option value="strikeRate">Strike Rate</option>
             <option value="average">Average</option>
             <option value="fours">4s</option>
             <option value="sixes">6s</option>
             <option value="fifties">50s</option>
             <option value="hundreds">100s</option>
             <option value="highestScore">Highest Score</option>
           </select>
        )}
        {view === 'BOWLING' && (
           <select className="p-2 border border-border rounded-lg bg-surface text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary" value={bowlingMetric} onChange={e => setBowlingMetric(e.target.value)}>
             <option value="wickets">Wickets</option>
             <option value="economy">Economy</option>
             <option value="average">Average</option>
             <option value="strikeRate">Strike Rate</option>
             <option value="maidens">Maidens</option>
             <option value="dots">Dot Balls</option>
             <option value="threeWickets">3W</option>
             <option value="fourWickets">4W</option>
             <option value="fiveWickets">5W</option>
           </select>
        )}
        {view === 'FIELDING' && (
           <select className="p-2 border border-border rounded-lg bg-surface text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary" value={fieldingMetric} onChange={e => setFieldingMetric(e.target.value)}>
             <option value="dismissals">Total Dismissals</option>
             <option value="catches">Catches</option>
             <option value="runOuts">Run Outs</option>
             <option value="stumpings">Stumpings</option>
           </select>
        )}
      </div>

      {/* Tables */}
      <Card>
        <div className="overflow-x-auto">
          {view === 'PARTNERSHIPS' && (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-foreground-muted uppercase bg-surface-hover border-b border-border">
                <tr>
                  <th className="px-4 py-3">Players</th>
                  <th className="px-4 py-3 text-center font-bold">Runs</th>
                  <th className="px-4 py-3 text-center">Balls</th>
                </tr>
              </thead>
              <tbody>
                {sortedPartnerships.map((p, i) => (
                  <tr key={`${p.matchId}-${i}`} className="border-b border-border hover:bg-surface-hover/50">
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      <span className="text-foreground-muted w-4 font-mono text-xs">{i + 1}</span> {p.player1Name} & {p.player2Name}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-primary">{p.runs}</td>
                    <td className="px-4 py-3 text-center">{p.balls}</td>
                  </tr>
                ))}
                {sortedPartnerships.length === 0 && (
                  <tr><td colSpan={3} className="p-8 text-center text-foreground-muted">No data available</td></tr>
                )}
              </tbody>
            </table>
          )}
          {view === 'BATTING' && (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-foreground-muted uppercase bg-surface-hover border-b border-border">
                <tr>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3 text-center">M</th>
                  <th className="px-4 py-3 text-center">I</th>
                  <th className="px-4 py-3 text-center font-bold">R</th>
                  <th className="px-4 py-3 text-center">B</th>
                  <th className="px-4 py-3 text-center">Avg</th>
                  <th className="px-4 py-3 text-center">SR</th>
                  <th className="px-4 py-3 text-center">HS</th>
                  <th className="px-4 py-3 text-center">50s</th>
                  <th className="px-4 py-3 text-center">100s</th>
                  <th className="px-4 py-3 text-center">4s</th>
                  <th className="px-4 py-3 text-center">6s</th>
                </tr>
              </thead>
              <tbody>
                {sortedBatting.map((p, i) => (
                  <tr key={p.id} className="border-b border-border hover:bg-surface-hover/50">
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      <span className="text-foreground-muted w-4 font-mono text-xs">{i + 1}</span> {p.name}
                    </td>
                    <td className="px-4 py-3 text-center">{p.matches}</td>
                    <td className="px-4 py-3 text-center">{p.innings}</td>
                    <td className="px-4 py-3 text-center font-bold text-primary">{p.runs}</td>
                    <td className="px-4 py-3 text-center">{p.ballsFaced}</td>
                    <td className="px-4 py-3 text-center">{p.average.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">{p.strikeRate.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">{p.highestScore}{p.timesOut < p.innings ? '*' : ''}</td>
                    <td className="px-4 py-3 text-center">{p.fifties}</td>
                    <td className="px-4 py-3 text-center">{p.hundreds}</td>
                    <td className="px-4 py-3 text-center">{p.fours}</td>
                    <td className="px-4 py-3 text-center">{p.sixes}</td>
                  </tr>
                ))}
                {sortedBatting.length === 0 && (
                  <tr><td colSpan={12} className="p-8 text-center text-foreground-muted">No data available</td></tr>
                )}
              </tbody>
            </table>
          )}

          {view === 'BOWLING' && (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-foreground-muted uppercase bg-surface-hover border-b border-border">
                <tr>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3 text-center">M</th>
                  <th className="px-4 py-3 text-center">I</th>
                  <th className="px-4 py-3 text-center">O</th>
                  <th className="px-4 py-3 text-center">M</th>
                  <th className="px-4 py-3 text-center">R</th>
                  <th className="px-4 py-3 text-center font-bold">W</th>
                  <th className="px-4 py-3 text-center">Econ</th>
                  <th className="px-4 py-3 text-center">Avg</th>
                  <th className="px-4 py-3 text-center">SR</th>
                  <th className="px-4 py-3 text-center">3W</th>
                  <th className="px-4 py-3 text-center">4W</th>
                  <th className="px-4 py-3 text-center">5W</th>
                </tr>
              </thead>
              <tbody>
                {sortedBowling.map((p, i) => (
                  <tr key={p.id} className="border-b border-border hover:bg-surface-hover/50">
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      <span className="text-foreground-muted w-4 font-mono text-xs">{i + 1}</span> {p.name}
                    </td>
                    <td className="px-4 py-3 text-center">{p.matches}</td>
                    <td className="px-4 py-3 text-center">{p.innings}</td>
                    <td className="px-4 py-3 text-center">{Math.floor(p.ballsBowled / 6)}.{p.ballsBowled % 6}</td>
                    <td className="px-4 py-3 text-center">{p.maidens}</td>
                    <td className="px-4 py-3 text-center">{p.runsConceded}</td>
                    <td className="px-4 py-3 text-center font-bold text-primary">{p.wickets}</td>
                    <td className="px-4 py-3 text-center">{p.economy.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">{p.average.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">{p.strikeRate.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">{p.threeWickets}</td>
                    <td className="px-4 py-3 text-center">{p.fourWickets}</td>
                    <td className="px-4 py-3 text-center">{p.fiveWickets}</td>
                  </tr>
                ))}
                {sortedBowling.length === 0 && (
                  <tr><td colSpan={13} className="p-8 text-center text-foreground-muted">No data available</td></tr>
                )}
              </tbody>
            </table>
          )}

          {view === 'FIELDING' && (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-foreground-muted uppercase bg-surface-hover border-b border-border">
                <tr>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3 text-center">M</th>
                  <th className="px-4 py-3 text-center">Catches</th>
                  <th className="px-4 py-3 text-center">Run Outs</th>
                  <th className="px-4 py-3 text-center">Stumpings</th>
                  <th className="px-4 py-3 text-center font-bold">Total Dismissals</th>
                </tr>
              </thead>
              <tbody>
                {sortedFielding.map((p, i) => (
                  <tr key={p.id} className="border-b border-border hover:bg-surface-hover/50">
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      <span className="text-foreground-muted w-4 font-mono text-xs">{i + 1}</span> {p.name}
                    </td>
                    <td className="px-4 py-3 text-center">{p.matches}</td>
                    <td className="px-4 py-3 text-center">{p.catches}</td>
                    <td className="px-4 py-3 text-center">{p.runOuts}</td>
                    <td className="px-4 py-3 text-center">{p.stumpings}</td>
                    <td className="px-4 py-3 text-center font-bold text-primary">{p.dismissals}</td>
                  </tr>
                ))}
                {sortedFielding.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-foreground-muted">No data available</td></tr>
                )}
              </tbody>
            </table>
          )}

        </div>
      </Card>
    </div>
  );
}
