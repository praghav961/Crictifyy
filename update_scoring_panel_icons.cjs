const fs = require('fs');
let code = fs.readFileSync('src/pages/matches/scoring/ScoringPanel.tsx', 'utf8');

const importIcons = `import { Play, Settings, X, Activity } from 'lucide-react';\n`;
code = code.replace(/import \{ Button \} from '\.\.\/\.\.\/\.\.\/components\/ui\/Button';/, `import { Button } from '../../../components/ui/Button';\n` + importIcons);

const startMatchBtn = `<Button className="w-full h-12 text-lg font-bold flex items-center justify-center gap-2" onClick={() => setShowPreMatch(false)}>
              <Play className="w-5 h-5" /> START MATCH
            </Button>`;
code = code.replace(/<Button className="w-full h-12 text-lg font-bold" onClick=\{\(\) => setShowPreMatch\(false\)\}>\s*START MATCH\s*<\/Button>/, startMatchBtn);

const matchSettingsBtn = `<Button variant="outline" className="w-full h-12 text-lg font-bold flex items-center justify-center gap-2" onClick={() => navigate(\`/matches/\${match.id}\`)}>
              <Settings className="w-5 h-5" /> MATCH SETTINGS
            </Button>`;
code = code.replace(/<Button variant="outline" className="w-full h-12 text-lg font-bold" onClick=\{\(\) => navigate\(\`\/matches\/\$\{match.id\}\`\)\}>\s*MATCH SETTINGS\s*<\/Button>/, matchSettingsBtn);

const exitBtn = `<Button variant="ghost" className="w-full text-foreground-muted flex items-center justify-center gap-2" onClick={() => navigate('/')}>
              <X className="w-4 h-4" /> EXIT
            </Button>`;
code = code.replace(/<Button variant="ghost" className="w-full text-foreground-muted" onClick=\{\(\) => navigate\('\/'\)\}>\s*EXIT\s*<\/Button>/, exitBtn);

fs.writeFileSync('src/pages/matches/scoring/ScoringPanel.tsx', code);
