import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, Shield, Check } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function Profile() {
  const { user, profile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!user || !profile) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setSuccess(false);
    try {
      await updateProfile(user, { displayName });
      await updateDoc(doc(db, 'users', user.uid), { displayName });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Your Profile</h1>
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">{profile.displayName}</h2>
            <p className="text-foreground-muted text-sm">{profile.email}</p>
          </div>
        </div>
        
        <div className="space-y-4 pt-4 border-t border-border">
          <div>
            <label className="block text-sm font-medium mb-1">Display Name</label>
            <input 
              type="text" 
              value={displayName} 
              onChange={e => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md"
            />
          </div>
          <Button onClick={handleSave} disabled={isSaving || displayName === profile.displayName}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
          {success && <span className="ml-3 text-sm text-success flex items-center inline-flex"><Check className="h-4 w-4 mr-1"/> Saved</span>}
        </div>

        <div className="pt-4 border-t border-border">
          <h3 className="font-bold mb-2 flex items-center gap-2"><Shield className="h-4 w-4"/> Assigned Roles</h3>
          <div className="flex flex-wrap gap-2">
            {profile.roles.map(r => (
              <span key={r} className="px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                {r}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
