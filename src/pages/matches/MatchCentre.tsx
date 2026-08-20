import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Match } from '../../types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, Key, Copy, CheckCircle2, MonitorPlay } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { createScoringCode } from '../../lib/scoring/auth';
import { MatchAdminPanel } from './MatchAdminPanel';
import { SummaryTab } from './tabs/SummaryTab';
import { AnalyticsTab } from './tabs/AnalyticsTab';
import { ScorecardTab } from './tabs/ScorecardTab';
import { CommentaryTab } from './tabs/CommentaryTab';
import { SquadsTab } from './tabs/SquadsTab';
import { NetworkStatus } from '../../components/NetworkStatus';
import { ShareButton } from '../../components/ui/ShareButton';
import { logAudit } from '../../lib/audit';

export function MatchCentre() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ANALYTICS');
  const [hasPendingWrites, setHasPendingWrites] = useState(false);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Real-time listener for the Match document
    const unsubMatch = onSnapshot(doc(db, 'matches', id), async (docSnap) => {
      setHasPendingWrites(docSnap.metadata.hasPendingWrites);
      
      if (docSnap.exists()) {
        const m = { id: docSnap.id, ...docSnap.data() } as Match;
        setMatch(m);
        
        // Only fetch admin rights once if user is present
        if (user && m.tournamentId && !isAdmin) {
          try {
            const tSnap = await getDoc(doc(db, 'tournaments', m.tournamentId));
            if (tSnap.exists() && tSnap.data().hostId === user.uid) {
              setIsAdmin(true);
            } else {
              const uSnap = await getDoc(doc(db, 'users', user.uid));
              if (uSnap.exists()) {
                const roles = uSnap.data().roles || [];
                if (roles.includes('SUPER_ADMIN') ) {
                  setIsAdmin(true);
                }
              }
            }
          } catch (err) {
            console.error('Error fetching admin status', err);
          }
        }
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching match:", error);
      setLoading(false);
    });

    return () => unsubMatch();
  }, [id, user, isAdmin]);

  const handleGenerateScoringCode = async () => {
    if (!match) return;
    try {
      const code = await createScoringCode(match.id, match.tournamentId, 'SCORER');
      logAudit(user?.uid || '', 'ACCESS_CODE_CREATED', { matchId: match.id, tournamentId: match.tournamentId, metadata: { code } });
      setGeneratedCode(code);
      setCopied(false);
    } catch (e) {
      console.error(e);
      alert('Failed to generate scoring access code.');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-foreground">Match not found</h2>
        <Link to="/matches" className="text-primary hover:underline mt-4 inline-block">Return to Matches</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <Link to="/matches" className="p-2 -ml-2 text-foreground-muted hover:text-foreground transition-colors rounded-full hover:bg-surface-hover">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <span className="text-sm font-medium text-primary">Match Centre</span>
        </div>
        
        <div className="flex items-center gap-3">
          <Link to={`/matches/${id}/board`} className="hidden sm:flex items-center px-3 py-1.5 bg-surface-hover text-foreground-muted hover:text-primary border border-border rounded-lg text-sm font-bold transition-colors">
            <MonitorPlay className="w-4 h-4 mr-2" />
            Board
          </Link>
          <ShareButton 
            title={`${match.team1Name} vs ${match.team2Name}`} 
            text={`Catch the live action between ${match.team1Name} and ${match.team2Name} on CRICTIFY!`} 
          />
          <NetworkStatus hasPendingWrites={hasPendingWrites} />
          {isAdmin && (
            <Link to={`/scoring/${match.id}`}>
              <Button variant="outline" size="sm">
                Open Scoring Console
              </Button>
            </Link>
          )}
        </div>
      </div>

      {isAdmin && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-foreground">Match Administration</h3>
              <p className="text-xs text-foreground-muted">Generate a secure code to delegate scoring to another device or user.</p>
            </div>
            
            {!generatedCode ? (
              <Button size="sm" onClick={handleGenerateScoringCode} className="shrink-0">
                <Key className="w-4 h-4 mr-2" />
                Generate Scorer Code
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <code className="px-3 py-1.5 bg-surface border border-border rounded font-mono text-sm tracking-widest font-bold">
                  {generatedCode}
                </code>
                <Button size="sm" variant="outline" onClick={copyToClipboard}>
                  {copied ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            )}
          </CardContent>
          <MatchAdminPanel matchId={match.id} match={match} />
        </Card>
      )}

      
      {/* Dark Theme Score Header matching reference UI */}
      <Card className="bg-[#1a1c23] border-[#2a2d35] overflow-hidden mb-6 rounded-2xl shadow-lg">
        <CardContent className="p-0">
          <div className="bg-[#21242d] px-6 py-3 border-b border-[#2a2d35] flex items-center gap-2">
            <span className="text-[#00e676] text-sm font-semibold tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00e676] animate-pulse"></span>
              {match.status === 'LIVE' ? 'Live Match' : match.status}
            </span>
            <span className="text-[#6b7280] text-sm mx-2">|</span>
            <span className="text-white text-sm font-medium">{match.team1Name} vs {match.team2Name}</span>
            <span className="text-[#6b7280] text-sm mx-2">|</span>
            <span className="text-[#9ca3af] text-sm">{match.matchType || 'ODI'}</span>
          </div>
          
          <div className="p-8 flex justify-between items-center bg-gradient-to-b from-[#1a1c23] to-[#15171e]">
            {/* Team 1 */}
            <div className="flex items-center gap-4 w-1/3">
              <div className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center overflow-hidden shrink-0 border-2 border-transparent">
                {match.team1Logo ? (
                  <img src={match.team1Logo} alt={match.team1ShortName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#2a2d35] text-white flex items-center justify-center font-bold text-sm">
                    {match.team1ShortName || match.team1Name.substring(0, 3).toUpperCase()}
                  </div>
                )}
              </div>
              <h2 className="text-3xl font-extrabold text-white tracking-wider">{match.team1ShortName || match.team1Name.substring(0, 3).toUpperCase()}</h2>
            </div>
            
            {/* Scores Center */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="flex items-center justify-center gap-6">
                <div className="text-right">
                  <div className="text-3xl font-black text-[#00e676] tracking-tight">{match.team1Score || '0/0'}</div>
                  <div className="text-xs text-[#9ca3af] font-medium mt-1">{match.team1Overs || '0.0'} Overs</div>
                </div>
                
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#21242d] border border-[#2a2d35] text-[#9ca3af] font-bold text-xs">
                  VS
                </div>
                
                <div className="text-left">
                  <div className="text-3xl font-black text-[#ff9800] tracking-tight">{match.team2Score || '0/0'}</div>
                  <div className="text-xs text-[#9ca3af] font-medium mt-1">{match.team2Overs || '0.0'} Overs</div>
                </div>
              </div>
              
              {match.result && (
                <div className="mt-4 px-4 py-1.5 bg-[#00e676]/10 text-[#00e676] text-sm font-semibold rounded-full border border-[#00e676]/20">
                  {match.result}
                </div>
              )}
            </div>
            
            {/* Team 2 */}
            <div className="flex items-center justify-end gap-4 w-1/3">
              <h2 className="text-3xl font-extrabold text-white tracking-wider">{match.team2ShortName || match.team2Name.substring(0, 3).toUpperCase()}</h2>
              <div className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center overflow-hidden shrink-0 border-2 border-transparent">
                {match.team2Logo ? (
                  <img src={match.team2Logo} alt={match.team2ShortName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#2a2d35] text-white flex items-center justify-center font-bold text-sm">
                    {match.team2ShortName || match.team2Name.substring(0, 3).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Tabs for detailed info */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto pb-2 -mb-2">
          <TabsList className="w-max sm:w-full sm:grid sm:grid-cols-6 mb-6 shrink-0">
            <TabsTrigger value="SUMMARY" isActive={activeTab === "SUMMARY"}>Overview</TabsTrigger>
            <TabsTrigger value="SCORECARD" isActive={activeTab === 'SCORECARD'}>Scorecard</TabsTrigger>
            <TabsTrigger value="COMMENTARY" isActive={activeTab === 'COMMENTARY'}>Commentary</TabsTrigger>
            <TabsTrigger value="SQUADS" isActive={activeTab === 'SQUADS'}>Squads</TabsTrigger>
            <TabsTrigger value="ANALYTICS" isActive={activeTab === "ANALYTICS"}>Dashboard</TabsTrigger>
            <TabsTrigger value="INFO" isActive={activeTab === 'INFO'}>Info</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="SUMMARY" activeValue={activeTab}>
          <SummaryTab match={match} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="SCORECARD" activeValue={activeTab}>
          <ScorecardTab match={match} />
        </TabsContent>

        <TabsContent value="COMMENTARY" activeValue={activeTab}>
          <CommentaryTab match={match} />
        </TabsContent>

        <TabsContent value="SQUADS" activeValue={activeTab}>
          <SquadsTab match={match} />
        </TabsContent>

        <TabsContent value="ANALYTICS" activeValue={activeTab}>
          <AnalyticsTab match={match} />
        </TabsContent>

        <TabsContent value="INFO" activeValue={activeTab}>
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-foreground-muted font-medium uppercase">Date</p>
                  <p className="text-sm font-medium text-foreground">{new Date(match.scheduledAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-muted font-medium uppercase">Venue</p>
                  <p className="text-sm font-medium text-foreground">{match.venue || 'TBA'}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-muted font-medium uppercase">Toss</p>
                  <p className="text-sm font-medium text-foreground">{match.tossWinnerId ? `${match.tossDecision}` : 'Not yet flipped'}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-muted font-medium uppercase">Status</p>
                  <p className="text-sm font-medium text-foreground">{match.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
