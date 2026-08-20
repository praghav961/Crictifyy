const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', 'utf8');

// Replace format check
code = code.replace(
  /const shouldGenerateLeague = format !== 'Custom' && format !== 'Knockout';/,
  "const shouldGenerateLeague = true;"
);

// Remove the if (format === 'Knockout') { ... } block
// We can use a regex to match from `if (format === 'Knockout') {` to the matching closing bracket.
// A simpler way:
code = code.replace(
  /const knockouts = \['Quarter Final 1', 'Quarter Final 2', 'Quarter Final 3', 'Quarter Final 4', 'Semi Final 1', 'Semi Final 2', 'Final'\];\n\s*if \(format === 'Knockout'\) \{[\s\S]*?\}\n\s*\}/,
  ""
);

fs.writeFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', code);
