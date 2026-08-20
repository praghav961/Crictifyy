const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', 'utf8');

// 1. Import validation service
const imports = `import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Tournament, Match, TournamentTeam } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Calendar, Trash2, Plus, ShieldAlert, AlertTriangle, Info } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { validateFixtures, ValidationResult } from '../../lib/fixtureValidation';`;

code = code.replace(/import .* 'react';[\s\S]*?import \{ v4 as uuidv4 \} from 'uuid';/, imports);

// 2. Add validation state
const stateAdd = `
  const [previewMatches, setPreviewMatches] = useState<Match[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);`;
code = code.replace(/const \[previewMatches, setPreviewMatches\] = useState<Match\[\]>\(\[\]\);\n\s*const \[showPreview, setShowPreview\] = useState\(false\);/, stateAdd);

// 3. Update generateFixtures to run validation
code = code.replace(/setPreviewMatches\(newMatches\);\s*setShowPreview\(true\);/, `
      const valResult = validateFixtures(newMatches, matches);
      setValidation(valResult);
      setPreviewMatches(newMatches);
      setShowPreview(true);`);

// 4. Update handleAddCustomMatch to validate
const customMatchVal = `
    const newMatch: Match = {
      id: uuidv4(),
      tournamentId: tournament.id,
      matchType: customMatch.matchType,
      team1Id: t1.id,
      team2Id: t2.id,
      team1Name: t1.name,
      team2Name: t2.name,
      team1ShortName: t1.shortName,
      team2ShortName: t2.shortName,
      team1Logo: t1.logoUrl || undefined,
      team2Logo: t2.logoUrl || undefined,
      status: 'UPCOMING',
      scheduledAt: new Date(customMatch.date).getTime(),
      createdAt: Date.now()
    };

    const valResult = validateFixtures([newMatch], matches);
    if (!valResult.valid) {
      alert("Validation Failed:\\n" + valResult.errors.join("\\n"));
      return;
    }
    if (valResult.warnings.length > 0) {
      if (!window.confirm("Validation Warnings:\\n" + valResult.warnings.join("\\n") + "\\n\\nDo you still want to proceed?")) {
        return;
      }
    }
`;

code = code.replace(/const newMatch: Match = \{[\s\S]*?createdAt: Date\.now\(\)\n\s*\};/, customMatchVal);


// 5. Wrap return and add preview UI
const previewUI = `
      {showPreview && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface-hover rounded-t-xl">
              <h3 className="font-bold text-lg">Fixture Preview ({previewMatches.length} Matches)</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>Cancel</Button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              
              {validation && !validation.valid && (
                <div className="bg-error/10 border border-error/50 p-4 rounded-lg flex gap-3">
                   <ShieldAlert className="w-5 h-5 text-error shrink-0" />
                   <div>
                     <h4 className="font-bold text-error mb-2">Validation Errors (Cannot Save)</h4>
                     <ul className="list-disc pl-4 space-y-1 text-sm">
                       {validation.errors.map((e, i) => <li key={i}>{e}</li>)}
                     </ul>
                   </div>
                </div>
              )}
              
              {validation && validation.warnings.length > 0 && (
                <div className="bg-warning/10 border border-warning/50 p-4 rounded-lg flex gap-3">
                   <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
                   <div>
                     <h4 className="font-bold text-warning mb-2">Warnings (Please Review)</h4>
                     <ul className="list-disc pl-4 space-y-1 text-sm">
                       {validation.warnings.map((w, i) => <li key={i}>{w}</li>)}
                     </ul>
                   </div>
                </div>
              )}

              <div className="space-y-2">
                {previewMatches.map((m, i) => (
                  <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-surface rounded-lg border border-border hover:border-primary/50 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-primary">{m.matchType}</span>
                      <span className="text-sm text-foreground-muted">{new Date(m.scheduledAt).toLocaleString()}</span>
                    </div>
                    <div className="font-bold text-center flex-1 my-2 sm:my-0">
                      {m.team1Name} <span className="text-foreground-muted mx-2">vs</span> {m.team2Name}
                    </div>
                    {m.venue && (
                       <div className="text-xs font-medium text-foreground-muted bg-surface-hover px-2 py-1 rounded">
                         {m.venue}
                       </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-2 bg-surface-hover rounded-b-xl">
              <Button variant="outline" onClick={() => setShowPreview(false)}>Discard</Button>
              <Button onClick={confirmSaveFixtures} disabled={!validation?.valid}>Confirm & Save Fixtures</Button>
            </div>
          </div>
        </div>
      )}
`;

code = code.replace(/return \(\s*<Card>/, 'return (\n    <div className="space-y-6">\n      <Card>');
code = code.replace(/<\/Card>\s*\);/, '</Card>\n' + previewUI + '    </div>\n  );');

fs.writeFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', code);
