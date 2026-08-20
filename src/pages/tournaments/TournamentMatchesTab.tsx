import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Tournament, Match, TournamentTeam } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Calendar, Trash2, Plus, ShieldAlert, AlertTriangle, Info, Edit } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Link } from 'react-router-dom';
import { validateFixtures, ValidationResult } from '../../lib/fixtureValidation';

interface Props {
  tournament: Tournament;
  isHostOrAdmin: boolean;
}

export function TournamentMatchesTab({ tournament, isHostOrAdmin }: Props) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournamentTeams, setTournamentTeams] = useState<TournamentTeam[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  
  const [previewMatches, setPreviewMatches] = useState<Match[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  
  // Custom Match Form
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [customMatch, setCustomMatch] = useState({
    team1Id: '',
    team2Id: '',
    matchType: 'Custom Match',
    date: new Date().toISOString().split('T')[0]
  });
  
  const loadMatches = async () => {
    try {
      const q = query(collection(db, 'matches'), orderBy('scheduledAt', 'asc'));
      const snap = await getDocs(q);
      const allMatches = snap.docs.map(d => d.data() as Match);
      setMatches(allMatches.filter(m => m.tournamentId === tournament.id));
      
      const tSnap = await getDocs(collection(db, `tournaments/${tournament.id}/teams`));
      setTournamentTeams(tSnap.docs.map(d => d.data() as TournamentTeam));
      
      const gSnap = await getDocs(collection(db, `tournaments/${tournament.id}/groups`));
      setGroups(gSnap.docs.map(d => d.data()).sort((a, b) => a.displayOrder - b.displayOrder));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [tournament.id]);

  
  
  const generateFixtures = async () => {
    if (tournamentTeams.length < 2) {
      alert('Need at least 2 teams to generate fixtures.');
      return;
    }
    
    setGenerating(true);
    try {
      const newMatches: Match[] = [];
      const now = Date.now();
      const baseDate = tournament.startDate || now;
      
      const format = tournament.format || 'Round Robin';
      const shouldGenerateLeague = true;
      const isDouble = format === 'Double Round Robin';
      
      let teamsByGroup: Record<string, TournamentTeam[]> = {};
      
      if (groups.length > 0) {
         groups.forEach(g => {
            const gTeams = tournamentTeams.filter(t => g.teamIds.includes(t.id));
            // Sort teams by joinedAt to assign them sequential numbers consistently
            gTeams.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
            teamsByGroup[g.id] = gTeams;
         });
      } else {
         const allTeams = [...tournamentTeams].sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
         teamsByGroup['Default'] = allTeams;
      }
      
      if (shouldGenerateLeague) {
        let allGroupMatches: { normal: any[], reverse: any[] }[] = [];

        Object.entries(teamsByGroup).forEach(([groupId, groupTeams]) => {
          if (groupTeams.length < 2) return;
          
          const groupName = groups.find(g => g.id === groupId)?.name || 'Default';
          
          // Standard Round Robin Circle Method
          const numTeams = groupTeams.length;
          const isOdd = numTeams % 2 !== 0;
          const teamsArr = [...groupTeams];
          
          if (isOdd) {
             teamsArr.push({ id: 'BYE', name: 'BYE' } as any); // Dummy bye team
          }
          
          const totalRounds = teamsArr.length - 1;
          const matchesPerRound = teamsArr.length / 2;
          
          const groupNormal = [];
          const groupReverse = [];

          for (let round = 0; round < totalRounds; round++) {
             for (let matchIdx = 0; matchIdx < matchesPerRound; matchIdx++) {
                const homeIdx = (round + matchIdx) % (teamsArr.length - 1);
                let awayIdx = (teamsArr.length - 1 - matchIdx + round) % (teamsArr.length - 1);
                
                if (matchIdx === 0) {
                   awayIdx = teamsArr.length - 1; // Last team stays stationary
                }
                
                const t1 = teamsArr[homeIdx];
                const t2 = teamsArr[awayIdx];
                
                if (t1.id === 'BYE' || t2.id === 'BYE') continue; // Skip byes
                
                // Swap home/away for even rounds for the stationary team to alternate
                let home = t1;
                let away = t2;
                if (matchIdx === 0 && round % 2 !== 0) {
                   home = t2;
                   away = t1;
                }

                const exists = matches.some(m => 
                   (m.team1Id === home.id && m.team2Id === away.id) || 
                   (m.team1Id === away.id && m.team2Id === home.id)
                );
                
                if (!exists) {
                  groupNormal.push({
                    id: uuidv4(),
                    tournamentId: tournament.id,
                    matchType: groupName === 'Default' ? 'League Match' : `${groupName} - Match`,
                    groupId: groupName !== 'Default' ? groupId: null,
                    team1Id: home.id,
                    team2Id: away.id,
                    team1Name: home.name,
                    team2Name: away.name,
                    team1ShortName: home.shortName,
                    team2ShortName: away.shortName,
                    team1Logo: home.logoUrl || null,
                    team2Logo: away.logoUrl || null,
                    status: 'UPCOMING',
                    scheduledAt: 0, // Set later
                    createdAt: now,
                    overs: tournament.overs
                  });
                  
                  if (isDouble) {
                    groupReverse.push({
                      id: uuidv4(),
                      tournamentId: tournament.id,
                      matchType: groupName === 'Default' ? 'League Match (Reverse)' : `${groupName} - Match (Reverse)`,
                      groupId: groupName !== 'Default' ? groupId: null,
                      team1Id: away.id,
                      team2Id: home.id,
                      team1Name: away.name,
                      team2Name: home.name,
                      team1ShortName: away.shortName,
                      team2ShortName: home.shortName,
                      team1Logo: away.logoUrl || null,
                      team2Logo: home.logoUrl || null,
                      status: 'UPCOMING',
                      scheduledAt: 0, // Set later
                      createdAt: now,
                      overs: tournament.overs
                    });
                  }
                }
             }
          }
          allGroupMatches.push({ normal: groupNormal, reverse: groupReverse });
        });

        // Interleave matches across groups
        let matchOffset = 0;
        
        // 1. Interleave normal matches
        let maxNormal = Math.max(...allGroupMatches.map(g => g.normal.length), 0);
        for (let i = 0; i < maxNormal; i++) {
           for (let g = 0; g < allGroupMatches.length; g++) {
               if (i < allGroupMatches[g].normal.length) {
                   const m = allGroupMatches[g].normal[i];
                   m.scheduledAt = baseDate + (matchOffset * 86400000);
                   newMatches.push(m);
                   matchOffset++;
               }
           }
        }
        
        // 2. Interleave reverse matches
        let maxReverse = Math.max(...allGroupMatches.map(g => g.reverse.length), 0);
        for (let i = 0; i < maxReverse; i++) {
           for (let g = 0; g < allGroupMatches.length; g++) {
               if (i < allGroupMatches[g].reverse.length) {
                   const m = allGroupMatches[g].reverse[i];
                   m.scheduledAt = baseDate + (matchOffset * 86400000);
                   newMatches.push(m);
                   matchOffset++;
               }
           }
        }
      }

      if (newMatches.length === 0) {
        alert('No new fixtures to generate. All combinations exist.');
        setGenerating(false);
        return;
      }
      
      const valResult = validateFixtures(newMatches, matches);
      setValidation(valResult);
      setPreviewMatches(newMatches);
      setShowPreview(true);
      
    } catch (err) {
      console.error(err);
      alert('Failed to generate fixtures');
    } finally {
      setGenerating(false);
    }
  };


  const confirmSaveFixtures = async () => {
    try {
      await Promise.all(previewMatches.map(m => setDoc(doc(db, 'matches', m.id), m)));
      setMatches([...matches, ...previewMatches].sort((a, b) => a.scheduledAt - b.scheduledAt));
      alert(`Saved ${previewMatches.length} new matches!`);
      setShowPreview(false);
      setPreviewMatches([]);
    } catch (err) {
      console.error(err);
      alert('Failed to save fixtures');
    }
  };


  
  const handleEditMatch = (match: Match) => {
    setEditingMatchId(match.id);
    setCustomMatch({
      team1Id: match.team1Id,
      team2Id: match.team2Id,
      matchType: match.matchType || '',
      date: new Date(match.scheduledAt).toISOString().split('T')[0]
    });
    setIsAddingCustom(true);
  };

  
  const handleAddCustomMatch = async () => {
    if (!customMatch.team1Id || !customMatch.team2Id) return;
    if (customMatch.team1Id === customMatch.team2Id) {
      alert("Please select different teams.");
      return;
    }

    const t1 = tournamentTeams.find(t => t.id === customMatch.team1Id) || { id: 'TBD1', name: 'TBD', shortName: 'TBD', logoUrl: '' };
    const t2 = tournamentTeams.find(t => t.id === customMatch.team2Id) || { id: 'TBD2', name: 'TBD', shortName: 'TBD', logoUrl: '' };

    const newMatch: Match = {
      ...(editingMatchId ? matches.find(m => m.id === editingMatchId) : {}),
      id: editingMatchId || uuidv4(),
      tournamentId: tournament.id,
      matchType: customMatch.matchType,
      team1Id: t1.id,
      team2Id: t2.id,
      team1Name: t1.name,
      team2Name: t2.name,
      team1ShortName: t1.shortName,
      team2ShortName: t2.shortName,
      team1Logo: t1.logoUrl || null,
      team2Logo: t2.logoUrl || null,
      status: editingMatchId ? (matches.find(m => m.id === editingMatchId)?.status || 'UPCOMING') : 'UPCOMING',
      scheduledAt: new Date(customMatch.date).getTime(),
      createdAt: editingMatchId ? (matches.find(m => m.id === editingMatchId)?.createdAt || Date.now()) : Date.now(),
      overs: tournament.overs
    } as Match;

    // Only validate if it's a new match or we are changing teams (skip warning for same teams)
    if (!editingMatchId || matches.find(m => m.id === editingMatchId)?.team1Id !== newMatch.team1Id || matches.find(m => m.id === editingMatchId)?.team2Id !== newMatch.team2Id) {
      const valResult = validateFixtures([newMatch], matches.filter(m => m.id !== editingMatchId));
      if (!valResult.valid) {
        alert("Validation Failed:\n" + valResult.errors.join("\n"));
        return;
      }
      if (valResult.warnings.length > 0) {
        if (!window.confirm("Validation Warnings:\n" + valResult.warnings.join("\n") + "\n\nDo you still want to proceed?")) {
          return;
        }
      }
    }

    try {
      if (editingMatchId) {
        await updateDoc(doc(db, 'matches', newMatch.id), newMatch as any);
        setMatches(matches.map(m => m.id === editingMatchId ? newMatch : m).sort((a, b) => a.scheduledAt - b.scheduledAt));
      } else {
        await setDoc(doc(db, 'matches', newMatch.id), newMatch);
        setMatches([...matches, newMatch].sort((a, b) => a.scheduledAt - b.scheduledAt));
      }
      setIsAddingCustom(false);
      setEditingMatchId(null);
      setCustomMatch({ team1Id: '', team2Id: '', matchType: 'Custom Match', date: new Date().toISOString().split('T')[0] });
    } catch (err) {
      console.error(err);
      alert('Failed to save match');
    }
  };


  const handleRemoveMatch = async (matchId: string) => {
    if (!window.confirm('Delete this match?')) return;
    try {
      await deleteDoc(doc(db, 'matches', matchId));
      setMatches(matches.filter(m => m.id !== matchId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-4 text-center">Loading matches...</div>;

  return (
    <div className="space-y-6">
      <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <CardTitle>Matches & Fixtures</CardTitle>
        {isHostOrAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setIsAddingCustom(true); setEditingMatchId(null); setCustomMatch({ team1Id: '', team2Id: '', matchType: 'Custom Match', date: new Date().toISOString().split('T')[0] }); }} size="sm">
              <Plus className="w-4 h-4 mr-2" /> Add Match
            </Button>
            <Button onClick={generateFixtures} isLoading={generating} size="sm">
              Auto Generate Fixtures
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        
        {isAddingCustom && (
          <div className="bg-surface-hover p-4 rounded-xl border border-border flex flex-col gap-4">
            <h4 className="font-bold text-sm">{editingMatchId ? 'Edit Match' : 'Manually Add Match'}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
               <div className="space-y-1">
                <label className="text-sm font-medium">Team 1</label>
                <select className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm" value={customMatch.team1Id} onChange={e => setCustomMatch({...customMatch, team1Id: e.target.value})}>
                  <option value="">-- Select Team --</option>
                  <option value="TBD1">TBD</option>
                  {tournamentTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Team 2</label>
                <select className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm" value={customMatch.team2Id} onChange={e => setCustomMatch({...customMatch, team2Id: e.target.value})}>
                  <option value="">-- Select Team --</option>
                  <option value="TBD2">TBD</option>
                  {tournamentTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Match Type</label>
                <input type="text" className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm" value={customMatch.matchType} onChange={e => setCustomMatch({...customMatch, matchType: e.target.value})} placeholder="e.g. Final" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Date</label>
                <input type="date" className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm" value={customMatch.date} onChange={e => setCustomMatch({...customMatch, date: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setIsAddingCustom(false); setEditingMatchId(null); setCustomMatch({ team1Id: '', team2Id: '', matchType: 'Custom Match', date: new Date().toISOString().split('T')[0] }); }}>Cancel</Button>
              <Button onClick={handleAddCustomMatch} disabled={!customMatch.team1Id || !customMatch.team2Id}>Save Match</Button>
            </div>
          </div>
        )}

        {matches.length === 0 ? (
           <div className="text-center py-12 text-foreground-muted border border-dashed border-border rounded-xl">
             No matches scheduled yet.
           </div>
        ) : (
          <div className="space-y-4">
            {matches.map(match => (
              <div key={match.id} className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border border-border bg-surface gap-4">
                <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1 min-w-0 w-full">
                  <div className="text-xs font-bold text-primary mb-2 uppercase tracking-wider">
                    {match.matchType || 'Match'} • {new Date(match.scheduledAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-4 w-full">
                    <div className="flex flex-col items-center gap-1 w-20">
                      {match.team1Logo ? (
                        <img loading="lazy" src={match.team1Logo} alt={match.team1ShortName || match.team1Name} className="w-10 h-10 object-contain bg-white rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-surface-hover rounded flex items-center justify-center text-xs font-bold text-center leading-tight overflow-hidden text-ellipsis whitespace-nowrap p-1">{match.team1ShortName || match.team1Name.substring(0,3)}</div>
                      )}
                      <span className="text-xs font-bold text-center leading-tight line-clamp-2">{match.team1ShortName || match.team1Name}</span>
                    </div>
                    <div className="text-sm font-bold text-foreground-muted px-2">VS</div>
                    <div className="flex flex-col items-center gap-1 w-20">
                      {match.team2Logo ? (
                        <img loading="lazy" src={match.team2Logo} alt={match.team2ShortName || match.team2Name} className="w-10 h-10 object-contain bg-white rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-surface-hover rounded flex items-center justify-center text-xs font-bold text-center leading-tight overflow-hidden text-ellipsis whitespace-nowrap p-1">{match.team2ShortName || match.team2Name.substring(0,3)}</div>
                      )}
                      <span className="text-xs font-bold text-center leading-tight line-clamp-2">{match.team2ShortName || match.team2Name}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-row sm:flex-col items-center justify-end gap-2 shrink-0">
                  
                  <div className={`text-xs font-bold px-2 py-1 rounded w-24 text-center ${match.status === 'LIVE' ? 'bg-error/10 text-error' : match.status === 'COMPLETED' ? 'bg-success/10 text-success' : 'bg-surface-hover text-foreground-muted'}`}>
                    {match.status}
                  </div>
                  
                  <div className="flex gap-2 w-full justify-center sm:justify-end mt-2 sm:mt-0">
                    <Link to={`/matches/${match.id}`} className="text-xs font-bold px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                      {match.status === 'COMPLETED' ? 'Scorecard' : 'Match Centre'}
                    </Link>
                    {isHostOrAdmin && match.status !== 'COMPLETED' && (
                      <Link to={`/matches/${match.id}/scoring`} className="text-xs font-bold px-3 py-1.5 rounded bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors">
                        Score Match
                      </Link>
                    )}
                  </div>
                  
                  {isHostOrAdmin && (

                    
                    <div className="flex gap-1">
                      <button onClick={() => handleEditMatch(match)} className="p-2 text-foreground-muted hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit Match">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveMatch(match.id); }} className="p-2 text-foreground-muted hover:text-error hover:bg-error/10 rounded transition-colors" title="Delete Match">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

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
    </div>
  );
}
