const fs = require('fs');

// Patch types.ts
let typesCode = fs.readFileSync('src/types.ts', 'utf8');
typesCode = typesCode.replace(
  /export type TournamentFormat = [^;]+;/,
  "export type TournamentFormat = 'Round Robin' | 'Double Round Robin' | 'Group Stage';"
);
fs.writeFileSync('src/types.ts', typesCode);

// Patch CreateTournament.tsx
let createTourneyCode = fs.readFileSync('src/pages/tournaments/CreateTournament.tsx', 'utf8');
createTourneyCode = createTourneyCode.replace(/format: 'Single Round Robin' as TournamentFormat,/, "format: 'Round Robin' as TournamentFormat,");

// Update options
const optionsRegex = /<select[\s\S]*?<\/select>/;
createTourneyCode = createTourneyCode.replace(optionsRegex, (match) => {
  return match.replace(/<option value="Single Round Robin">Single Round Robin<\/option>[\s\S]*?\{\/\* Legacy \*\/\}/, 
    `<option value="Round Robin">Round Robin</option>
                  <option value="Double Round Robin">Double Round Robin</option>
                  <option value="Group Stage">Group Stage</option>`);
});

fs.writeFileSync('src/pages/tournaments/CreateTournament.tsx', createTourneyCode);
