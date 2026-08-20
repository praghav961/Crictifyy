const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

if (!code.includes('players?: string[]')) {
  code = code.replace(
    /squad\?: string\[\]; \/\/ Array of player IDs/,
    "squad?: string[]; // Array of player IDs\n  players?: string[]; // Fallback array of player IDs"
  );
  fs.writeFileSync('src/types.ts', code);
}
