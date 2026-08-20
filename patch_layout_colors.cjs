const fs = require('fs');
let code = fs.readFileSync('src/components/Layout.tsx', 'utf8');

code = code.replace(/bg-\[#1a1c23\]/g, 'bg-surface');
code = code.replace(/border-\[#2a2d35\]/g, 'border-border');
code = code.replace(/text-\[#1a1c23\]/g, 'text-primary-foreground');
code = code.replace(/bg-\[#00e676\]\/10/g, 'bg-primary/10');
code = code.replace(/bg-\[#00e676\]/g, 'bg-primary');
code = code.replace(/text-\[#00e676\]/g, 'text-primary');
code = code.replace(/fill-\[#00e676\]\/20/g, 'fill-primary/20');
code = code.replace(/text-\[#9ca3af\]/g, 'text-foreground-muted');
code = code.replace(/hover:bg-\[#21242d\]/g, 'hover:bg-surface-hover');
code = code.replace(/hover:text-white/g, 'hover:text-foreground');
code = code.replace(/bg-\[#21242d\]/g, 'bg-surface-hover');
code = code.replace(/bg-\[#2a2d35\]/g, 'bg-surface-hover');
code = code.replace(/text-white/g, 'text-foreground');
code = code.replace(/text-\[#ff5252\]/g, 'text-error');
code = code.replace(/hover:text-\[#ff5252\]/g, 'hover:text-error');
code = code.replace(/hover:bg-\[#ff5252\]\/10/g, 'hover:bg-error/10');
code = code.replace(/bg-\[#ff5252\]/g, 'bg-error');
code = code.replace(/bg-\[#ff9800\]/g, 'bg-warning');
code = code.replace(/text-\[#111111\]/g, 'text-background');

fs.writeFileSync('src/components/Layout.tsx', code);
