import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ManagerRoute({ children }: { children: ReactNode }) {
  const { user, profile, hasRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const canManage = hasRole('SUPER_ADMIN') || hasRole('TOURNAMENT_ADMIN') || hasRole('TEAM_MANAGER') || profile?.canHostTournament;

  return canManage ? <>{children}</> : <Navigate to="/" replace />;
}
