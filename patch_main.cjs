const fs = require('fs');
let code = fs.readFileSync('src/main.tsx', 'utf8');
code = code.replace("registerSW({ immediate: true });", "try { registerSW({ immediate: true }); } catch (e) { console.error('PWA Registration failed', e); }");
fs.writeFileSync('src/main.tsx', code);
