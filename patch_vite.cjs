const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');
code = code.replace(/return \{\s*plugins:/, 'return {\n    base: "./",\n    plugins:');
fs.writeFileSync('vite.config.ts', code);
