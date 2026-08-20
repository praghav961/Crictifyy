const fs = require('fs');
let code = fs.readFileSync('src/pages/teams/TeamProfile.tsx', 'utf8');

// Ensure that button is actually clickable and doesn't get blocked by any absolute positioning
// And wait, the user is saying "i am not able to delete" on the specific element.
// They sent a CSS selector: div#root... > button > svg

// Let's make sure the button has onClick defined properly and it's not being intercepted.
code = code.replace(
  /<button type="button" onClick=\{\(\) => handleRemovePlayer\(player\.id\)\}/g,
  '<button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemovePlayer(player.id); }}'
);

fs.writeFileSync('src/pages/teams/TeamProfile.tsx', code);
