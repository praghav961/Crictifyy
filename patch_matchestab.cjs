const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', 'utf8');

// Replace format === 'Custom' || format === 'Knockout' with false (or just remove the check if it's an if-statement)
// Let's first read the file to see how they are used.
