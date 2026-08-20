import { useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadImage } from '../../lib/uploadImage';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import { Player } from '../../types';
import { ArrowLeft, User, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CreatePlayer() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    dateOfBirth: '',
    role: 'BATSMAN' as Player['role'],
    battingStyle: '',
    bowlingStyle: '',
    jerseyNumber: '',
    bio: ''
  });

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let avatarUrl = '';
      if (photo) {
        avatarUrl = await uploadImage(photo, 'players/avatars');
      }

      const newPlayer: Omit<Player, 'id'> = {
        ...formData,
        avatarUrl,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const docRef = await addDoc(collection(db, 'players'), newPlayer);
      navigate(`/players/${docRef.id}`);
    } catch (err: any) {
      console.error(err);
      setError('Failed to create player profile. Ensure you have permissions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6">
      <div className="flex items-center space-x-4 mb-4">
        <Link to="/players" className="p-2 -ml-2 text-foreground-muted hover:text-foreground transition-colors rounded-full hover:bg-surface-hover">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <span className="text-xl font-bold text-foreground">Create Player</span>
      </div>

      <Card>
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-error/10 border border-error/20 text-error p-4 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Photo Upload */}
            <div className="flex flex-col items-center sm:items-start sm:flex-row gap-6">
              <div className="relative w-32 h-32 rounded-full overflow-hidden bg-surface-hover border-2 border-dashed border-border flex flex-col items-center justify-center shrink-0 group cursor-pointer">
                {photoPreview ? (
                  <img loading="lazy" src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-foreground-muted opacity-50" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-xs font-medium">
                  <Upload className="w-5 h-5 mb-1" />
                  Upload
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={handlePhotoChange}
                />
              </div>
              <div className="text-center sm:text-left flex flex-col justify-center">
                <h3 className="text-sm font-bold text-foreground">Player Photo</h3>
                <p className="text-xs text-foreground-muted mt-1">Recommended: Square image, max 2MB. JPG or PNG.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Full Name *</label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Virat Kohli" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Role *</label>
                <select 
                  className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value as Player['role']})}
                >
                  <option value="BATSMAN">Batsman</option>
                  <option value="BOWLER">Bowler</option>
                  <option value="ALL_ROUNDER">All Rounder</option>
                  <option value="WICKET_KEEPER">Wicket Keeper</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Phone</label>
                <Input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+1 234 567 890" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Date of Birth</label>
                <Input type="date" value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Batting Style</label>
                <select 
                  className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  value={formData.battingStyle}
                  onChange={e => setFormData({...formData, battingStyle: e.target.value})}
                >
                  <option value="">Select Style</option>
                  <option value="Right-hand bat">Right-hand bat</option>
                  <option value="Left-hand bat">Left-hand bat</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Bowling Style</label>
                <Input value={formData.bowlingStyle} onChange={e => setFormData({...formData, bowlingStyle: e.target.value})} placeholder="e.g. Right-arm fast" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Jersey Number</label>
                <Input type="number" value={formData.jerseyNumber} onChange={e => setFormData({...formData, jerseyNumber: e.target.value})} placeholder="e.g. 18" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Bio</label>
              <textarea 
                className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                value={formData.bio}
                onChange={e => setFormData({...formData, bio: e.target.value})}
                placeholder="A short biography or notable achievements..."
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button type="submit" isLoading={loading} className="w-full sm:w-auto">
                Save Player Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
