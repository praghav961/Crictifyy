import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Match } from '../../types';
import { InningsState, BallEvent } from '../../lib/scoring/types';
import { ArrowLeft, Trophy } from 'lucide-react';
import { GroupStandingsWidget } from '../../components/GroupStandingsWidget';
import { PlayerNameResolver } from '../../components/PlayerNameResolver';
import { motion } from 'motion/react';

export function GroundScoreboard() {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [currentInnings, setCurrentInnings] = useState<InningsState | null>(null);
  const [recentBalls, setRecentBalls] = useState<BallEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Full screen toggle helper
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error("Error attempting to enable fullscreen", err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    if (!id) return;
    
    // Listen to Match
    const unsubMatch = onSnapshot(doc(db, 'matches', id), (docSnap) => {
      if (docSnap.exists()) {
        const m = { id: docSnap.id, ...docSnap.data() } as Match;
        setMatch(m);
        
        // Listen to current innings
        if (m.currentInningId) {
          const unsubInnings = onSnapshot(doc(db, 'matches', id, 'innings', m.currentInningId), (inningSnap) => {
             if (inningSnap.exists()) {
                 const iData = inningSnap.data() as InningsState;
                 setCurrentInnings(iData);
                 
                 // Listen to recent balls
                 const ballsQ = query(
                     collection(db, 'matches', id, 'innings', m.currentInningId, 'balls'),
                     orderBy('timestamp', 'desc'),
                     limit(12)
                 );
                 const unsubBalls = onSnapshot(ballsQ, (bSnap) => {
                     const balls: BallEvent[] = [];
                     bSnap.forEach(b => balls.push(b.data() as BallEvent));
                     setRecentBalls(balls.reverse()); // Oldest to newest
                     setLoading(false);
                 });
                 return () => unsubBalls();
             } else {
                 setLoading(false);
             }
          });
        } else {
            setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubMatch();
  }, [id]);

  if (loading) {
    return <div className="h-screen w-screen bg-black flex items-center justify-center text-white"><div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white"></div></div>;
  }

  if (!match) {
    return <div className="h-screen w-screen bg-black text-white flex items-center justify-center">Match not found</div>;
  }

  // Pre-match state
  if (match.status === 'SCHEDULED') {
    return (
        <div className="h-screen w-screen bg-background text-foreground flex flex-col items-center justify-center relative overflow-hidden" onClick={toggleFullScreen}>
            <div className="absolute top-4 left-4 z-10">
                <Link to={`/matches/${id}`} className="p-3 bg-surface border border-border rounded-full hover:bg-surface-hover flex">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
            </div>
            <Trophy className="w-24 h-24 text-primary opacity-20 absolute top-10" />
            <h2 className="text-4xl font-bold uppercase tracking-widest text-primary mb-4">{match.tournamentName || 'Friendly Match'}</h2>
            <div className="flex items-center gap-12 mt-12">
                <div className="text-center">
                    <h3 className="text-6xl font-black">{match.team1Name}</h3>
                </div>
                <div className="text-4xl font-bold text-foreground-muted">VS</div>
                <div className="text-center">
                    <h3 className="text-6xl font-black">{match.team2Name}</h3>
                </div>
            </div>
            <div className="mt-16 text-3xl font-bold bg-surface px-8 py-4 rounded-xl border border-border">
                {match.tossWinnerId ? `${match.tossWinnerId === match.team1Id ? match.team1Name : match.team2Name} won the toss and elected to ${match.tossDecision}` : 'Match Starts Soon'}
            </div>
        </div>
    );
  }

  const battingTeamName = currentInnings?.teamId === match.team1Id ? match.team1Name : match.team2Name;
  const bowlingTeamName = currentInnings?.teamId === match.team1Id ? match.team2Name : match.team1Name;

  const getBatsmanName = (playerId?: string) => {
      if (!playerId) return '';
      return playerId.replace('temp_', '').replace(/_/g, ' ');
  };

  const striker = currentInnings?.currentStrikerId ? currentInnings.batterStats[currentInnings.currentStrikerId] : null;
  const nonStriker = currentInnings?.currentNonStrikerId ? currentInnings.batterStats[currentInnings.currentNonStrikerId] : null;
  const currentBowler = currentInnings?.currentBowlerId ? currentInnings.bowlerStats[currentInnings.currentBowlerId] : null;

  const crr = currentInnings?.completedOvers || currentInnings?.currentOverBalls 
    ? (currentInnings.totalRuns / (currentInnings.completedOvers + (currentInnings.currentOverBalls / 6))).toFixed(2) 
    : '0.00';
    
  let rrr = '';
  if (currentInnings?.targetRuns && currentInnings?.maxOvers) {
      const runsNeeded = currentInnings.targetRuns - currentInnings.totalRuns;
      const ballsRemaining = (currentInnings.maxOvers * 6) - ((currentInnings.completedOvers * 6) + currentInnings.currentOverBalls);
      if (ballsRemaining > 0 && runsNeeded > 0) {
          rrr = (runsNeeded / (ballsRemaining / 6)).toFixed(2);
      }
  }

  // Calculate runs and format for recent balls
  const formatBall = (b: BallEvent) => {
      if (b.wickets && b.wickets.length > 0) return { label: 'W', color: 'bg-error text-white' };
      if (b.extras) {
          const w = b.extras.find(e => e.type === 'WIDE');
          if (w) return { label: `${w.runs}wd`, color: 'bg-surface-hover text-foreground' };
          const nb = b.extras.find(e => e.type === 'NO_BALL');
          if (nb) return { label: `${nb.runs}nb`, color: 'bg-warning/20 text-warning-strong' };
          const lb = b.extras.find(e => e.type === 'LEG_BYE');
          if (lb) return { label: `${lb.runs}lb`, color: 'bg-surface-hover text-foreground' };
          const by = b.extras.find(e => e.type === 'BYE');
          if (by) return { label: `${by.runs}b`, color: 'bg-surface-hover text-foreground' };
      }
      if (b.isBoundary && b.boundaryType === 'SIX') return { label: '6', color: 'bg-primary text-white font-bold' };
      if (b.isBoundary && b.boundaryType === 'FOUR') return { label: '4', color: 'bg-success text-white font-bold' };
      if (b.runs === 0) return { label: '0', color: 'bg-surface border border-border text-foreground-muted' };
      return { label: `${b.runs}`, color: 'bg-surface text-foreground border border-border' };
  };

  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col relative overflow-hidden" onClick={toggleFullScreen}>
        <div className="absolute top-4 left-4 z-50 group">
            <Link to={`/matches/${id}`} className="p-3 bg-surface border border-border rounded-full hover:bg-surface-hover flex opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowLeft className="w-6 h-6" />
            </Link>
        </div>

        {/* Top Bar: Match Context */}
        <div className="flex-none bg-surface border-b border-border p-4 flex justify-between items-center z-10 shadow-sm">
            <div className="flex items-center gap-4">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded font-bold uppercase tracking-wider text-sm">{match.status}</span>
                <span className="font-semibold text-lg text-foreground-muted">{match.tournamentName || 'Friendly Match'}</span>
            </div>
            {match.status === 'COMPLETED' ? (
                <div className="text-xl font-bold text-success">{match.result}</div>
            ) : (
                <div className="text-xl font-bold">
                   {currentInnings?.targetRuns ? `Target: ${currentInnings.targetRuns}` : '1st Innings'}
                </div>
            )}
        </div>

        {/* Main Score Area */}
        <div className="flex-1 flex flex-col justify-center px-12 z-10">
            <div className="grid grid-cols-12 gap-12 items-center">
                
                {/* Left: Score */}
                <div className="col-span-7 flex flex-col gap-2">
                    <div className="flex items-center gap-6">
                        <h1 className="text-7xl font-black uppercase tracking-tight truncate">{battingTeamName}</h1>
                    </div>
                    <div className="flex items-baseline gap-6 mt-4">
                        <span className="text-[14rem] font-black leading-none tabular-nums text-foreground">{currentInnings?.totalRuns || 0}</span>
                        <span className="text-8xl font-black text-foreground-muted">/</span>
                        <span className="text-8xl font-black text-error">{currentInnings?.totalWickets || 0}</span>
                    </div>
                    <div className="flex items-center gap-8 mt-6">
                        <span className="text-6xl font-bold tabular-nums text-foreground-muted">
                            ({currentInnings?.completedOvers || 0}.{currentInnings?.currentOverBalls || 0} Ovs)
                        </span>
                    </div>
                    
                    {/* Rates */}
                    <div className="flex gap-8 mt-12 bg-surface p-6 rounded-2xl border border-border w-max">
                        <div className="flex flex-col">
                            <span className="text-xl text-foreground-muted uppercase font-bold tracking-wider mb-1">CRR</span>
                            <span className="text-4xl font-black tabular-nums">{crr}</span>
                        </div>
                        {rrr && (
                            <div className="flex flex-col border-l border-border pl-8">
                                <span className="text-xl text-foreground-muted uppercase font-bold tracking-wider mb-1">RRR</span>
                                <span className="text-4xl font-black tabular-nums text-error">{rrr}</span>
                            </div>
                        )}
                        {currentInnings?.targetRuns && (
                            <div className="flex flex-col border-l border-border pl-8">
                                <span className="text-xl text-foreground-muted uppercase font-bold tracking-wider mb-1">Need</span>
                                <span className="text-4xl font-black tabular-nums">{currentInnings.targetRuns - (currentInnings.totalRuns || 0)} from {(currentInnings.maxOvers ? currentInnings.maxOvers * 6 : 0) - ((currentInnings.completedOvers || 0) * 6 + (currentInnings.currentOverBalls || 0))}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Batsmen & Bowler */}
                <div className="col-span-5 flex flex-col gap-8">
                    {/* Batsmen */}
                    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-lg">
                        <div className="bg-surface-hover px-6 py-3 border-b border-border flex justify-between">
                            <span className="font-bold text-lg text-foreground-muted uppercase tracking-wider">Batting</span>
                        </div>
                        <div className="p-6 space-y-4">
                            {striker && (
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl font-bold truncate max-w-[200px]"><PlayerNameResolver playerId={striker.id} fallbackName={striker.name} /></span>
                                        <span className="text-primary text-xl">*</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black">{striker.runs}</span>
                                        <span className="text-xl font-bold text-foreground-muted">({striker.ballsFaced})</span>
                                    </div>
                                </div>
                            )}
                            {nonStriker && (
                                <div className="flex justify-between items-center opacity-80">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl font-bold truncate max-w-[200px]"><PlayerNameResolver playerId={nonStriker.id} fallbackName={nonStriker.name} /></span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black">{nonStriker.runs}</span>
                                        <span className="text-xl font-bold text-foreground-muted">({nonStriker.ballsFaced})</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bowler */}
                    {currentBowler && (
                        <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-lg">
                            <div className="bg-surface-hover px-6 py-3 border-b border-border flex justify-between items-center">
                                <span className="font-bold text-lg text-foreground-muted uppercase tracking-wider">Bowling</span>
                            </div>
                            <div className="p-6 flex justify-between items-center">
                                <span className="text-3xl font-bold truncate max-w-[200px]"><PlayerNameResolver playerId={currentBowler.id} fallbackName={currentBowler.name} /></span>
                                <div className="flex items-center gap-6">
                                    <div className="text-center">
                                        <div className="text-sm font-bold text-foreground-muted uppercase">O</div>
                                        <div className="text-2xl font-black">{currentBowler.overs}.{currentBowler.balls}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm font-bold text-foreground-muted uppercase">M</div>
                                        <div className="text-2xl font-black">{currentBowler.maidens}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm font-bold text-foreground-muted uppercase">R</div>
                                        <div className="text-2xl font-black">{currentBowler.runs}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm font-bold text-foreground-muted uppercase">W</div>
                                        <div className="text-2xl font-black text-error">{currentBowler.wickets}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>

        {/* Bottom Bar: Recent Balls & Status */}
        <div className="flex-none bg-surface border-t border-border p-6 z-10 flex items-center justify-between shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-6">
                <span className="font-bold text-xl uppercase tracking-wider text-foreground-muted">Recent</span>
                <div className="flex gap-2">
                    {recentBalls.map((b, i) => {
                        const fmt = formatBall(b);
                        return (
                            <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                key={b.eventId} 
                                className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shadow-sm ${fmt.color}`}
                            >
                                {fmt.label}
                            </motion.div>
                        );
                    })}
                    {recentBalls.length === 0 && <span className="text-foreground-muted text-lg italic">No deliveries yet in this innings.</span>}
                </div>
            </div>
            {match.status === 'IN_PROGRESS' && currentInnings?.targetRuns && (
                <div className="text-2xl font-bold text-primary animate-pulse">
                    Need {currentInnings.targetRuns - (currentInnings.totalRuns || 0)} runs to win
                </div>
            )}
        </div>
    </div>
  );
}
