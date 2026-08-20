const fs = require('fs');
let code = fs.readFileSync('src/pages/matches/scoring/LiveScoring.tsx', 'utf8');

const modalCode = `
      <Modal isOpen={!innings.currentBowlerId && innings.status !== 'COMPLETED'} onClose={() => {}} title="Select New Bowler">
        <div className="space-y-4">
          <div className="p-3 bg-primary/10 text-primary rounded-lg text-sm font-bold border border-primary/20">
            Over completed. Please select the next bowler.
          </div>
          <div className="space-y-1">
            <input type="text" placeholder="Bowler Name" className="w-full p-2 border rounded text-sm bg-background" value={newBowlerName} onChange={e => setNewBowlerName(e.target.value)} />
            <label className="flex items-center gap-1 text-xs text-foreground-muted">
              <input type="checkbox" checked={isImpactPlayer} onChange={e => setIsImpactPlayer(e.target.checked)} /> Substitute/Impact Player
            </label>
          </div>
          <div className="flex justify-end gap-2">
             <Button onClick={() => assignPlayer('BOWLER', newBowlerName)} disabled={!newBowlerName}>Start Over</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={extrasModalOpen} onClose={() => setExtrasModalOpen(false)} title="Extras Details">`;

code = code.replace(/<Modal isOpen=\{extrasModalOpen\} onClose=\{\(\) => setExtrasModalOpen\(false\)\} title="Extras Details">/, modalCode);
fs.writeFileSync('src/pages/matches/scoring/LiveScoring.tsx', code);
