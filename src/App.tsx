import React, { Suspense } from 'react';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { TournamentAdminRoute } from './components/TournamentAdminRoute';
import { ManagerRoute } from './components/ManagerRoute';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';

const TournamentsList = React.lazy(() => import('./pages/tournaments/TournamentsList').then(m => ({ default: m.TournamentsList })));
const CreateTournament = React.lazy(() => import('./pages/tournaments/CreateTournament').then(m => ({ default: m.CreateTournament })));
const TournamentDashboard = React.lazy(() => import('./pages/tournaments/TournamentDashboard').then(m => ({ default: m.TournamentDashboard })));
const TournamentAdmin = React.lazy(() => import('./pages/tournaments/TournamentAdmin').then(m => ({ default: m.TournamentAdmin })));

const MatchesList = React.lazy(() => import('./pages/matches/MatchesList').then(m => ({ default: m.MatchesList })));
const MatchCentre = React.lazy(() => import('./pages/matches/MatchCentre').then(m => ({ default: m.MatchCentre })));
const MatchScoring = React.lazy(() => import('./pages/matches/MatchScoring').then(m => ({ default: m.MatchScoring })));

const TeamsList = React.lazy(() => import('./pages/teams/TeamsList').then(m => ({ default: m.TeamsList })));
const TeamProfile = React.lazy(() => import('./pages/teams/TeamProfile').then(m => ({ default: m.TeamProfile })));
const CreateTeam = React.lazy(() => import('./pages/teams/CreateTeam').then(m => ({ default: m.CreateTeam })));
const EditTeam = React.lazy(() => import('./pages/teams/EditTeam').then(m => ({ default: m.EditTeam })));

const PlayersList = React.lazy(() => import('./pages/players/PlayersList').then(m => ({ default: m.PlayersList })));
const PlayerProfile = React.lazy(() => import('./pages/players/PlayerProfile').then(m => ({ default: m.PlayerProfile })));
const CreatePlayer = React.lazy(() => import('./pages/players/CreatePlayer').then(m => ({ default: m.CreatePlayer })));
const EditPlayer = React.lazy(() => import('./pages/players/EditPlayer').then(m => ({ default: m.EditPlayer })));

const SponsorForm = React.lazy(() => import('./pages/tournaments/SponsorForm').then(m => ({ default: m.SponsorForm })));

const NotificationSettings = React.lazy(() => import('./pages/settings/NotificationSettings').then(m => ({ default: m.NotificationSettings })));
const GroundScoreboard = React.lazy(() => import('./pages/matches/GroundScoreboard').then(m => ({ default: m.GroundScoreboard })));
const AuditLogs = React.lazy(() => import('./pages/settings/AuditLogs').then(m => ({ default: m.AuditLogs })));
const Profile = React.lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}><Layout /></Suspense>}>
              <Route index element={<Home />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              
              {/* Matches */}
              <Route path="scoring/:matchId" element={
                <ProtectedRoute>
                  <MatchScoring />
                </ProtectedRoute>
              } />
              <Route path="matches" element={<MatchesList />} />
              <Route path="matches/:id" element={<MatchCentre />} />
              <Route path="matches/:id/score" element={
                <ProtectedRoute>
                  <MatchScoring />
                </ProtectedRoute>
              } />
              
              {/* Tournaments */}
              <Route path="tournaments" element={<TournamentsList />} />
              <Route path="tournaments/new" element={
                <ProtectedRoute>
                  <CreateTournament />
                </ProtectedRoute>
              } />
              <Route path="tournaments/:id" element={<TournamentDashboard />} />
              <Route path="tournaments/:id/sponsors/new" element={
                <ProtectedRoute>
                  <SponsorForm />
                </ProtectedRoute>
              } />
              <Route path="tournaments/:id/sponsors/:sponsorId/edit" element={
                <ProtectedRoute>
                  <SponsorForm />
                </ProtectedRoute>
              } />
              <Route path="tournaments/:id/admin" element={
                <TournamentAdminRoute>
                  <TournamentAdmin />
                </TournamentAdminRoute>
              } />

              {/* Teams */}
              <Route path="teams" element={<TeamsList />} />
              <Route path="teams/new" element={
                <ManagerRoute>
                  <CreateTeam />
                </ManagerRoute>
              } />
              <Route path="teams/:id/edit" element={
                <ManagerRoute>
                  <EditTeam />
                </ManagerRoute>
              } />
              <Route path="teams/:id" element={<TeamProfile />} />

              {/* Players */}
              <Route path="players" element={<PlayersList />} />
              <Route path="players/new" element={
                <ManagerRoute>
                  <CreatePlayer />
                </ManagerRoute>
              } />
              <Route path="players/:id/edit" element={
                <ManagerRoute>
                  <EditPlayer />
                </ManagerRoute>
              } />
              <Route path="players/:id" element={<PlayerProfile />} />

                            <Route path="profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="settings/notifications" element={
                <ProtectedRoute>
                  <NotificationSettings />
                </ProtectedRoute>
              } />
              <Route path="settings/audit" element={
                <ProtectedRoute>
                  <AuditLogs />
                </ProtectedRoute>
              } />
            </Route>
            <Route path="/matches/:id/board" element={<Suspense fallback={<div>Loading...</div>}><GroundScoreboard /></Suspense>} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
