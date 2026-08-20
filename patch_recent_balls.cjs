const fs = require('fs');
let code = fs.readFileSync('src/pages/matches/scoring/LiveScoring.tsx', 'utf8');

const importReplacement = `import { doc, onSnapshot, updateDoc, writeBatch, collection, query, orderBy, limit } from 'firebase/firestore';`;
code = code.replace(/import { doc, onSnapshot, updateDoc, writeBatch } from 'firebase\/firestore';/, importReplacement);

const stateReplacement = `  const [innings, setInnings] = useState<InningsState | null>(null);
  const [recentBalls, setRecentBalls] = useState<any[]>([]);`;
code = code.replace(/const \[innings, setInnings\] = useState<InningsState \| null>\(null\);/, stateReplacement);

const effectReplacement = `      if (snap.exists()) {
        let baseState = snap.data() as InningsState;
        
        try {
          const syncDb = await getSyncDB();
          const pendingEvents = await syncDb.getAll('sync_queue');
          const matchEvents = pendingEvents.filter(e => e.matchId === match.id && e.inningId === match.currentInningId);
          
          for (const item of matchEvents) {
            if (!baseState.processedEvents?.includes(item.event.eventId)) {
              baseState = processEvent(baseState, item.event);
            }
          }
        } catch (e) {
          console.error("Failed to apply local queue", e);
        }
        
        setInnings(baseState);
      }
      setLoading(false);
    });

    // Listen to recent balls
    const ballsQuery = query(collection(db, 'matches', match.id, 'innings', match.currentInningId, 'balls'), orderBy('timestamp', 'desc'), limit(12));
    const unsubBalls = onSnapshot(ballsQuery, (snap) => {
      setRecentBalls(snap.docs.map(d => d.data()).reverse());
    });

    return () => {
      unsub();
      unsubBalls();
    };
`;
code = code.replace(/if \(snap\.exists\(\)\) \{[\s\S]*?return \(\) => unsub\(\);\n/m, effectReplacement);

const uiReplacement = `{/* Recent Balls */}
        <Card className="mb-4">
          <CardContent className="p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold">This Over</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {recentBalls.slice(-6).map((b, i) => {
                 let label = b.runs.toString();
                 let isW = b.wickets && b.wickets.length > 0;
                 let isExtra = b.extras && b.extras.length > 0;
                 let color = 'bg-surface-hover';
                 
                 if (isW) { label = 'W'; color = 'bg-error text-error-foreground'; }
                 else if (isExtra) { 
                   const type = b.extras[0].type;
                   if (type === 'WIDE') { label = b.extras[0].runs + 'WD'; color = 'bg-warning text-warning-foreground'; }
                   if (type === 'NO_BALL') { label = b.extras[0].runs + 'NB'; color = 'bg-warning text-warning-foreground'; }
                   if (type === 'BYE') { label = b.extras[0].runs + 'B'; color = 'bg-surface-hover'; }
                   if (type === 'LEG_BYE') { label = b.extras[0].runs + 'LB'; color = 'bg-surface-hover'; }
                 } else if (b.runs === 4 || b.runs === 6) {
                   color = 'bg-primary text-primary-foreground';
                 }

                 return (
                   <div key={i} className={\`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm \${color}\`}>
                     {label}
                   </div>
                 );
              })}
              {recentBalls.length === 0 && <span className="text-sm text-foreground-muted">No balls yet in this innings.</span>}
            </div>
          </CardContent>
        </Card>

        {/* Bowler */}`;
code = code.replace(/\{\/\* Bowler \*\/\}/, uiReplacement);

fs.writeFileSync('src/pages/matches/scoring/LiveScoring.tsx', code);
