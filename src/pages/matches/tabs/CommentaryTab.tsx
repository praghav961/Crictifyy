import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Match } from '../../../types';
import { BallEvent } from '../../../lib/scoring/types';

export function CommentaryTab({ match }: { match: Match }) {
  const [balls, setBalls] = useState<BallEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInningId, setSelectedInningId] = useState<string>(match.currentInningId || 'inning_1_' + match.id);

  useEffect(() => {
    if (match.status === 'COMPLETED' && !match.currentInningId) {
      setSelectedInningId('inning_2_' + match.id);
    } else if (match.currentInningId) {
      setSelectedInningId(match.currentInningId);
    }
  }, [match.currentInningId, match.status, match.id]);

  useEffect(() => {
    if (!selectedInningId || !match?.id) return;
    setLoading(true);
    const q = query(
      collection(db, 'matches', match.id, 'innings', selectedInningId, 'balls'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data: BallEvent[] = [];
      snap.forEach(d => data.push(d.data() as BallEvent));
      setBalls(data);
      setLoading(false);
    });
    return () => unsub();
  }, [selectedInningId, match?.id]);

  const getEventText = (ball: BallEvent) => {
    let parts = [];
    if (ball.isBoundary) parts.push(<span key="bnd" className="font-bold text-primary">{ball.boundaryType}</span>);
    if (ball.wickets && ball.wickets.length > 0) parts.push(<span key="wkt" className="font-bold text-error">WICKET!</span>);
    if (ball.extras && ball.extras.length > 0) parts.push(<span key="ext" className="font-bold text-warning">{ball.extras[0].runs} {ball.extras[0].type}</span>);
    if (parts.length === 0) {
      if (ball.runs === 0) parts.push(<span key="dot" className="font-bold text-foreground-muted">DOT BALL</span>);
      else parts.push(<span key="run" className="font-bold">{ball.runs} runs</span>);
    }
    return parts;
  };

  const getEventBubble = (ball: BallEvent) => {
    if (ball.wickets && ball.wickets.length > 0) return <div className="w-8 h-8 rounded-full bg-error text-error-foreground flex items-center justify-center font-bold text-xs">W</div>;
    if (ball.isBoundary && ball.boundaryType === 'SIX') return <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">6</div>;
    if (ball.isBoundary && ball.boundaryType === 'FOUR') return <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs border border-primary/30">4</div>;
    if (ball.extras && ball.extras.length > 0) return <div className="w-8 h-8 rounded-full bg-warning/20 text-warning flex items-center justify-center font-bold text-xs border border-warning/30">{ball.extras[0].runs}{ball.extras[0].type === 'WIDE' ? 'Wd' : 'Nb'}</div>;
    if (ball.runs === 0) return <div className="w-8 h-8 rounded-full bg-surface-hover text-foreground-muted flex items-center justify-center font-bold text-xs border border-border">•</div>;
    return <div className="w-8 h-8 rounded-full bg-surface-hover text-foreground flex items-center justify-center font-bold text-xs border border-border">{ball.runs}</div>;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-surface p-2 rounded-lg border border-border">
        <span className="text-sm font-bold pl-2">Select Innings</span>
        <select 
          className="bg-surface border border-border rounded-md px-3 py-1.5 text-sm font-medium outline-none focus:border-primary"
          value={selectedInningId} 
          onChange={e => setSelectedInningId(e.target.value)}
        >
          <option value={`inning_1_${match.id}`}>1st Innings</option>
          <option value={`inning_2_${match.id}`}>2nd Innings</option>
        </select>
      </div>

      {loading && <div className="p-8 text-center text-foreground-muted animate-pulse">Loading commentary...</div>}
      
      {!loading && balls.length === 0 && (
        <div className="p-8 text-center text-foreground-muted bg-surface rounded-lg border border-border">No events recorded yet.</div>
      )}

      <div className="space-y-3">
        {balls.map((ball) => (
          <div key={ball.eventId} className="flex gap-4 p-4 bg-surface border border-border rounded-lg items-center">
            <div className="shrink-0">
              {getEventBubble(ball)}
            </div>
            <div>
              <div className="text-sm">
                <span className="font-bold">{ball.bowlerId.replace('temp_', '').replace(/_/g, ' ')}</span> to <span className="font-bold">{ball.strikerId.replace('temp_', '').replace(/_/g, ' ')}</span>
              </div>
              <div className="text-sm mt-0.5 flex gap-2 items-center">
                {getEventText(ball)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
