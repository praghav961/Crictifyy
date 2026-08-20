import { useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

export function NotificationSettings() {
  const { preferences, loading, permission, requestPermission, updatePreferences } = useNotifications();
  const [requesting, setRequesting] = useState(false);

  if (loading) return <div className="p-8 text-center text-foreground-muted">Loading preferences...</div>;

  const handleToggle = (key: keyof typeof preferences) => {
    updatePreferences({ [key]: !preferences[key] });
  };

  const handleRequestPermission = async () => {
    setRequesting(true);
    await requestPermission();
    setRequesting(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-surface-hover rounded-lg border border-border">
            <div>
              <p className="font-bold text-foreground">Browser Permission</p>
              <p className="text-sm text-foreground-muted">
                {permission === 'granted' ? 'Notifications are enabled' : 
                 permission === 'denied' ? 'Notifications are blocked by your browser' : 
                 'Allow notifications to stay updated'}
              </p>
            </div>
            {permission !== 'granted' && (
              <button 
                onClick={handleRequestPermission}
                disabled={requesting || permission === 'denied'}
                className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg disabled:opacity-50"
              >
                {requesting ? 'Requesting...' : 'Enable Push'}
              </button>
            )}
            {permission === 'granted' && (
              <div className="px-4 py-2 bg-success/20 text-success font-bold rounded-lg flex items-center gap-2">
                <BellRing className="w-4 h-4" /> Enabled
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <p className="text-sm text-foreground-muted">Configure what you want to be notified about. Do not spam users with excessive notifications.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PreferenceToggle 
              label="Match Reminders" 
              description="Upcoming match alerts" 
              checked={preferences.matchReminder} 
              onChange={() => handleToggle('matchReminder')} 
            />
            <PreferenceToggle 
              label="Match Started" 
              description="When a match goes live" 
              checked={preferences.matchStarted} 
              onChange={() => handleToggle('matchStarted')} 
            />
            <PreferenceToggle 
              label="Wicket Fallen" 
              description="Crucial breakthroughs" 
              checked={preferences.wicket} 
              onChange={() => handleToggle('wicket')} 
            />
            <PreferenceToggle 
              label="Fifty Scored" 
              description="Player reaches 50 runs" 
              checked={preferences.fifty} 
              onChange={() => handleToggle('fifty')} 
            />
            <PreferenceToggle 
              label="Century Scored" 
              description="Player reaches 100 runs" 
              checked={preferences.century} 
              onChange={() => handleToggle('century')} 
            />
            <PreferenceToggle 
              label="Five Wicket Haul" 
              description="Bowler takes 5 wickets" 
              checked={preferences.fiveWicketHaul} 
              onChange={() => handleToggle('fiveWicketHaul')} 
            />
            <PreferenceToggle 
              label="Innings Completed" 
              description="End of an innings" 
              checked={preferences.inningsCompleted} 
              onChange={() => handleToggle('inningsCompleted')} 
            />
            <PreferenceToggle 
              label="Match Completed" 
              description="Final match results" 
              checked={preferences.matchCompleted} 
              onChange={() => handleToggle('matchCompleted')} 
            />
            <PreferenceToggle 
              label="Fixture Created" 
              description="New match scheduled" 
              checked={preferences.fixtureCreated} 
              onChange={() => handleToggle('fixtureCreated')} 
            />
            <PreferenceToggle 
              label="Tournament Updates" 
              description="Important announcements" 
              checked={preferences.tournamentUpdate} 
              onChange={() => handleToggle('tournamentUpdate')} 
            />
            <PreferenceToggle 
              label="Points Table" 
              description="Updates to standings" 
              checked={preferences.pointsTableUpdate} 
              onChange={() => handleToggle('pointsTableUpdate')} 
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PreferenceToggle({ label, description, checked, onChange }: { label: string, description: string, checked: boolean, onChange: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-surface hover:bg-surface-hover cursor-pointer transition-colors" onClick={onChange}>
      <div>
        <p className="font-bold text-sm text-foreground">{label}</p>
        <p className="text-xs text-foreground-muted">{description}</p>
      </div>
      <div
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-surface-hover border border-border'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </div>
    </div>
  );
}
