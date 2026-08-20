A. Existing tournament architecture:
- React + Vite + Tailwind frontend.
- Firebase Firestore for DB.
- Live Scoring Engine (engine.ts) completely decoupled from Tournament Engine.
- Tournament Stats (statsEngine.ts) calculated dynamically from 'COMPLETED' matches.
- Tournament specific teams/players are stored in subcollections (tournaments/{id}/teams, tournaments/{id}/players).

B. Existing files related to tournaments:
- CreateTournament.tsx, TournamentDashboard.tsx, TournamentMatchesTab.tsx, TournamentPlayersTab.tsx, TournamentTeamsTab.tsx, TournamentStatsTab.tsx, PointsTableTab.tsx, SponsorForm.tsx.

C. Existing Firebase collections:
- tournaments
- tournaments/{id}/teams
- tournaments/{id}/players
- tournaments/{id}/sponsors
- matches

D. Existing tournament features:
- Create tournament (Basic formats)
- Add teams/players to tournament
- Generate Round Robin fixtures directly to DB
- Live Points Table and Stats from completed matches
- Basic Sponsor CRUD

E. Missing features:
- Detailed Format Support (Double Round Robin, etc.)
- Group Management UI
- Fixture Generator Preview & Validation (No direct DB write without confirm)
- Playoff Bracket & Qualification logic
- Tournament Finalization & Awards (Champion, Best Batter, etc.)
- Scorer Assignment to specific matches

F. Files that need modification:
- src/types.ts
- src/pages/tournaments/CreateTournament.tsx
- src/pages/tournaments/TournamentTeamsTab.tsx (Add groups UI)
- src/pages/tournaments/TournamentMatchesTab.tsx (Preview & validate fixtures)
- src/pages/tournaments/TournamentDashboard.tsx
- src/pages/tournaments/TournamentStatsTab.tsx
- src/pages/tournaments/PointsTableTab.tsx

G. Files that need creation:
- src/pages/tournaments/TournamentPlayoffsTab.tsx (For brackets and qualification)
- src/pages/tournaments/TournamentCompletion.tsx (For final awards)

H. Firebase changes required:
- Add `championId`, `awards`, `isFinalized`, `groups` to Tournament document.
- Add `scorers` array to Match document for scorer assignment.

I. Security-rule changes required:
- Ensure scorer assignment is respected in rules if needed (currently client side checks are often used, we'll verify).

J. Risk of breaking existing functionality:
- Low to Medium. We are extending types and adding preview steps. Existing finalized matches will remain untouched.

Implementation starting now.
