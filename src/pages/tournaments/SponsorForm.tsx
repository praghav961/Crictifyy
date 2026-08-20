import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { collection, doc, addDoc, updateDoc, getDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadImage } from '../../lib/uploadImage';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { Sponsor, Tournament } from '../../types';
import { ArrowLeft, Upload, ShieldAlert, Image as ImageIcon } from 'lucide-react';
import { logAudit } from '../../lib/audit';

const SPONSOR_TYPES = [
  'Title Sponsor',
  'Powered By',
  'Main Sponsor',
  'Associate Sponsor',
  'Co-Sponsor',
  'Official Partner',
  'Media Partner',
  'Venue Partner',
  'Team Sponsor',
  'Prize Sponsor',
  'Other'
];

export function SponsorForm() {
  const { id, sponsorId } = useParams<{ id: string; sponsorId?: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  
  const [formData, setFormData] = useState({
    name: '',
    sponsorType: 'Title Sponsor',
    website: '',
    description: '',
    displayOrder: '0',
    active: true
  });

  const [tournament, setTournament] = useState<Tournament | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        const docRef = doc(db, 'tournaments', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTournament({ id: docSnap.id, ...docSnap.data() } as Tournament);
        } else {
          setError('Tournament not found');
          setInitialLoading(false);
          return;
        }

        if (sponsorId) {
          const sponsorRef = doc(db, `tournaments/${id}/sponsors`, sponsorId);
          const sponsorSnap = await getDoc(sponsorRef);
          if (sponsorSnap.exists()) {
            const sData = sponsorSnap.data() as Sponsor;
            setFormData({
              name: sData.name,
              sponsorType: sData.sponsorType,
              website: sData.website || '',
              description: sData.description || '',
              displayOrder: sData.displayOrder.toString(),
              active: sData.active !== false
            });
            if (sData.logoUrl) {
              setLogoPreview(sData.logoUrl);
            }
          }
        } else {
          // If new, find the next display order
          const sponsorsQ = query(collection(db, `tournaments/${id}/sponsors`), orderBy('displayOrder', 'desc'));
          const sponsorsSnap = await getDocs(sponsorsQ);
          if (!sponsorsSnap.empty) {
            const maxOrder = sponsorsSnap.docs[0].data().displayOrder;
            setFormData(prev => ({ ...prev, displayOrder: (maxOrder + 1).toString() }));
          }
        }
      } catch (err) {
        console.error(err);
        setError('Error loading form data');
      } finally {
        setInitialLoading(false);
      }
    }
    fetchData();
  }, [id, sponsorId]);

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isHostOrAdmin = user?.uid === tournament?.hostId || hasRole('SUPER_ADMIN') ;

  if (!isHostOrAdmin) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <ShieldAlert className="w-16 h-16 text-error mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground">Access Denied</h2>
        <p className="text-foreground-muted mt-2">You do not have permission to modify sponsors for this tournament.</p>
        <Link to={`/tournaments/${id}`} className="mt-6 inline-block text-primary hover:underline">
          Return to Tournament
        </Link>
      </div>
    );
  }

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !user) return;
        
    setError('');
    setLoading(true);

    try {
      let logoUrl = logoPreview && !logo ? logoPreview : ''; // keep existing if no new file
      
      if (logo) {
        logoUrl = await uploadImage(logo, `tournaments/${id}/sponsors`);
      }

      const sponsorData: Omit<Sponsor, 'id'> = {
        tournamentId: id,
        name: formData.name,
        sponsorType: formData.sponsorType,
        website: formData.website,
        description: formData.description,
        displayOrder: parseInt(formData.displayOrder, 10) || 0,
        active: formData.active,
        logoUrl,
        createdAt: sponsorId ? undefined : Date.now(), // don't overwrite if editing (handled by undefined omission or spreading, but let's just do Date.now() for simplicity if new)
      } as Omit<Sponsor, 'id'>;

      if (!sponsorId) sponsorData.createdAt = Date.now();

      if (sponsorId) {
        const docRef = doc(db, `tournaments/${id}/sponsors`, sponsorId);
        const updatePayload = { ...sponsorData };
        delete (updatePayload as any).createdAt; // prevent resetting createdAt
        await updateDoc(docRef, updatePayload);
        logAudit(user?.uid || '', 'TOURNAMENT_MODIFICATION', { tournamentId: id, metadata: { action: 'SPONSOR_UPDATED', sponsorId } });
      } else {
        const newSponsorRef = await addDoc(collection(db, `tournaments/${id}/sponsors`), sponsorData);
        logAudit(user?.uid || '', 'SPONSOR_CREATED', { tournamentId: id, metadata: { sponsorId: newSponsorRef.id, name: sponsorData.name } });
      }
      
      
      navigate(`/tournaments/${id}`);
    } catch (err: any) {
      console.error(err);
      setError('Failed to save sponsor. Ensure you have permissions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6">
      <div className="flex items-center space-x-4 mb-4">
        <Link to={`/tournaments/${id}`} className="p-2 -ml-2 text-foreground-muted hover:text-foreground transition-colors rounded-full hover:bg-surface-hover">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <span className="text-xl font-bold text-foreground">{sponsorId ? 'Edit Sponsor' : 'Add Sponsor'}</span>
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
              <div className="relative w-48 h-32 rounded-xl overflow-hidden bg-surface-hover border-2 border-dashed border-border flex flex-col items-center justify-center shrink-0 group cursor-pointer">
                {logoPreview ? (
                  <img loading="lazy" src={logoPreview} alt="Preview" className="w-full h-full object-contain p-2 bg-white" />
                ) : (
                  <ImageIcon className="w-12 h-12 text-foreground-muted opacity-50" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-xs font-medium">
                  <Upload className="w-5 h-5 mb-1" />
                  Upload Image
                </div>
                <input 
                   type="file" 
                   accept="image/*" 
                   className="absolute inset-0 opacity-0 cursor-pointer" 
                   onChange={handleLogoChange}
                />
              </div>
              <div className="text-center sm:text-left flex flex-col justify-center">
                <h3 className="text-sm font-bold text-foreground">Sponsor Logo</h3>
                <p className="text-xs text-foreground-muted mt-1 max-w-xs">Recommended: Transparent PNG or JPG up to 2MB. Horizontal aspect ratio works best.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Sponsor Name *</label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Acme Corp" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Sponsor Type</label>
                <select 
                  value={formData.sponsorType} 
                  onChange={e => setFormData({...formData, sponsorType: e.target.value})}
                  className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                >
                  {SPONSOR_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium text-foreground">Website (optional)</label>
                <Input type="url" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} placeholder="https://..." />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium text-foreground">Description (optional)</label>
                <textarea 
                  rows={2} 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Short blurb about the sponsor"
                  className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Display Order</label>
                <Input type="number" required value={formData.displayOrder} onChange={e => setFormData({...formData, displayOrder: e.target.value})} placeholder="0" />
                <p className="text-xs text-foreground-muted mt-1">Lower numbers appear first.</p>
              </div>

              <div className="flex items-center space-x-3 pt-6">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={e => setFormData({...formData, active: e.target.checked})}
                  className="h-5 w-5 rounded border-border text-primary focus:ring-primary focus:ring-offset-surface bg-surface"
                />
                <label htmlFor="active" className="text-sm font-medium text-foreground">
                  Active (visible to public)
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-border mt-8 gap-3">
              <Button type="button" variant="outline" onClick={() => navigate(`/tournaments/${id}`)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={loading}>
                {sponsorId ? 'Update Sponsor' : 'Add Sponsor'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
