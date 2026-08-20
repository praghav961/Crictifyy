const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace(
  /export interface TournamentPlayer \{\n\s*id: string; \/\/ playerId\n\s*teamId: string;/,
  "export interface TournamentPlayer {\n  id: string; // playerId\n  tournamentId?: string;\n  teamId: string;"
);

fs.writeFileSync('src/types.ts', code);
