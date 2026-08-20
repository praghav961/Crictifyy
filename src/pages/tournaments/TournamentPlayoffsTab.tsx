import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Tournament, Match, TournamentTeam, TournamentGroup } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Trophy, ArrowRight } from 'lucide-react';
import { useTournamentStats } from '../../hooks/useTournamentStats';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  tournament: Tournament;
  isHostOrAdmin: boolean;
}

export function TournamentPlayoffsTab({ tournament, isHostOrAdmin }: Props) {
  
  const { loading: statsLoading, teams } = useTournamentStats(tournament.id);
  const [matches, setMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<TournamentGroup[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [playoffMatches, setPlayoffMatches] = useState<Match[]>([]);


  
  useEffect(() => {
    const fetchMatches = async () => {
      const q = query(collection(db, 'matches'), orderBy('scheduledAt', 'asc'));
      const snap = await getDocs(q);
      const allMatches = snap.docs.map(d => d.data() as Match);
      setMatches(allMatches.filter(m => m.tournamentId === tournament.id));
      setLoadingMatches(false);
    };
    
    const fetchGroups = async () => {
      try {
        const snap = await getDocs(collection(db, `tournaments/${tournament.id}/groups`));
        setGroups(snap.docs.map(d => d.data() as TournamentGroup));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingGroups(false);
      }
    };
    
    fetchMatches();
    fetchGroups();
  }, [tournament.id]);

  if (statsLoading || loadingMatches || loadingGroups) {

    return <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>;
  }

  // Sort teams by points, then NRR
  const sortedTeams = [...teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.nrr - a.nrr;
  });

  
  const generatePreview = () => {
    let qualifiedTeams: any[] = [];
    
    if (groups.length > 0) {
       groups.forEach(g => {
          const groupTeams = teams.filter(t => g.teamIds.includes(t.id));
          groupTeams.sort((a, b) => {
             if (b.points !== a.points) return b.points - a.points;
             return b.nrr - a.nrr;
          });
          qualifiedTeams.push(...groupTeams.slice(0, g.qualificationSlots || 2));
       });
    } else {
       qualifiedTeams = sortedTeams.slice(0, 4);
    }
    
    if (qualifiedTeams.length < 4) {
      alert("Not enough teams to generate standard playoffs. Need at least 4 teams.");
      return;
    }
    
    const top4 = qualifiedTeams.slice(0, 4);
    
    // Check if Playoffs already exist
    const existingPlayoffs = matches.filter(m => m.matchType === 'Qualifier 1' || m.matchType === 'Eliminator' || m.matchType === 'Qualifier 2' || m.matchType === 'Final');
    if (existingPlayoffs.length > 0) {
      if (!window.confirm("Playoff matches already exist. Are you sure you want to regenerate them and overwrite current standings in the brackets?")) return;
    }

    const now = Date.now();
    const baseDate = tournament.endDate || now;

    const newMatches: Match[] = [
      {
        id: existingPlayoffs.find(m => m.matchType === 'Qualifier 1')?.id || uuidv4(),
        tournamentId: tournament.id,
        matchType: 'Qualifier 1',
        team1Id: top4[0].id,
        team2Id: top4[1].id,
        team1Name: top4[0].name,
        team2Name: top4[1].name,
        team1ShortName: top4[0].shortName,
        team2ShortName: top4[1].shortName,
        team1Logo: top4[0].logoUrl || null,
        team2Logo: top4[1].logoUrl || null,
        status: 'UPCOMING',
        scheduledAt: baseDate + 86400000,
        createdAt: now,
        overs: tournament.overs
      },
      {
        id: existingPlayoffs.find(m => m.matchType === 'Eliminator')?.id || uuidv4(),
        tournamentId: tournament.id,
        matchType: 'Eliminator',
        team1Id: top4[2].id,
        team2Id: top4[3].id,
        team1Name: top4[2].name,
        team2Name: top4[3].name,
        team1ShortName: top4[2].shortName,
        team2ShortName: top4[3].shortName,
        team1Logo: top4[2].logoUrl || null,
        team2Logo: top4[3].logoUrl || null,
        status: 'UPCOMING',
        scheduledAt: baseDate + 86400000 * 2,
        createdAt: now,
        overs: tournament.overs
      },
      {
        id: existingPlayoffs.find(m => m.matchType === 'Qualifier 2')?.id || uuidv4(),
        tournamentId: tournament.id,
        matchType: 'Qualifier 2',
        team1Id: 'TBD',
        team2Id: 'TBD',
        team1Name: 'Loser of Qualifier 1',
        team2Name: 'Winner of Eliminator',
        status: 'UPCOMING',
        scheduledAt: baseDate + 86400000 * 3,
        createdAt: now,
        overs: tournament.overs
      },
      {
        id: existingPlayoffs.find(m => m.matchType === 'Final')?.id || uuidv4(),
        tournamentId: tournament.id,
        matchType: 'Final',
        team1Id: 'TBD',
        team2Id: 'TBD',
        team1Name: 'Winner of Qualifier 1',
        team2Name: 'Winner of Qualifier 2',
        status: 'UPCOMING',
        scheduledAt: baseDate + 86400000 * 4,
        createdAt: now,
        overs: tournament.overs
      }
    ];

    setPlayoffMatches(newMatches);
    setShowPreview(true);
  };


  const confirmPlayoffs = async () => {
    setGenerating(true);
    try {
      await Promise.all(playoffMatches.map(m => setDoc(doc(db, 'matches', m.id), m, { merge: true })));
      alert("Playoff matches generated/updated successfully!");
      setShowPreview(false);
      setMatches(prev => {
        const others = prev.filter(p => !playoffMatches.find(pm => pm.id === p.id));
        return [...others, ...playoffMatches];
      });
    } catch(err) {
      console.error(err);
      alert("Failed to save playoff matches");
    } finally {
      setGenerating(false);
    }
  };

  const existingPlayoffs = matches.filter(m => m.matchType?.includes('Qualifier') || m.matchType?.includes('Eliminator') || m.matchType?.includes('Final'));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-warning" /> Playoff Generation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground-muted mb-4">
            Automatically determine the top 4 teams based on current standings (Points & NRR) and generate standard IPL-style Playoffs (Qualifier 1, Eliminator, Qualifier 2, Final).
          </p>
          {isHostOrAdmin && (
            <Button onClick={generatePreview} disabled={generating}>
              Generate Playoff Preview
            </Button>
          )}

          {showPreview && (
            <div className="mt-6 border border-border p-4 rounded-xl bg-surface-hover">
              <h3 className="font-bold text-lg mb-4">Qualification Preview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {playoffMatches.map(m => (
                  <div key={m.id} className="bg-surface p-3 rounded-lg border border-border flex flex-col items-center text-center">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider mb-2">{m.matchType}</span>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold flex-1">{m.team1Name}</span>
                      <span className="text-foreground-muted mx-2 text-xs">vs</span>
                      <span className="font-bold flex-1">{m.team2Name}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPreview(false)}>Cancel</Button>
                <Button onClick={confirmPlayoffs} disabled={generating}>Confirm & Save Playoffs</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {existingPlayoffs.length > 0 && !showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Current Playoff Bracket</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {existingPlayoffs.sort((a,b) => a.scheduledAt - b.scheduledAt).map(m => (
                <div key={m.id} className="bg-surface p-3 rounded-lg border border-border flex flex-col">
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-xs font-bold text-primary uppercase">{m.matchType}</span>
                     <span className="text-[10px] text-foreground-muted bg-surface-hover px-2 py-0.5 rounded">{m.status}</span>
                   </div>
                   <div className="flex items-center justify-between w-full">
                      <span className="font-bold flex-1 text-center">{m.team1Name}</span>
                      <span className="text-foreground-muted mx-2 text-xs">vs</span>
                      <span className="font-bold flex-1 text-center">{m.team2Name}</span>
                    </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
