import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadImage } from '../../lib/uploadImage';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import { Player } from '../../types';
import { ArrowLeft, User, Upload, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function EditPlayer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
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

  useEffect(() => {
    async function fetchPlayer() {
      if (!id) return;
      try {
        const docRef = doc(db, 'players', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Player;
          setFormData({
            name: data.name || '',
            phone: data.phone || '',
            dateOfBirth: data.dateOfBirth || '',
            role: data.role || 'BATSMAN',
            battingStyle: data.battingStyle || '',
            bowlingStyle: data.bowlingStyle || '',
            jerseyNumber: data.jerseyNumber || '',
            bio: data.bio || ''
          });
          if (data.avatarUrl) {
            setPhotoPreview(data.avatarUrl);
          }
        } else {
          setError('Player not found');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to fetch player details');
      } finally {
        setFetching(false);
      }
    }
    fetchPlayer();
  }, [id]);

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setLoading(true);
    setError('');

    try {
      let avatarUrl = photoPreview;
      if (photo) {
        avatarUrl = await uploadImage(photo, 'players/avatars');
      }

      const playerRef = doc(db, 'players', id);
      await updateDoc(playerRef, {
        ...formData,
        avatarUrl,
        updatedAt: Date.now()
      });

      navigate(`/players/${id}`);
    } catch (err: any) {
      console.error(err);
      setError('Failed to update player profile. Ensure you have permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (window.confirm("Are you sure you want to delete this player? This cannot be undone.")) {
      try {
        setLoading(true);
        await deleteDoc(doc(db, 'players', id));
        navigate('/players');
      } catch (err) {
        console.error("Error deleting player", err);
        setError("Failed to delete player");
        setLoading(false);
      }
    }
  };

  if (fetching) {
     return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <Link to={`/players/${id}`} className="p-2 -ml-2 text-foreground-muted hover:text-foreground transition-colors rounded-full hover:bg-surface-hover">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <span className="text-xl font-bold text-foreground">Edit Player</span>
        </div>
        <Button variant="outline" className="text-error border-error hover:bg-error/10" onClick={handleDelete} disabled={loading} type="button">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
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
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
