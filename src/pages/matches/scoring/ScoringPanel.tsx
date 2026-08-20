import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Match } from '../../../types';
import { TossSetup } from './TossSetup';
import { InningsSetup } from './InningsSetup';
import { LiveScoring } from './LiveScoring';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Play, Settings, X, Activity } from 'lucide-react';


export function ScoringPanel({ match }: { match: Match }) {
  const navigate = useNavigate();
  const [showPreMatch, setShowPreMatch] = useState(!match.tossWinnerId);

  if (showPreMatch) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center uppercase tracking-widest text-primary">Crictify Scoring</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-black">{match.team1Name} vs {match.team2Name}</h2>
            <p className="text-foreground-muted font-bold text-sm">{match.venue || 'TBA'}</p>
            <p className="text-foreground-muted font-bold text-sm">Format: {match.overs} Overs</p>
            <div className="mt-4 inline-block px-3 py-1 bg-surface-hover rounded-full text-xs font-bold border border-border">
              Match Status: NOT STARTED
            </div>
          </div>
          
          <div className="space-y-3 pt-4">
            <Button className="w-full h-12 text-lg font-bold flex items-center justify-center gap-2" onClick={() => setShowPreMatch(false)}>
              <Play className="w-5 h-5" /> START MATCH
            </Button>
            <Button variant="outline" className="w-full h-12 text-lg font-bold flex items-center justify-center gap-2" onClick={() => navigate(`/matches/${match.id}`)}>
              <Settings className="w-5 h-5" /> MATCH SETTINGS
            </Button>
            <Button variant="ghost" className="w-full text-foreground-muted flex items-center justify-center gap-2" onClick={() => navigate('/')}>
              <X className="w-4 h-4" /> EXIT
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!match.tossWinnerId) {
    return <TossSetup match={match} />;
  }

  if (!match.currentInningId) {
    return <InningsSetup match={match} />;
  }

  return <LiveScoring match={match} />;
}
