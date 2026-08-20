import { useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadImage } from '../../lib/uploadImage';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import { Team } from '../../types';
import { ArrowLeft, Shield, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CreateTeam() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    coach: '',
    manager: '',
    city: '',
    teamColor: '#059669',
  });

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let logoUrl = '';
      if (logo) {
        logoUrl = await uploadImage(logo, 'teams/logos');
      }

      const newTeam: Omit<Team, 'id'> = {
        ...formData,
        logoUrl,
        squad: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const docRef = await addDoc(collection(db, 'teams'), newTeam);
      navigate(`/teams/${docRef.id}`);
    } catch (err: any) {
      console.error(err);
      setError('Failed to create team. Ensure you have permissions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6">
      <div className="flex items-center space-x-4 mb-4">
        <Link to="/teams" className="p-2 -ml-2 text-foreground-muted hover:text-foreground transition-colors rounded-full hover:bg-surface-hover">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <span className="text-xl font-bold text-foreground">Create Team</span>
      </div>

      <Card>
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-error/10 border border-error/20 text-error p-4 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Logo Upload */}
            <div className="flex flex-col items-center sm:items-start sm:flex-row gap-6">
              <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-surface-hover border-2 border-dashed border-border flex flex-col items-center justify-center shrink-0 group cursor-pointer">
                {logoPreview ? (
                  <img loading="lazy" src={logoPreview} alt="Preview" className="w-full h-full object-contain" />
                ) : (
                  <Shield className="w-12 h-12 text-foreground-muted opacity-50" />
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
                <h3 className="text-sm font-bold text-foreground">Team Logo</h3>
                <p className="text-xs text-foreground-muted mt-1">Recommended: Transparent PNG, max 2MB.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Team Name *</label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Mumbai Indians" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Short Name *</label>
                <Input required value={formData.shortName} onChange={e => setFormData({...formData, shortName: e.target.value.toUpperCase()})} placeholder="e.g. MI" maxLength={4} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">City/Home Ground</label>
                <Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="e.g. Mumbai" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Team Color</label>
                <div className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-1 overflow-hidden">
                   <input type="color" value={formData.teamColor} onChange={e => setFormData({...formData, teamColor: e.target.value})} className="h-full w-12 cursor-pointer border-0 p-0 bg-transparent" />
                   <span className="ml-3 self-center text-sm font-mono uppercase text-foreground-muted">{formData.teamColor}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Coach</label>
                <Input value={formData.coach} onChange={e => setFormData({...formData, coach: e.target.value})} placeholder="Head Coach name" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Manager</label>
                <Input value={formData.manager} onChange={e => setFormData({...formData, manager: e.target.value})} placeholder="Team Manager name" />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button type="submit" isLoading={loading} className="w-full sm:w-auto">
                Create Team
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
