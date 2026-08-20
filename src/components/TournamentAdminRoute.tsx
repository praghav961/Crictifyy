import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function TournamentAdminRoute({ children }: { children: ReactNode }) {
  const { user, hasRole } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAuth() {
      if (!user || !id) {
        setIsAuthorized(false);
        return;
      }
      
      if (hasRole('SUPER_ADMIN')) {
        setIsAuthorized(true);
        return;
      }

      try {
        const docRef = doc(db, 'tournaments', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().hostId === user.uid) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch {
        setIsAuthorized(false);
      }
    }
    checkAuth();
  }, [user, id, hasRole]);

  if (isAuthorized === null) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect unauthorized users back to the public tournament dashboard
  return isAuthorized ? <>{children}</> : <Navigate to={`/tournaments/${id}`} replace />;
}
