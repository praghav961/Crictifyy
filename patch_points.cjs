const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/PointsTableTab.tsx', 'utf8');

const target = `import { useState, useEffect } from 'react';
import { useTournamentStats } from '../../hooks/useTournamentStats';
import { fetchTeamStatsByGroup } from '../../lib/scoring/statsEngine';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { TournamentGroup } from '../../types';`;

const replacement = `import { useState, useEffect } from 'react';
import { useTournamentStats } from '../../hooks/useTournamentStats';
import { fetchTeamStatsByGroup } from '../../lib/scoring/statsEngine';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { TournamentGroup } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';`;

code = code.replace(target, replacement);

const targetRender = `     return (
       <Card className="mb-6 overflow-hidden">
         {title && <CardHeader className="bg-surface-hover py-3 border-b border-border"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>}
         <div className="overflow-x-auto">`;

const replacementRender = `     return (
       <Card className="mb-6 overflow-hidden bg-surface border-border">
         {title && <CardHeader className="bg-surface-hover py-3 border-b border-border"><CardTitle className="text-sm font-bold tracking-widest uppercase">{title}</CardTitle></CardHeader>}
         <div className="flex flex-col lg:flex-row gap-6 p-6">
           <div className="w-full lg:w-2/3 overflow-x-auto border border-border rounded-xl">`;

code = code.replace(targetRender, replacementRender);

const targetEndRender = `           </table>
         </div>
       </Card>
     )`;

const replacementEndRender = `           </table>
         </div>
         
         <div className="w-full lg:w-1/3 flex flex-col gap-4">
           <div className="h-64 border border-border rounded-xl p-4 bg-surface-hover">
             <h4 className="text-[10px] uppercase tracking-widest text-foreground-muted mb-4 font-bold text-center">Points Overview</h4>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={sorted.slice(0, 8)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#2a2d35" vertical={false} />
                 <XAxis dataKey="shortName" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                 <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                 <Tooltip cursor={{ fill: '#2a2d35' }} contentStyle={{ backgroundColor: '#1a1c23', borderColor: '#2a2d35', borderRadius: '8px' }} itemStyle={{ color: '#00e676', fontWeight: 'bold' }} />
                 <Bar dataKey="points" radius={[4, 4, 0, 0]}>
                   {sorted.map((entry, index) => (
                     <Cell key={\`cell-\${index}\`} fill={index < (sorted[0]?.points > 0 ? 4 : 0) ? '#00e676' : '#2a2d35'} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
         </div>
       </div>
       </Card>
     )`;

code = code.replace(targetEndRender, replacementEndRender);
fs.writeFileSync('src/pages/tournaments/PointsTableTab.tsx', code);
