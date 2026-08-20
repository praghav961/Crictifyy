import { useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadImage } from '../../lib/uploadImage';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { Tournament, TournamentFormat, TournamentStatus } from '../../types';
import { ArrowLeft, Trophy, Upload, ShieldAlert, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { logAudit } from '../../lib/audit';

export function CreateTournament() {
  const { user, profile, hasRole } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    venue: '',
    organizer: '',
    contact: '',
    numberOfTeams: '',
    playersPerTeam: '11',
    overs: '20',
    format: 'Round Robin' as TournamentFormat,
    visibility: 'PUBLIC' as 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY',
    status: 'UPCOMING' as TournamentStatus,
  });

  const canHost = profile?.canHostTournament || hasRole('TOURNAMENT_ADMIN') || hasRole('SUPER_ADMIN');

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !canHost) return;
        
    setError('');
    setLoading(true);

    try {
      let logoUrl = '';
      if (logo) {
        logoUrl = await uploadImage(logo, 'tournaments/logos');
      }

      const newTournament: Omit<Tournament, 'id'> = {
        name: formData.name,
        description: formData.description,
        hostId: user.uid,
        status: formData.status,
        logoUrl,
        startDate: formData.startDate ? new Date(formData.startDate).getTime() : Date.now(),
        endDate: formData.endDate ? new Date(formData.endDate).getTime() : null,
        venue: formData.venue,
        organizer: formData.organizer,
        contact: formData.contact,
        numberOfTeams: formData.numberOfTeams ? parseInt(formData.numberOfTeams, 10) : null,
        playersPerTeam: formData.playersPerTeam ? parseInt(formData.playersPerTeam, 10) : null,
        overs: formData.overs ? parseInt(formData.overs, 10) : null,
        format: formData.format,
        visibility: formData.visibility,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const docRef = await addDoc(collection(db, 'tournaments'), newTournament);
      logAudit(user.uid, 'TOURNAMENT_CREATED', { tournamentId: docRef.id });
      navigate(`/tournaments/${docRef.id}`);
    } catch (err: any) {
      console.error(err);
      setError('Failed to create tournament. Ensure you have hosting permissions.');
    } finally {
      setLoading(false);
    }
  };

  const requestAccess = () => {
    // Basic mock of requesting access for this phase.
    alert('Hosting access request submitted to the administrators. You will be notified once reviewed.');
  };

  if (!canHost) {
    return (
      <div className="max-w-xl mx-auto w-full space-y-6">
        <div className="flex items-center space-x-4 mb-4">
          <Link to="/tournaments" className="p-2 -ml-2 text-foreground-muted hover:text-foreground transition-colors rounded-full hover:bg-surface-hover">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <span className="text-xl font-bold text-foreground">Host Tournament</span>
        </div>
        <Card>
          <CardContent className="p-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mb-6">
              <Lock className="w-8 h-8 text-error" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Hosting Access Required</h2>
            <p className="text-foreground-muted mb-8 max-w-sm leading-relaxed">
              You currently do not have the required permissions to host and manage a tournament on this platform. 
            </p>
            <Button onClick={requestAccess} className="w-full sm:w-auto">
              Request Hosting Access
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6">
      <div className="flex items-center space-x-4 mb-4">
        <Link to="/tournaments" className="p-2 -ml-2 text-foreground-muted hover:text-foreground transition-colors rounded-full hover:bg-surface-hover">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <span className="text-xl font-bold text-foreground">Create Tournament</span>
      </div>

      <Card>
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-error/10 border border-error/20 text-error p-4 rounded-lg text-sm flex items-start">
                <ShieldAlert className="w-5 h-5 mr-2 shrink-0" />
                {error}
              </div>
            )}

            {/* Logo Upload */}
            <div className="flex flex-col items-center sm:items-start sm:flex-row gap-6">
              <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-surface-hover border-2 border-dashed border-border flex flex-col items-center justify-center shrink-0 group cursor-pointer">
                {logoPreview ? (
                  <img loading="lazy" src={logoPreview} alt="Preview" className="w-full h-full object-contain bg-white" />
                ) : (
                  <Trophy className="w-12 h-12 text-foreground-muted opacity-50" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-xs font-medium">
                  <Upload className="w-5 h-5 mb-1" />
                  Upload Logo
                </div>
                <input 
                   type="file" 
                   accept="image/*" 
                   className="absolute inset-0 opacity-0 cursor-pointer" 
                   onChange={handleLogoChange}
                />
              </div>
              <div className="text-center sm:text-left flex flex-col justify-center">
                <h3 className="text-sm font-bold text-foreground">Tournament Logo</h3>
                <p className="text-xs text-foreground-muted mt-1">Recommended: Square format, PNG/JPG up to 2MB.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium text-foreground">Tournament Name *</label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Summer Premier League 2024" />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium text-foreground">Description</label>
                <textarea 
                  rows={3} 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Brief details about the tournament rules, prizes, etc."
                  className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Start Date *</label>
                <Input type="date" required value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">End Date</label>
                <Input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Format</label>
                <select 
                  value={formData.format} 
                  onChange={e => setFormData({...formData, format: e.target.value as any})}
                  className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                >
                  <option value="Round Robin">Round Robin</option>
                  <option value="Double Round Robin">Double Round Robin</option>
                  <option value="Group Stage">Group Stage</option>
                  <option value="Round Robin">Round Robin (Legacy)</option>
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Initial Status</label>
                <select 
                  value={formData.status} 
                  onChange={e => setFormData({...formData, status: e.target.value as TournamentStatus})}
                  className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                >
                  <option value="UPCOMING">Upcoming</option>
                  <option value="ONGOING">Ongoing</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Number of Teams</label>
                <Input type="number" min="2" value={formData.numberOfTeams} onChange={e => setFormData({...formData, numberOfTeams: e.target.value})} placeholder="e.g. 8" />
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Players per Team</label>
                <Input type="number" min="1" value={formData.playersPerTeam} onChange={e => setFormData({...formData, playersPerTeam: e.target.value})} placeholder="e.g. 11" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Overs per Innings</label>
                <Input type="number" min="1" value={formData.overs} onChange={e => setFormData({...formData, overs: e.target.value})} placeholder="e.g. 20" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Venue (Default)</label>
                <Input value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} placeholder="e.g. Central Stadium" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Organizer Name</label>
                <Input value={formData.organizer} onChange={e => setFormData({...formData, organizer: e.target.value})} placeholder="Organization or person name" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Contact Info</label>
                <Input value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} placeholder="Email or phone" />
              </div>

            </div>

            <div className="flex justify-end pt-4 border-t border-border mt-8">
              <Button type="submit" isLoading={loading} className="w-full sm:w-auto">
                <Trophy className="w-4 h-4 mr-2" />
                Create Tournament
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
