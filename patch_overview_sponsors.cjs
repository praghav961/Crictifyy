const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentOverviewTab.tsx', 'utf8');

const imports = `import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Tournament, Match, TournamentTeam, TournamentPlayer, Sponsor } from '../../types';`;
code = code.replace(/import \{ useState, useEffect \} from 'react';\nimport \{ collection, query, getDocs, doc \} from 'firebase\/firestore';\nimport \{ db \} from '\.\.\/\.\.\/lib\/firebase';\nimport \{ Tournament, Match, TournamentTeam, TournamentPlayer \} from '\.\.\/\.\.\/types';/, imports);

const stateCode = `  const [playerCount, setPlayerCount] = useState(0);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);`;
code = code.replace(/const \[playerCount, setPlayerCount\] = useState\(0\);\n\s*const \[loading, setLoading\] = useState\(true\);/, stateCode);

const fetchCode = `        const pSnap = await getDocs(collection(db, \`tournaments/\${tournament.id}/players\`));
        setPlayerCount(pSnap.size);

        const sSnap = await getDocs(collection(db, \`tournaments/\${tournament.id}/sponsors\`));
        setSponsors(sSnap.docs.map(d => d.data() as Sponsor));`;
code = code.replace(/const pSnap = await getDocs\(collection\(db, `tournaments\/\$\{tournament\.id\}\/players`\)\);\n\s*setPlayerCount\(pSnap\.size\);/, fetchCode);

const renderCode = `      {sponsors.length > 0 && (
        <Card className="bg-surface border-border overflow-hidden">
           <div className="bg-primary/5 px-4 py-2 border-b border-border/50 text-xs font-bold text-primary uppercase tracking-widest flex items-center justify-center">
             Tournament Sponsors
           </div>
           <CardContent className="p-4 flex gap-6 overflow-x-auto items-center justify-center">
             {sponsors.map(s => (
               <div key={s.id} className="flex flex-col items-center">
                 {s.logoUrl ? (
                   <img src={s.logoUrl} alt={s.name} className="h-16 w-auto object-contain rounded" />
                 ) : (
                   <div className="h-12 px-4 bg-surface-hover rounded flex items-center justify-center border border-border"><span className="font-bold">{s.name}</span></div>
                 )}
               </div>
             ))}
           </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">`;

code = code.replace(/<div className="grid grid-cols-2 md:grid-cols-4 gap-4">/, renderCode);

fs.writeFileSync('src/pages/tournaments/TournamentOverviewTab.tsx', code);
