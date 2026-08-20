import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Shield, ArrowLeft } from 'lucide-react';

export function TournamentAdmin() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-4 mb-4">
        <Link to={`/tournaments/${id}`} className="p-2 -ml-2 text-foreground-muted hover:text-foreground transition-colors rounded-full hover:bg-surface-hover">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <span className="text-sm font-medium text-primary">Tournament Administration</span>
      </div>

      <Card className="border-error/20 bg-error/5">
        <CardHeader>
          <CardTitle className="flex items-center text-error">
            <Shield className="h-5 w-5 mr-2" /> Authorized Personnel Only
          </CardTitle>
        </CardHeader>
        <CardContent className="text-foreground">
          <p>This is the secure Tournament Administration area. Viewers cannot access this page.</p>
          <ul className="list-disc pl-5 mt-4 space-y-2 text-sm text-foreground-muted">
            <li>Tournament Settings & Rules</li>
            <li>Fixture Editing</li>
            <li>Sponsor Management</li>
            <li>Match Finalization</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
