const fs = require('fs');

let content = fs.readFileSync('src/pages/matches/scoring/LiveScoring.tsx', 'utf8');

// Insert new states
const stateInjection = `  const [extrasModalOpen, setExtrasModalOpen] = useState(false);
  const [extraType, setExtraType] = useState<'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | 'PENALTY' | ''>('');
  const [extraRuns, setExtraRuns] = useState(1);
  const [extraBatterRuns, setExtraBatterRuns] = useState(0);

  const openExtrasModal = (type: 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | 'PENALTY') => {
    setExtraType(type);
    setExtraRuns(type === 'PENALTY' ? 5 : 1);
    setExtraBatterRuns(0);
    setExtrasModalOpen(true);
  };
`;

content = content.replace(/const \[wicketModalOpen, setWicketModalOpen\] = useState\(false\);/, stateInjection + '  const [wicketModalOpen, setWicketModalOpen] = useState(false);');


// Replace handleScoreEvent
const newHandleScoreEvent = `  const handleScoreEvent = async (runs: number, eType?: any, isBoundary = false, boundaryType?: any, isWicket = false, rawExtraRuns?: number) => {
    if (!innings || !match.currentInningId) return;
    if (!innings.currentStrikerId || !innings.currentNonStrikerId || !innings.currentBowlerId) {
      alert("Please assign all active players first.");
      return;
    }

    const eventId = \`ball_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
    const event: BallEvent = {
      eventId,
      timestamp: Date.now(),
      matchId: match.id,
      inningId: match.currentInningId,
      bowlerId: innings.currentBowlerId,
      strikerId: innings.currentStrikerId,
      nonStrikerId: innings.currentNonStrikerId,
      runs: runs,
      isBoundary,
      ...(boundaryType != null && { boundaryType }),
      ...(innings.freeHitActive !== undefined && { isFreeHit: innings.freeHitActive }),
      ...(selectedZone ? { shotZone: selectedZone } : {})
    };
    setSelectedZone(''); 
    
    if (eType) {
      event.extras = [{ type: eType, runs: rawExtraRuns || 1 }];
    }

    if (isWicket) {
      event.wickets = [{ type: wicketType as any, playerOutId: playerOut === 'STRIKER' ? innings.currentStrikerId : innings.currentNonStrikerId }];
      if (fielderName) {
        event.wickets[0].assistIds = [\`temp_\${fielderName.replace(/\\s+/g, '_')}\`];
      }
    }

    const optimisticState = processEvent(innings, event);
    setInnings(optimisticState);
    await addToSyncQueue(match.id, match.currentInningId, event);
    logAudit(auth.currentUser?.uid || '', 'BALL_ADDED', { matchId: match.id, metadata: { eventId: event.eventId, runs: event.runs, isBoundary: event.isBoundary } });
  };`;

content = content.replace(/const handleScoreEvent = async \([\s\S]*?logAudit\([\s\S]*?\);\n  };\n/, newHandleScoreEvent + '\n');


// Update buttons
content = content.replace(/<Button variant="outline" className="h-16 text-sm font-bold border-warning\/50 text-warning" onClick=\{\(\) => handleScoreEvent\(0, 'WIDE'\)\}>WD<\/Button>/, 
  `<Button variant="outline" className="h-16 text-sm font-bold border-warning/50 text-warning" onClick={() => openExtrasModal('WIDE')}>WD</Button>`);

content = content.replace(/<Button variant="outline" className="h-16 text-sm font-bold border-warning\/50 text-warning" onClick=\{\(\) => handleScoreEvent\(0, 'NO_BALL'\)\}>NB<\/Button>/,
  `<Button variant="outline" className="h-16 text-sm font-bold border-warning/50 text-warning" onClick={() => openExtrasModal('NO_BALL')}>NB</Button>`);

content = content.replace(/<Button variant="outline" className="h-16 text-sm font-bold text-foreground-muted" onClick=\{\(\) => handleScoreEvent\(1, 'BYE'\)\}>B<\/Button>/,
  `<Button variant="outline" className="h-16 text-sm font-bold text-foreground-muted" onClick={() => openExtrasModal('BYE')}>B</Button>`);

content = content.replace(/<Button variant="outline" className="h-16 text-sm font-bold text-foreground-muted" onClick=\{\(\) => handleScoreEvent\(1, 'LEG_BYE'\)\}>LB<\/Button>/,
  `<Button variant="outline" className="h-16 text-sm font-bold text-foreground-muted" onClick={() => openExtrasModal('LEG_BYE')}>LB</Button>`);

const extrasModalJSX = `
      <Modal isOpen={extrasModalOpen} onClose={() => setExtrasModalOpen(false)} title="Extras Details">
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1 font-bold">{extraType === 'WIDE' ? 'Wide Runs (Total)' : extraType === 'BYE' || extraType === 'LEG_BYE' ? 'Total Extras' : 'Extra Penalty Runs'}</label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(r => (
                 <Button key={r} variant={extraRuns === r ? 'default' : 'outline'} onClick={() => setExtraRuns(r)}>{r}</Button>
              ))}
            </div>
          </div>
          {extraType === 'NO_BALL' && (
            <div>
              <label className="block text-sm mb-1 font-bold">Batter Runs off No Ball</label>
              <div className="flex gap-2">
                {[0,1,2,3,4,6].map(r => (
                   <Button key={r} variant={extraBatterRuns === r ? 'default' : 'outline'} onClick={() => setExtraBatterRuns(r)}>{r}</Button>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end pt-4 gap-2">
            <Button variant="outline" onClick={() => setExtrasModalOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              setExtrasModalOpen(false);
              handleScoreEvent(extraType === 'NO_BALL' ? extraBatterRuns : 0, extraType, false, null, false, extraRuns);
            }}>Confirm {extraType?.replace('_', ' ')}</Button>
          </div>
        </div>
      </Modal>
`;

content = content.replace(/(<Modal isOpen={wicketModalOpen} onClose=\{\(\) => setWicketModalOpen\(false\)\} title="Wicket Details">)/, extrasModalJSX + '\n      $1');

fs.writeFileSync('src/pages/matches/scoring/LiveScoring.tsx', content);

